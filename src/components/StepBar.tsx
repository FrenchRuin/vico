import type { ActivityStatus } from '../../lib/status';
import { config } from '../../vico.config';
import { STATUS_CLASS } from './styles';

type StepBarProps = {
  /** 항목별 완료 여부 (문서 순서) */
  items: readonly boolean[];
  status: ActivityStatus;
  /** deep 배경(하이라이트 카드) 위에 그릴 때 */
  onDeep?: boolean;
  /** 방금 완료한 칸 (mint로 강조) */
  justCompletedIndex?: number | null;
};

/** 체크리스트 항목 수만큼 칸을 나눈 막대. 항목이 많으면 일반 진행률 바로 그린다. */
export function StepBar({
  items,
  status,
  onDeep = false,
  justCompletedIndex = null,
}: StepBarProps) {
  const done = items.filter(Boolean).length;
  const label = `체크리스트 ${items.length}개 중 ${done}개 완료`;
  const doneClass = onDeep ? 'bg-deep-step' : STATUS_CLASS[status].bar;
  const emptyClass = onDeep ? 'bg-white/15' : 'bg-step-empty';

  if (items.length === 0 || items.length > config.maxStepBarItems) {
    const percent = items.length === 0 ? 0 : (done / items.length) * 100;
    return (
      <div
        role="img"
        aria-label={label}
        className={`h-1.5 w-full overflow-hidden rounded-full ${onDeep ? 'bg-white/15' : 'bg-track'}`}
      >
        <div className={`h-full rounded-full ${doneClass}`} style={{ width: `${percent}%` }} />
      </div>
    );
  }

  return (
    <div role="img" aria-label={label} className="flex h-1.5 w-full gap-[3px]">
      {items.map((isDone, index) => (
        <span
          // 칸은 순서가 곧 정체성이라 index를 키로 쓴다.
          // biome-ignore lint/suspicious/noArrayIndexKey: 순서가 바뀌지 않는 고정 칸
          key={index}
          className={`h-full flex-1 rounded-[2px] ${
            index === justCompletedIndex ? 'bg-mint' : isDone ? doneClass : emptyClass
          }`}
        />
      ))}
    </div>
  );
}
