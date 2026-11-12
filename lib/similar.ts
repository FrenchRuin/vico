// 비슷한 프로젝트(F-16), 방금 완료 하이라이트(F-15), 메인 타일과 띠에 넣을 프로젝트. 규칙은 docs/spec.md 5절.
import { config as defaultConfig, type VicoConfig } from '../vico.config';
import type { Project } from './schema';
import { daysSince, getStatus } from './status';

function time(iso: string): number {
  return new Date(iso).getTime();
}

function projectKey(project: Pick<Project, 'owner' | 'repo'>): string {
  return `${project.owner}/${project.repo}`.toLowerCase();
}

/**
 * 도구가 겹치는 프로젝트. 자기 자신과 휴면 제외.
 * 겹치는 도구 수 내림차순 → 활동일 최신순, 최대 similarLimit개.
 */
export function getSimilar<T extends Project>(
  project: Project,
  all: readonly T[],
  now: Date,
  config: Pick<VicoConfig, 'activeDays' | 'quietDays' | 'similarLimit'> = defaultConfig,
): T[] {
  const myTools = new Set(project.tools);
  const myKey = projectKey(project);

  return all
    .filter((other) => projectKey(other) !== myKey && getStatus(other, now, config) !== 'dormant')
    .map((other) => ({ other, overlap: other.tools.filter((tool) => myTools.has(tool)).length }))
    .filter(({ overlap }) => overlap > 0)
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        time(b.other.activityAt) - time(a.other.activityAt) ||
        projectKey(a.other).localeCompare(projectKey(b.other)),
    )
    .slice(0, config.similarLimit)
    .map(({ other }) => other);
}

/**
 * 메인 상단 하이라이트. 휴면이 아니고 lastCompleted.at이 activeDays 이내인 프로젝트 중
 * lastCompleted.at이 가장 최근인 것. 없으면 null.
 */
export function getHighlight<T extends Project>(
  all: readonly T[],
  now: Date,
  config: Pick<VicoConfig, 'activeDays' | 'quietDays'> = defaultConfig,
): T | null {
  let best: T | null = null;
  for (const project of all) {
    const at = project.lastCompleted?.at;
    if (!at) continue;
    if (daysSince(at, now) > config.activeDays) continue;
    if (getStatus(project, now, config) === 'dormant') continue;
    if (!best?.lastCompleted || time(at) > time(best.lastCompleted.at)) best = project;
  }
  return best;
}

/**
 * 메인 "방금 체크한 항목" 띠. 휴면이 아니고 lastCompleted가 있는 프로젝트를
 * lastCompleted.at 최근순으로 최대 checkedStripLimit개. 하이라이트와 달리 기간 제한은 없다.
 */
export function getRecentlyChecked<T extends Project>(
  all: readonly T[],
  now: Date,
  config: Pick<VicoConfig, 'activeDays' | 'quietDays' | 'checkedStripLimit'> = defaultConfig,
): T[] {
  return all
    .filter((project) => project.lastCompleted && getStatus(project, now, config) !== 'dormant')
    .sort(
      (a, b) =>
        time(b.lastCompleted?.at ?? '') - time(a.lastCompleted?.at ?? '') ||
        projectKey(a).localeCompare(projectKey(b)),
    )
    .slice(0, config.checkedStripLimit);
}

export type OverviewProjects<T> = {
  highlight: T | null;
  recruiting: T[];
};

/**
 * 메인 타일 묶음의 프로젝트 타일. 하이라이트를 먼저 두고, 남은 자리(overviewProjectTiles)는
 * 휴면이 아닌 모집 프로젝트를 최근 활동순으로 채운다 (하이라이트와 겹치면 제외).
 */
export function getOverviewProjects<T extends Project>(
  all: readonly T[],
  now: Date,
  config: Pick<VicoConfig, 'activeDays' | 'quietDays' | 'overviewProjectTiles'> = defaultConfig,
): OverviewProjects<T> {
  const highlight = getHighlight(all, now, config);
  const highlightKey = highlight ? projectKey(highlight) : null;
  const slots = Math.max(0, config.overviewProjectTiles - (highlight ? 1 : 0));
  const recruiting = all
    .filter(
      (project) =>
        project.recruiting &&
        projectKey(project) !== highlightKey &&
        getStatus(project, now, config) !== 'dormant',
    )
    .sort(
      (a, b) =>
        time(b.activityAt) - time(a.activityAt) || projectKey(a).localeCompare(projectKey(b)),
    )
    .slice(0, slots);
  return { highlight, recruiting };
}
