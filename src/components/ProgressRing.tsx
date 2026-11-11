import type { ActivityStatus } from '../../lib/status';
import { STATUS_CLASS } from './styles';

type ProgressRingProps = {
  done: number;
  total: number;
  progress: number;
  status: ActivityStatus;
};

const SIZE = 132;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 상세 화면용 원형 진행률 (지름 132px, 두께 12px). */
export function ProgressRing({ done, total, progress, status }: ProgressRingProps) {
  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-track"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className={STATUS_CLASS[status].ring}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[28px] font-bold leading-none">{progress}%</span>
        <span className="mt-1.5 font-mono text-xs text-text-muted">
          {done} / {total}
        </span>
      </div>
      <span className="sr-only">
        진행률 {progress}%, 체크리스트 {total}개 중 {done}개 완료
      </span>
    </div>
  );
}
