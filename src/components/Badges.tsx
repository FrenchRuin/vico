import { type ActivityStatus, STATUS_LABEL } from '../../lib/status';
import { BADGE_BASE, STATUS_CLASS } from './styles';

type StatusBadgeProps = {
  status: ActivityStatus;
  /** "3일 전"처럼 덧붙일 말 */
  suffix?: string;
};

export function StatusBadge({ status, suffix }: StatusBadgeProps) {
  return (
    <span className={`${BADGE_BASE} ${STATUS_CLASS[status].badge}`}>
      {STATUS_LABEL[status]}
      {suffix ? ` · ${suffix}` : ''}
    </span>
  );
}

export function RecruitBadge() {
  return <span className={`${BADGE_BASE} bg-accent-soft text-accent-text`}>모집 중</span>;
}

export function ToolBadge({ tool }: { tool: string }) {
  return <span className={`${BADGE_BASE} bg-muted font-medium text-text-sub`}>{tool}</span>;
}
