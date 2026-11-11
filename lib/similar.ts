// 비슷한 프로젝트(F-16)와 방금 완료 하이라이트(F-15). 규칙은 docs/spec.md 5절.
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
export function getSimilar(
  project: Project,
  all: readonly Project[],
  now: Date,
  config: Pick<VicoConfig, 'activeDays' | 'quietDays' | 'similarLimit'> = defaultConfig,
): Project[] {
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
export function getHighlight(
  all: readonly Project[],
  now: Date,
  config: Pick<VicoConfig, 'activeDays' | 'quietDays'> = defaultConfig,
): Project | null {
  let best: Project | null = null;
  for (const project of all) {
    const at = project.lastCompleted?.at;
    if (!at) continue;
    if (daysSince(at, now) > config.activeDays) continue;
    if (getStatus(project, now, config) === 'dormant') continue;
    if (!best?.lastCompleted || time(at) > time(best.lastCompleted.at)) best = project;
  }
  return best;
}
