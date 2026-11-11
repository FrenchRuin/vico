import { describe, expect, it } from 'vitest';
import type { ProjectView } from '../lib/data';
import {
  DEFAULT_FILTER,
  filterProjects,
  parseFilterQuery,
  tabCounts,
  toFilterQuery,
  toolChips,
} from '../lib/filter';
import { getStatus } from '../lib/status';
import { ago, makeProject, NOW } from './fixtures';

function view(overrides: Parameters<typeof makeProject>[0] = {}): ProjectView {
  const project = makeProject(overrides);
  return { ...project, status: getStatus(project, NOW) };
}

const all = [
  view({ repo: 'quiet-old', activityAt: ago(40), stars: 50 }),
  view({ repo: 'active-new', activityAt: ago(0), stars: 1, recruiting: true, progress: 10 }),
  view({ repo: 'active-mid', activityAt: ago(5), stars: 9, tools: ['Cursor'], progress: 90 }),
  view({ repo: 'quiet-new', activityAt: ago(16), stars: 100, summary: '가계부 챗봇' }),
  view({ repo: 'done', declaredStatus: '완료', tools: ['Bolt', 'Gemini CLI'] }),
  view({ repo: 'sleep', activityAt: ago(80), recruiting: true, title: 'RSS Reader' }),
];

const repos = (list: ProjectView[]) => list.map((p) => p.repo);

describe('filterProjects: 탭', () => {
  it('진행중: 활발 → 잠잠으로 묶고 각각 최근 업데이트순', () => {
    expect(repos(filterProjects(all, DEFAULT_FILTER))).toEqual([
      'active-new',
      'active-mid',
      'quiet-new',
      'quiet-old',
    ]);
  });

  it('진행중 탭은 스타순이어도 활발이 먼저', () => {
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, sort: 'stars' }))).toEqual([
      'active-mid',
      'active-new',
      'quiet-new',
      'quiet-old',
    ]);
  });

  it('팀원 모집: 모집 중이고 휴면이 아닌 것', () => {
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, tab: 'recruit' }))).toEqual([
      'active-new',
    ]);
  });

  it('완성작, 휴면', () => {
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, tab: 'done' }))).toEqual(['done']);
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, tab: 'dormant' }))).toEqual(['sleep']);
  });
});

describe('filterProjects: 정렬, 도구, 검색', () => {
  it('진행률순, 같으면 최근 업데이트순', () => {
    const list = [
      view({ repo: 'a', progress: 50, activityAt: ago(3) }),
      view({ repo: 'b', progress: 50, activityAt: ago(1) }),
      view({ repo: 'c', progress: 80, activityAt: ago(9) }),
    ];
    expect(repos(filterProjects(list, { ...DEFAULT_FILTER, sort: 'progress' }))).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('도구 필터와 "기타"(알려지지 않은 도구)', () => {
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, tool: 'Cursor' }))).toEqual([
      'active-mid',
    ]);
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, tab: 'done', tool: 'other' }))).toEqual([
      'done',
    ]);
    expect(filterProjects(all, { ...DEFAULT_FILTER, tool: 'other' })).toEqual([]);
  });

  it('제목과 소개를 대소문자 무시하고 검색한다', () => {
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, q: '가계부' }))).toEqual(['quiet-new']);
    expect(repos(filterProjects(all, { ...DEFAULT_FILTER, tab: 'dormant', q: ' rss ' }))).toEqual([
      'sleep',
    ]);
  });
});

describe('tabCounts / toolChips', () => {
  it('탭 개수는 도구와 검색을 적용한 뒤 센다', () => {
    expect(tabCounts(all, DEFAULT_FILTER)).toEqual({ ongoing: 4, recruit: 1, done: 1, dormant: 1 });
    expect(tabCounts(all, { ...DEFAULT_FILTER, tool: 'Cursor' })).toEqual({
      ongoing: 1,
      recruit: 0,
      done: 0,
      dormant: 0,
    });
  });

  it('알려진 도구는 knownTools 순서, 모르는 도구가 있으면 마지막에 기타', () => {
    expect(toolChips(all)).toEqual(['Claude Code', 'Cursor', 'Bolt', 'other']);
    expect(toolChips([view({ tools: ['Cursor'] })])).toEqual(['Cursor']);
  });
});

describe('URL 쿼리', () => {
  it('기본값은 쿼리에서 뺀다', () => {
    expect(toFilterQuery(DEFAULT_FILTER)).toBe('');
    expect(toFilterQuery({ tab: 'recruit', tool: 'Cursor', sort: 'stars', q: '' })).toBe(
      '?tab=recruit&tool=Cursor&sort=stars',
    );
  });

  it('쿼리를 읽고, 모르는 값은 기본값으로', () => {
    expect(parseFilterQuery('?tab=done&tool=Claude%20Code&sort=progress&q=%EC%95%B1')).toEqual({
      tab: 'done',
      tool: 'Claude Code',
      sort: 'progress',
      q: '앱',
    });
    expect(parseFilterQuery('?tab=nope&sort=weird')).toEqual(DEFAULT_FILTER);
  });

  it('쓰고 읽으면 같은 값', () => {
    const state = { tab: 'dormant', tool: 'other', sort: 'stars', q: 'a b' } as const;
    expect(parseFilterQuery(toFilterQuery(state))).toEqual(state);
  });
});
