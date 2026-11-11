import { describe, expect, it } from 'vitest';
import type { ProjectsData } from '../lib/schema';
import { COMMENT_MARKER, toMarkdown, validateRegistration } from '../scripts/validate';
import { type FakeRepo, fakeGitHub, VICO } from './fake-github';
import { ago, makeProject, NOW } from './fixtures';

const recent = NOW.toISOString();

async function check(
  head: unknown,
  repos: Record<string, FakeRepo>,
  options: { base?: unknown; existing?: ProjectsData; changedFiles?: string[] } = {},
) {
  return validateRegistration({
    baseText: JSON.stringify(options.base ?? ['github.com/old/one']),
    headText: typeof head === 'string' ? head : JSON.stringify(head),
    changedFiles: options.changedFiles,
    existing: options.existing ?? null,
    github: fakeGitHub(repos),
    now: NOW,
  });
}

const ok: FakeRepo = { lastCommitAt: recent, vicoUpdatedAt: recent };

describe('validateRegistration: 통과', () => {
  it('새로 추가된 레포만 검사한다 (기존 항목은 GitHub를 부르지 않음)', async () => {
    const result = await check(['github.com/old/one', 'github.com/new/app'], { 'new/app': ok });
    expect(result.ok).toBe(true);
    expect(result.repos.map((r) => r.entry)).toEqual(['github.com/new/app']);
  });

  it('추가된 레포가 없으면(삭제 PR 등) 통과', async () => {
    const result = await check([], {});
    expect(result).toMatchObject({ ok: true, repos: [] });
    expect(toMarkdown(result)).toContain('새로 추가된 레포가 없어요');
  });
});

describe('validateRegistration: 실패 사유', () => {
  it('JSON 문법 오류', async () => {
    const result = await check('["github.com/a/b",]', {});
    expect(result.ok).toBe(false);
    expect(result.fileErrors[0]).toMatch(/올바른 JSON이 아니에요/);
  });

  it('배열이 아님 / 문자열이 아닌 항목', async () => {
    expect((await check({ repo: 'x' }, {})).fileErrors[0]).toMatch(/배열/);
    const mixed = await check(['github.com/new/app', 3], { 'new/app': ok });
    expect(mixed.ok).toBe(false);
    expect(mixed.fileErrors[0]).toMatch(/문자열/);
  });

  it('형식 오류 (https://, 끝 슬래시)', async () => {
    const result = await check(['https://github.com/new/app'], {});
    expect(result.repos[0]?.reasons[0]).toMatch(/형식이/);
  });

  it('중복 (대소문자 무시)', async () => {
    const result = await check(['github.com/new/app', 'github.com/New/App'], { 'new/app': ok });
    expect(result.ok).toBe(false);
    expect(result.repos[0]?.reasons).toContain('명단에 같은 레포가 이미 있어요');
  });

  it.each([
    ['레포 없음', {}, '레포를 찾을 수 없어요'],
    ['비공개', { 'new/app': { ...ok, private: true } }, '비공개 레포예요'],
    ['커밋 없음', { 'new/app': { ...ok, lastCommitAt: null } }, '커밋 기록을 읽을 수 없어요'],
    ['VICO.md 없음', { 'new/app': { ...ok, vico: null } }, 'VICO.md가 없어요'],
    ['스키마 오류', { 'new/app': { ...ok, vico: '---\ntitle: x\n---\n' } }, 'VICO.md 형식 오류'],
    [
      '체크리스트 부족',
      { 'new/app': { ...ok, vico: VICO('- [ ] a\n- [ ] b') } },
      '체크리스트 항목이 3개 이상이어야 해요 (지금 2개)',
    ],
  ] as const)('%s', async (_, repos, reason) => {
    const result = await check(['github.com/new/app'], repos as Record<string, FakeRepo>);
    expect(result.ok).toBe(false);
    expect(result.repos[0]?.reasons.join(' ')).toContain(reason);
  });

  it('아이디당 진행중 3개 초과', async () => {
    const existing: ProjectsData = {
      generatedAt: recent,
      errors: [],
      projects: [
        makeProject({ owner: 'new', repo: 'a', activityAt: ago(1) }),
        makeProject({ owner: 'new', repo: 'b', activityAt: ago(20) }),
        makeProject({ owner: 'new', repo: 'c', declaredStatus: '완료' }),
      ],
    };
    // 기존 진행중 2개 + 새로 2개 → 두 번째에서 4개가 되어 실패
    const result = await check(
      ['github.com/new/app', 'github.com/new/app2'],
      { 'new/app': ok, 'new/app2': ok },
      { existing },
    );
    expect(result.repos.map((r) => r.ok)).toEqual([true, false]);
    expect(result.repos[1]?.reasons[0]).toMatch(/진행중 프로젝트가 3개를 넘어요 \(추가하면 4개\)/);
  });

  it('완료 상태로 등록하면 진행중 개수에 세지 않는다', async () => {
    const existing: ProjectsData = {
      generatedAt: recent,
      errors: [],
      projects: ['a', 'b', 'c'].map((repo) =>
        makeProject({ owner: 'new', repo, activityAt: ago(1) }),
      ),
    };
    const done = VICO('- [x] a\n- [x] b\n- [x] c');
    const result = await check(
      ['github.com/new/app'],
      { 'new/app': { ...ok, vico: done } },
      { existing },
    );
    expect(result.ok).toBe(true);
  });
});

describe('등록 PR이 아님 (경고)', () => {
  it('다른 파일도 바꾸면 경고만 하고 검사는 계속한다', async () => {
    const result = await check(
      ['github.com/new/app'],
      { 'new/app': ok },
      {
        changedFiles: ['projects.json', 'lib/status.ts'],
      },
    );
    expect(result.ok).toBe(true);
    expect(result.warnings[0]).toMatch(/등록 PR이 아니에요.*lib\/status\.ts/);
  });
});

describe('toMarkdown', () => {
  it('표시, 결과 표, 고칠 점', async () => {
    const result = await check(['github.com/new/app', 'github.com/new/bad'], {
      'new/app': ok,
      'new/bad': { ...ok, private: true },
    });
    const md = toMarkdown(result);
    expect(md.startsWith(COMMENT_MARKER)).toBe(true);
    expect(md).toContain('❌ 실패');
    expect(md).toContain('| `github.com/new/app` | ✅ |  |');
    expect(md).toContain('| `github.com/new/bad` | ❌ | 비공개 레포예요 |');
  });

  it('표 안의 | 는 이스케이프한다', async () => {
    const md = toMarkdown({
      ok: false,
      warnings: [],
      fileErrors: [],
      repos: [{ entry: 'github.com/a/b', ok: false, reasons: ['a | b'] }],
    });
    expect(md).toContain('a \\| b');
  });
});
