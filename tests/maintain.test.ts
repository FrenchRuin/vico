import { describe, expect, it } from 'vitest';
import { loadData } from '../lib/data';
import type { ProjectsData } from '../lib/schema';
import {
  type MaintenanceOps,
  parseRepoUrl,
  planMaintenance,
  registryJson,
  reminderBody,
  reminderTitle,
  runMaintenance,
} from '../scripts/maintain';
import { ago, makeProject, NOW, sampleOnlyDataDir } from './fixtures';

function data(
  projects: ProjectsData['projects'],
  errors: ProjectsData['errors'] = [],
): ProjectsData {
  return { generatedAt: NOW.toISOString(), projects, errors };
}

const entriesOf = (d: ProjectsData) => [
  ...d.projects.map((p) => `github.com/${p.owner}/${p.repo}`),
  ...d.errors.map((e) => e.repo),
];

describe('planMaintenance: 리마인더', () => {
  it('활동일이 30일 지났고 완료도 중단도 아닌 프로젝트', () => {
    const d = data([
      makeProject({ repo: 'd29', activityAt: ago(29, 23) }),
      makeProject({ repo: 'd30', activityAt: ago(30) }),
      makeProject({ repo: 'd60', activityAt: ago(60) }),
      makeProject({ repo: 'done', activityAt: ago(60), declaredStatus: '완료' }),
      makeProject({ repo: 'full', activityAt: ago(60), done: 2, total: 2, progress: 100 }),
      makeProject({ repo: 'stop', activityAt: ago(60), declaredStatus: '중단' }),
    ]);
    expect(planMaintenance(d, entriesOf(d), NOW).reminders.map((p) => p.repo)).toEqual([
      'd30',
      'd60',
    ]);
  });
});

describe('planMaintenance: 정리', () => {
  it('날짜 기준 휴면은 휴면 시작일(활동일 + 46일)에서 90일 뒤', () => {
    const d = data([
      makeProject({ repo: 'keep', activityAt: ago(46 + 89) }),
      makeProject({ repo: 'gone', activityAt: ago(46 + 90) }),
    ]);
    const plan = planMaintenance(d, entriesOf(d), NOW);
    expect(plan.removals).toEqual([{ entry: 'github.com/minji/gone', reason: '휴면 90일째' }]);
    expect(plan.remaining).toEqual(['github.com/minji/keep']);
  });

  it('중단 프로젝트는 VICO.md를 바꾼 날부터 90일', () => {
    const d = data([
      makeProject({
        repo: 'stop',
        declaredStatus: '중단',
        vicoUpdatedAt: ago(90),
        activityAt: ago(1),
      }),
      makeProject({ repo: 'fresh', declaredStatus: '중단', vicoUpdatedAt: ago(10) }),
    ]);
    expect(planMaintenance(d, entriesOf(d), NOW).removals.map((r) => r.entry)).toEqual([
      'github.com/minji/stop',
    ]);
  });

  it('완료 프로젝트는 오래돼도 정리하지 않는다', () => {
    const d = data([makeProject({ repo: 'old', declaredStatus: '완료', activityAt: ago(400) })]);
    expect(planMaintenance(d, entriesOf(d), NOW).removals).toEqual([]);
  });

  it('수집 실패가 7일 넘게 계속되면 정리 (명단 표기 그대로, 대소문자 무시)', () => {
    const d = data(
      [],
      [
        { repo: 'github.com/A/Seven', reason: 'VICO.md가 없어요', since: ago(7) },
        { repo: 'github.com/a/eight', reason: 'VICO.md가 없어요', since: ago(8) },
      ],
    );
    const plan = planMaintenance(d, ['github.com/A/Seven', 'github.com/a/eight'], NOW);
    expect(plan.removals).toEqual([
      { entry: 'github.com/a/eight', reason: '수집 실패 8일째: VICO.md가 없어요' },
    ]);
  });

  it('API가 돌려준 표기와 명단 표기가 달라도 대소문자 무시로 찾는다', () => {
    const d = data([makeProject({ owner: 'Minji', repo: 'App', activityAt: ago(200) })]);
    expect(planMaintenance(d, ['github.com/minji/app'], NOW).removals).toHaveLength(1);
  });
});

describe('runMaintenance: dry-run', () => {
  it('예시 데이터 + 고정된 now로 할 일만 출력한다', async () => {
    const { data: sample } = loadData(NOW, sampleOnlyDataDir());
    const plan = planMaintenance(sample, entriesOf(sample), NOW);
    expect(await runMaintenance(plan, { apply: false })).toEqual([
      '[dry-run] 실제로는 아무것도 하지 않아요',
      '리마인더 대상 2개',
      '  - jun-k/budget-bot: 이슈를 열어요 (활동일 이후 연 리마인더가 있으면 건너뜀)',
      '  - jun-k/rss-reader: 이슈를 열어요 (활동일 이후 연 리마인더가 있으면 건너뜀)',
      '정리 대상 0개',
    ]);
  });

  it('정리 대상이 있으면 PR을 만들 거라고만 적는다', async () => {
    const d = data([makeProject({ repo: 'gone', activityAt: ago(200) })]);
    const lines = await runMaintenance(planMaintenance(d, entriesOf(d), NOW), { apply: false });
    expect(lines).toContain('정리 PR을 만들거나 갱신해요 (브랜치 vico/cleanup)');
  });
});

describe('runMaintenance: --apply', () => {
  function fakeOps(sent: Set<string>, disabled = new Set<string>()) {
    const calls = { issues: [] as string[], pr: [] as string[] };
    const ops: MaintenanceOps = {
      async hasReminderSince(owner, repo) {
        return sent.has(`${owner}/${repo}`);
      },
      async openReminder(owner, repo, title) {
        if (disabled.has(`${owner}/${repo}`)) return 'issues-disabled';
        calls.issues.push(`${owner}/${repo}: ${title}`);
        return 'created';
      },
      async upsertCleanupPr(json) {
        calls.pr.push(json);
        return 'https://github.com/x/vico/pull/1';
      },
    };
    return { ops, calls };
  }

  const d = data([
    makeProject({ repo: 'a', activityAt: ago(31) }),
    makeProject({ repo: 'b', activityAt: ago(31) }),
    makeProject({ repo: 'c', activityAt: ago(31) }),
    makeProject({ repo: 'gone', activityAt: ago(200) }),
  ]);
  const plan = planMaintenance(d, entriesOf(d), NOW);

  it('이미 보낸 곳(닫힌 이슈 포함)은 건너뛰고, 이슈가 꺼진 곳은 로그만', async () => {
    const { ops, calls } = fakeOps(new Set(['minji/a']), new Set(['minji/b']));
    const lines = await runMaintenance(plan, { apply: true, ops });
    expect(calls.issues).toEqual([
      'minji/c: [Vico] 30일 동안 업데이트가 없어요',
      'minji/gone: [Vico] 30일 동안 업데이트가 없어요',
    ]);
    expect(lines).toContain('  - minji/a: 이미 리마인더를 보냈어요. 건너뜀');
    expect(lines).toContain('  - minji/b: 이슈 기능이 꺼져 있어 건너뜀');
  });

  it('정리 PR에는 대상만 뺀 projects.json을 올린다', async () => {
    const { ops, calls } = fakeOps(new Set());
    const lines = await runMaintenance(plan, { apply: true, ops });
    expect(calls.pr).toEqual([
      registryJson(['github.com/minji/a', 'github.com/minji/b', 'github.com/minji/c']),
    ]);
    expect(lines).toContain('정리 PR: https://github.com/x/vico/pull/1');
  });

  it('정리 대상이 없으면 PR을 건드리지 않는다', async () => {
    const quiet = data([makeProject({ repo: 'a', activityAt: ago(1) })]);
    const { ops, calls } = fakeOps(new Set());
    await runMaintenance(planMaintenance(quiet, entriesOf(quiet), NOW), { apply: true, ops });
    expect(calls).toEqual({ issues: [], pr: [] });
  });
});

describe('문구와 도우미', () => {
  it('리마인더 제목/본문은 config 숫자와 상세 링크를 쓴다', () => {
    expect(reminderTitle({ reminderDays: 20 })).toBe('[Vico] 20일 동안 업데이트가 없어요');
    const body = reminderBody(
      { owner: 'a', repo: 'b' },
      { reminderDays: 20, siteUrl: 'https://x.dev' },
    );
    expect(body).toContain('20일 동안 업데이트가 없어서');
    expect(body).toContain('https://x.dev/p/a/b');
    expect(body).toContain('`status: 중단`');
  });

  it('repoUrl을 읽는다', () => {
    expect(parseRepoUrl('https://github.com/FrenchRuin/vico')).toEqual({
      owner: 'FrenchRuin',
      repo: 'vico',
    });
    expect(() => parseRepoUrl('https://github.com/{관리자}')).toThrow(/repoUrl/);
  });
});
