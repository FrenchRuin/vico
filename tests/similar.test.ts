import { describe, expect, it } from 'vitest';
import { getHighlight, getSimilar } from '../lib/similar';
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
