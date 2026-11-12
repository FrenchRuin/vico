import { describe, expect, it } from 'vitest';
import { getHighlight, getOverviewProjects, getRecentlyChecked, getSimilar } from '../lib/similar';
import { ago, makeProject, NOW } from './fixtures';

describe('getSimilar', () => {
  const me = makeProject({ owner: 'me', repo: 'mine', tools: ['Claude Code', 'Cursor', 'v0'] });

  it('겹치는 도구 수 내림차순 → 활동일 최신순', () => {
    const all = [
      me,
      makeProject({ owner: 'a', repo: 'one', tools: ['Cursor'], activityAt: ago(1) }),
      makeProject({ owner: 'b', repo: 'two', tools: ['Cursor', 'v0'], activityAt: ago(5) }),
      makeProject({ owner: 'c', repo: 'three', tools: ['Claude Code'], activityAt: ago(0) }),
    ];
    expect(getSimilar(me, all, NOW).map((p) => p.repo)).toEqual(['two', 'three', 'one']);
  });

  it('자기 자신(대소문자 무시), 휴면, 겹침 없는 프로젝트는 뺀다', () => {
    const all = [
      me,
      makeProject({ owner: 'ME', repo: 'Mine', tools: ['Cursor'] }),
      makeProject({ owner: 'a', repo: 'sleep', tools: ['Cursor'], activityAt: ago(60) }),
      makeProject({ owner: 'b', repo: 'stop', tools: ['Cursor'], declaredStatus: '중단' }),
      makeProject({ owner: 'c', repo: 'other', tools: ['Bolt'] }),
      makeProject({ owner: 'd', repo: 'done', tools: ['Cursor'], declaredStatus: '완료' }),
    ];
    expect(getSimilar(me, all, NOW).map((p) => p.repo)).toEqual(['done']);
  });

  it('최대 similarLimit(3)개', () => {
    const all = Array.from({ length: 6 }, (_, i) =>
      makeProject({ owner: `u${i}`, repo: `r${i}`, tools: ['Cursor'], activityAt: ago(i) }),
    );
    expect(getSimilar(me, all, NOW).map((p) => p.repo)).toEqual(['r0', 'r1', 'r2']);
  });

  it('겹치는 게 없으면 빈 배열', () => {
    expect(getSimilar(me, [me, makeProject({ owner: 'x', tools: ['Bolt'] })], NOW)).toEqual([]);
  });
});

describe('getHighlight', () => {
  it('lastCompleted.at이 가장 최근인 프로젝트', () => {
    const all = [
      makeProject({ repo: 'old', lastCompleted: { text: 'a', at: ago(3) } }),
      makeProject({ repo: 'new', lastCompleted: { text: 'b', at: ago(1) } }),
      makeProject({ repo: 'none', lastCompleted: null, vicoUpdatedAt: ago(0) }),
    ];
    expect(getHighlight(all, NOW)?.repo).toBe('new');
  });

  it('방금 100%를 찍은 완료 프로젝트도 대상이다', () => {
    const done = makeProject({
      repo: 'finished',
      done: 2,
      total: 2,
      progress: 100,
      lastCompleted: { text: 'b', at: ago(0) },
    });
    expect(getHighlight([done], NOW)?.repo).toBe('finished');
  });

  it('휴면 프로젝트와 activeDays보다 오래된 완료 기록은 제외', () => {
    const all = [
      makeProject({
        repo: 'stop',
        declaredStatus: '중단',
        lastCompleted: { text: 'a', at: ago(0) },
      }),
      makeProject({ repo: 'stale', lastCompleted: { text: 'a', at: ago(15) } }),
    ];
    expect(getHighlight(all, NOW)).toBeNull();
  });

  it('activeDays 경계: 14일 23시간 전은 포함', () => {
    const project = makeProject({ lastCompleted: { text: 'a', at: ago(14, 23) } });
    expect(getHighlight([project], NOW)).not.toBeNull();
  });

  it('대상이 없으면 null', () => {
    expect(getHighlight([], NOW)).toBeNull();
  });
});

describe('getRecentlyChecked', () => {
  const config = { activeDays: 14, quietDays: 45, checkedStripLimit: 2 };

  it('lastCompleted.at 최근순, 최대 checkedStripLimit개', () => {
    const all = [
      makeProject({ repo: 'a', lastCompleted: { text: 'x', at: ago(3) } }),
      makeProject({ repo: 'b', lastCompleted: { text: 'y', at: ago(1) } }),
      makeProject({ repo: 'c', lastCompleted: { text: 'z', at: ago(2) } }),
    ];
    expect(getRecentlyChecked(all, NOW, config).map((p) => p.repo)).toEqual(['b', 'c']);
  });

  it('완료 기록이 없거나 휴면이면 제외하고, 오래된 기록은 포함', () => {
    const all = [
      makeProject({ repo: 'none', lastCompleted: null }),
      makeProject({
        repo: 'stop',
        declaredStatus: '중단',
        lastCompleted: { text: 'x', at: ago(0) },
      }),
      makeProject({
        repo: 'old',
        lastCompleted: { text: 'x', at: ago(30) },
        vicoUpdatedAt: ago(1),
        activityAt: ago(1),
      }),
    ];
    expect(getRecentlyChecked(all, NOW, config).map((p) => p.repo)).toEqual(['old']);
  });
});

describe('getOverviewProjects', () => {
  const config = { activeDays: 14, quietDays: 45, overviewProjectTiles: 2 };

  it('하이라이트 다음 자리는 모집 프로젝트(최근 활동순, 하이라이트와 휴면 제외)로 채운다', () => {
    const hot = makeProject({
      repo: 'hot',
      recruiting: true,
      lastCompleted: { text: 'x', at: ago(0) },
    });
    const all = [
      hot,
      makeProject({ repo: 'r-old', recruiting: true, activityAt: ago(5) }),
      makeProject({ repo: 'r-new', recruiting: true, activityAt: ago(1) }),
      makeProject({ repo: 'r-stop', recruiting: true, declaredStatus: '중단' }),
    ];
    const result = getOverviewProjects(all, NOW, config);
    expect(result.highlight?.repo).toBe('hot');
    expect(result.recruiting.map((p) => p.repo)).toEqual(['r-new']);
  });

  it('하이라이트가 없으면 모집 프로젝트로 모든 자리를 채운다', () => {
    const all = [
      makeProject({ repo: 'r1', recruiting: true, activityAt: ago(1) }),
      makeProject({ repo: 'r2', recruiting: true, activityAt: ago(2) }),
      makeProject({ repo: 'r3', recruiting: true, activityAt: ago(3) }),
    ];
    const result = getOverviewProjects(all, NOW, config);
    expect(result.highlight).toBeNull();
    expect(result.recruiting.map((p) => p.repo)).toEqual(['r1', 'r2']);
  });
});
