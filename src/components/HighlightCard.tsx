import type { ProjectView } from '../../lib/data';
import { relativeDay } from '../../lib/status';
import { StepBar } from './StepBar';
import { projectPath, TILE, TILE_PILL } from './styles';

type HighlightCardProps = {
  project: ProjectView;
  now: Date;
};

/** 방금 완료한 칸: lastCompleted와 같은 텍스트의 완료 항목 중 마지막. */
export function justCompletedIndex(project: Pick<ProjectView, 'stages' | 'lastCompleted'>): number {
  const items = project.stages.flatMap((stage) => stage.items);
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (item?.done && item.text === project.lastCompleted?.text) return i;
  }
  return -1;
}

/** 메인 타일 묶음의 "방금 완료" 타일 (F-15). 타일 전체가 상세 링크. */
export function HighlightCard({ project, now }: HighlightCardProps) {
  const items = project.stages.flatMap((stage) => stage.items.map((item) => item.done));
  const completedAt = project.lastCompleted?.at;
  return (
    <a href={projectPath(project)} className={`${TILE} gap-3 hover:border-border-strong`}>
      <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
        <span className="min-w-0 truncate font-mono">@{project.owner}</span>
        <span className={`${TILE_PILL} border-mint/35 text-mint`}>
          <span aria-hidden="true">●</span> 방금 완료
          {completedAt ? ` · ${relativeDay(completedAt, now)}` : ''}
        </span>
      </div>

      <h3 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
        {project.title}
      </h3>

      <span className="mt-1 font-mono text-[44px] leading-none font-extrabold tracking-[-0.04em]">
        {project.status === 'done' ? (
          '완성!'
        ) : (
          <>
            {project.progress}
            <span className="text-xl text-text-muted">%</span>
          </>
        )}
      </span>

      <StepBar
        items={items}
        status={project.status}
        onDeep
        justCompletedIndex={justCompletedIndex(project)}
      />

      {project.lastCompleted ? (
        <p className="text-[13px] text-text-muted">
          <span aria-hidden="true" className="mr-1.5 font-bold text-mint">
            ✓
          </span>
          방금 완료: <span className="font-semibold text-mint">{project.lastCompleted.text}</span>
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-text-muted">
        <span>{project.recruiting ? `모집 중 · ${project.lookingFor.join(', ')}` : ''}</span>
        <span className="font-mono">
          <span aria-hidden="true" className="text-star">
            ★
          </span>
          <span className="sr-only">스타</span> {project.stars}
        </span>
      </div>
    </a>
  );
}
