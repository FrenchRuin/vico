import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildSiteData,
  findProject,
  listByOwner,
  listOwners,
  loadData,
  shiftDates,
} from '../lib/data';
import { computeProgress, findNextTask } from '../lib/progress';
import { projectsDataSchema } from '../lib/schema';
import { getHighlight } from '../lib/similar';
import { countActiveByOwner } from '../lib/status';
import { ago, makeProject, NOW, sampleOnlyDataDir } from './fixtures';

const DATA_DIR = join(process.cwd(), 'data');
const sampleRaw = JSON.parse(readFileSync(join(DATA_DIR, 'sample.data.json'), 'utf8'));

describe('sample.data.json', () => {
  it('ProjectsData 스키마를 통과한다', () => {
    expect(projectsDataSchema.safeParse(sampleRaw).success).toBe(true);
  });

  const sample = projectsDataSchema.parse(sampleRaw);

  it('진행률, 개수, 다음 할 일이 체크리스트와 맞는다', () => {
    for (const project of sample.projects) {
      expect({
        ...computeProgress(project.stages),
        nextTask: findNextTask(project.stages),
      }).toEqual({
        done: project.done,
        total: project.total,
        progress: project.progress,
        nextTask: project.nextTask,
      });
    }
  });

  it('구성: 9개, 활발 4 / 잠잠 2 / 완료 2 / 휴면 1, 모집 3, 도구 4종 이상', () => {
    const site = buildSiteData('sample', shiftDates(sample, NOW), NOW);
    const count = (status: string) => site.projects.filter((p) => p.status === status).length;
    expect(site.projects).toHaveLength(9);
    expect([count('active'), count('quiet'), count('done'), count('dormant')]).toEqual([
      4, 2, 2, 1,
    ]);
    expect(site.projects.filter((p) => p.recruiting)).toHaveLength(3);
    expect(new Set(site.projects.flatMap((p) => p.tools)).size).toBeGreaterThanOrEqual(4);
  });

  it('단계가 있는 프로젝트와 없는 프로젝트가 섞여 있다', () => {
    const named = sample.projects.filter((p) => p.stages.some((s) => s.name !== null));
    expect(named.length).toBeGreaterThan(0);
    expect(named.length).toBeLessThan(sample.projects.length);
  });

  it('진행중 3개를 꽉 채운 아이디와 하이라이트 대상이 있다 (T07, T09 확인용)', () => {
    const shifted = shiftDates(sample, NOW);
    expect(Math.max(...countActiveByOwner(shifted.projects, NOW).values())).toBe(3);
    expect(getHighlight(shifted.projects, NOW)).not.toBeNull();
  });
});

describe('loadData', () => {
  it('수집 데이터가 없으면 예시 데이터를 쓰고 날짜를 now 기준으로 옮긴다', () => {
    const { source, data } = loadData(NOW, sampleOnlyDataDir());
    expect(source).toBe('sample');
    expect(data.generatedAt).toBe(NOW.toISOString());
  });

  it('projects.data.json이 있으면 그대로 쓴다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vico-data-'));
    const collected = { generatedAt: ago(1), projects: [makeProject()], errors: [] };
    writeFileSync(join(dir, 'projects.data.json'), JSON.stringify(collected));
    const { source, data } = loadData(NOW, dir);
    expect(source).toBe('collected');
    expect(data.generatedAt).toBe(collected.generatedAt);
  });

  it('형식이 틀리면 파일 경로와 함께 오류를 낸다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vico-data-'));
    writeFileSync(join(dir, 'projects.data.json'), JSON.stringify({ projects: 'x' }));
    expect(() => loadData(NOW, dir)).toThrow(/projects\.data\.json 형식이 올바르지 않아요/);
  });
});

describe('shiftDates', () => {
  it('모든 시각을 같은 만큼 옮긴다', () => {
    const data = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      projects: [
        makeProject({
          activityAt: '2025-12-31T00:00:00.000Z',
          lastCompleted: { text: 'a', at: '2025-12-30T00:00:00.000Z' },
        }),
      ],
      errors: [{ repo: 'github.com/a/b', reason: 'x', since: '2025-12-25T00:00:00.000Z' }],
    };
    const shifted = shiftDates(data, new Date('2026-01-11T00:00:00.000Z'));
    expect(shifted.generatedAt).toBe('2026-01-11T00:00:00.000Z');
    expect(shifted.projects[0]?.activityAt).toBe('2026-01-10T00:00:00.000Z');
    expect(shifted.projects[0]?.lastCompleted?.at).toBe('2026-01-09T00:00:00.000Z');
    expect(shifted.errors[0]?.since).toBe('2026-01-04T00:00:00.000Z');
  });
});

describe('buildSiteData와 헬퍼', () => {
  const projects = [
    makeProject({ owner: 'Minji', repo: 'old', activityAt: ago(20) }),
    makeProject({ owner: 'minji', repo: 'new', activityAt: ago(1), recruiting: true }),
    makeProject({ owner: 'hoon', repo: 'sleep', activityAt: ago(90), recruiting: true }),
    makeProject({ owner: 'hoon', repo: 'fin', declaredStatus: '완료' }),
  ];
  const site = buildSiteData(
    'collected',
    { generatedAt: NOW.toISOString(), projects, errors: [] },
    NOW,
  );

  it('상태를 붙이고 최근 활동순으로 정렬한다', () => {
    expect(site.projects.map((p) => [p.repo, p.status])).toEqual([
      ['fin', 'done'],
      ['new', 'active'],
      ['old', 'quiet'],
      ['sleep', 'dormant'],
    ]);
  });

  it('통계: 모집 수는 휴면 제외', () => {
    expect(site.stats).toEqual({
      registered: 4,
      inProgress: 2,
      activeNow: 1,
      recruiting: 1,
      completed: 1,
    });
  });

  it('아이디와 레포는 대소문자를 무시하고 찾는다', () => {
    expect(findProject(site.projects, 'MINJI', 'NEW')?.repo).toBe('new');
    expect(findProject(site.projects, 'minji', 'none')).toBeUndefined();
    expect(listByOwner(site.projects, 'MINJI').map((p) => p.repo)).toEqual(['new', 'old']);
    expect(listOwners(site.projects)).toEqual(['hoon', 'minji']);
  });
});
