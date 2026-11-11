// 메인 목록의 탭/도구/검색/정렬 규칙과 URL 쿼리. 규칙은 docs/spec.md 5절.
import { config } from '../vico.config';
import type { ProjectView } from './data';
import { isActive } from './status';

export const TABS = ['ongoing', 'recruit', 'done', 'dormant'] as const;
export const SORTS = ['recent', 'stars', 'progress'] as const;
export type Tab = (typeof TABS)[number];
export type Sort = (typeof SORTS)[number];

/** 알려지지 않은 도구를 묶는 칩의 값 */
export const OTHER_TOOL = 'other';

export type FilterState = {
  tab: Tab;
  /** null = 전체 */
  tool: string | null;
  sort: Sort;
  q: string;
};

export const DEFAULT_FILTER: FilterState = { tab: 'ongoing', tool: null, sort: 'recent', q: '' };

export const TAB_LABEL: Record<Tab, string> = {
  ongoing: '진행중',
  recruit: '팀원 모집',
  done: '완성작',
  dormant: '휴면',
};

export const SORT_LABEL: Record<Sort, string> = {
  recent: '최근 업데이트',
  stars: '스타',
  progress: '진행률',
};

type FilterableProject = Pick<
  ProjectView,
  'status' | 'recruiting' | 'tools' | 'title' | 'summary' | 'activityAt' | 'stars' | 'progress'
>;

export function inTab(project: FilterableProject, tab: Tab): boolean {
  switch (tab) {
    case 'ongoing':
      return isActive(project.status);
    case 'recruit':
      return project.recruiting && project.status !== 'dormant';
    case 'done':
      return project.status === 'done';
    case 'dormant':
      return project.status === 'dormant';
  }
}

function matchesTool(
  project: FilterableProject,
  tool: string | null,
  knownTools: readonly string[],
): boolean {
  if (tool === null) return true;
  if (tool === OTHER_TOOL) return project.tools.some((t) => !knownTools.includes(t));
  return project.tools.includes(tool);
}

function normalizeText(text: string): string {
  return text.normalize('NFC').toLowerCase().trim();
}

function matchesQuery(project: FilterableProject, q: string): boolean {
  const query = normalizeText(q);
  if (!query) return true;
  return normalizeText(`${project.title} ${project.summary}`).includes(query);
}

function time(iso: string): number {
  return new Date(iso).getTime();
}

function compare(a: FilterableProject, b: FilterableProject, sort: Sort): number {
  const recent = time(b.activityAt) - time(a.activityAt);
  if (sort === 'stars') return b.stars - a.stars || recent;
  if (sort === 'progress') return b.progress - a.progress || recent;
  return recent;
}

/** 탭과 상관없이 도구/검색 조건만 적용한다. */
function applyToolAndQuery<T extends FilterableProject>(
  projects: readonly T[],
  state: FilterState,
  knownTools: readonly string[],
): T[] {
  return projects.filter((p) => matchesTool(p, state.tool, knownTools) && matchesQuery(p, state.q));
}

/** 진행중 탭은 활발 → 잠잠으로 묶은 뒤 정렬 기준을 적용한다. */
export function filterProjects<T extends FilterableProject>(
  projects: readonly T[],
  state: FilterState,
  knownTools: readonly string[] = config.knownTools,
): T[] {
  return applyToolAndQuery(projects, state, knownTools)
    .filter((p) => inTab(p, state.tab))
    .sort((a, b) => {
      if (state.tab === 'ongoing' && a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      return compare(a, b, state.sort);
    });
}

/** 도구와 검색 조건을 적용한 뒤 탭별 개수. */
export function tabCounts(
  projects: readonly FilterableProject[],
  state: FilterState,
  knownTools: readonly string[] = config.knownTools,
): Record<Tab, number> {
  const filtered = applyToolAndQuery(projects, state, knownTools);
  return Object.fromEntries(
    TABS.map((tab) => [tab, filtered.filter((p) => inTab(p, tab)).length]),
  ) as Record<Tab, number>;
}

/** 데이터에 있는 알려진 도구(knownTools 순서) + 모르는 도구가 있으면 "other". */
export function toolChips(
  projects: readonly Pick<ProjectView, 'tools'>[],
  knownTools: readonly string[] = config.knownTools,
): string[] {
  const used = new Set(projects.flatMap((p) => p.tools));
  const chips = knownTools.filter((tool) => used.has(tool));
  if ([...used].some((tool) => !knownTools.includes(tool))) chips.push(OTHER_TOOL);
  return chips;
}

/** 기본값은 빼고 쿼리 문자열로. 기본 상태면 빈 문자열. */
export function toFilterQuery(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.tab !== DEFAULT_FILTER.tab) params.set('tab', state.tab);
  if (state.tool !== null) params.set('tool', state.tool);
  if (state.sort !== DEFAULT_FILTER.sort) params.set('sort', state.sort);
  if (state.q.trim()) params.set('q', state.q);
  const query = params.toString().replace(/\+/g, '%20');
  return query ? `?${query}` : '';
}

/** 쿼리 문자열을 읽는다. 모르는 값은 기본값. */
export function parseFilterQuery(search: string): FilterState {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const sort = params.get('sort');
  return {
    tab: TABS.find((t) => t === tab) ?? DEFAULT_FILTER.tab,
    tool: params.get('tool') || null,
    sort: SORTS.find((s) => s === sort) ?? DEFAULT_FILTER.sort,
    q: params.get('q') ?? '',
  };
}
