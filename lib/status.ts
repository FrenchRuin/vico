// 활발/잠잠/휴면/완료 판정. 규칙은 docs/spec.md 4절.
import { config as defaultConfig, type VicoConfig } from '../vico.config';
import type { Project } from './schema';

export type ActivityStatus = 'active' | 'quiet' | 'dormant' | 'done';

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  active: '활발',
  quiet: '잠잠',
  dormant: '휴면',
  done: '완료',
};

const DAY_MS = 24 * 60 * 60 * 1000;

type StatusInput = Pick<Project, 'declaredStatus' | 'done' | 'total' | 'activityAt'>;
type DayConfig = Pick<VicoConfig, 'activeDays' | 'quietDays'>;

/** 경과일 = floor((now - date) / 24시간). 미래 시각은 0. */
export function daysSince(date: string | Date, now: Date): number {
  const elapsed = now.getTime() - new Date(date).getTime();
  return Math.max(0, Math.floor(elapsed / DAY_MS));
}

/** 진행률 100%(체크박스 1개 이상) 또는 status: 완료. */
export function isCompleted(project: Pick<Project, 'declaredStatus' | 'done' | 'total'>): boolean {
  return project.declaredStatus === '완료' || (project.total > 0 && project.done === project.total);
}

/** 판정 순서: 완료 → 중단(휴면) → 날짜 기준. */
export function getStatus(
  project: StatusInput,
  now: Date,
  config: DayConfig = defaultConfig,
): ActivityStatus {
  if (isCompleted(project)) return 'done';
  if (project.declaredStatus === '중단') return 'dormant';
  const days = daysSince(project.activityAt, now);
  if (days <= config.activeDays) return 'active';
  if (days <= config.quietDays) return 'quiet';
  return 'dormant';
}

/**
 * 휴면 시작일. 지금 휴면이 아니면 null.
 * 날짜 기준이면 활동일 + quietDays + 1일, status: 중단이면 VICO.md 마지막 커밋 시각.
 */
export function getDormantSince(
  project: StatusInput & Pick<Project, 'vicoUpdatedAt'>,
  now: Date,
  config: DayConfig = defaultConfig,
): Date | null {
  if (getStatus(project, now, config) !== 'dormant') return null;
  if (project.declaredStatus === '중단') return new Date(project.vicoUpdatedAt);
  return new Date(new Date(project.activityAt).getTime() + (config.quietDays + 1) * DAY_MS);
}

/** "진행중 프로젝트" = 활발 또는 잠잠. */
export function isActive(status: ActivityStatus): boolean {
  return status === 'active' || status === 'quiet';
}

/** 아이디(소문자)별 진행중 프로젝트 수. */
export function countActiveByOwner(
  projects: readonly (StatusInput & Pick<Project, 'owner'>)[],
  now: Date,
  config: DayConfig = defaultConfig,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const project of projects) {
    if (!isActive(getStatus(project, now, config))) continue;
    const owner = project.owner.toLowerCase();
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return counts;
}

/** 0일이면 "오늘", 그 외 "N일 전". */
export function relativeDay(date: string | Date, now: Date): string {
  const days = daysSince(date, now);
  return days === 0 ? '오늘' : `${days}일 전`;
}
