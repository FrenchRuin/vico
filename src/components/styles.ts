// 컴포넌트가 같이 쓰는 표시용 값. Tailwind가 찾을 수 있게 클래스 이름은 문자열 그대로 쓴다.
import type { ActivityStatus } from '../../lib/status';

export const STATUS_CLASS: Record<ActivityStatus, { badge: string; bar: string; ring: string }> = {
  active: { badge: 'bg-active-bg text-active-text', bar: 'bg-active-bar', ring: 'text-active-bar' },
  quiet: { badge: 'bg-quiet-bg text-quiet-text', bar: 'bg-quiet-bar', ring: 'text-quiet-bar' },
  dormant: {
    badge: 'bg-dormant-bg text-dormant-text',
    bar: 'bg-dormant-bar',
    ring: 'text-dormant-bar',
  },
  done: { badge: 'bg-done-bg text-done-text', bar: 'bg-done-bar', ring: 'text-done-bar' },
};

/** 작은 뱃지 공통 모양 (12px/600, 패딩 3px 8px, 둥글기 6px). */
export const BADGE_BASE =
  'inline-flex items-center whitespace-nowrap rounded-[6px] px-2 py-[3px] text-xs font-semibold leading-4';

export function projectPath(project: { owner: string; repo: string }): string {
  return `/p/${project.owner}/${project.repo}`;
}

export function profilePath(owner: string): string {
  return `/u/${owner}`;
}

/** 메인 타일 묶음의 타일 공통 모양 (docs/design.md 3.1). */
export const TILE =
  'relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-[22px]';

/** 타일 오른쪽 위 테두리 알약. */
export const TILE_PILL =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold';
