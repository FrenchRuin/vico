import type { ProjectView } from '../../lib/data';
import { relativeDay } from '../../lib/status';
import { StepBar } from './StepBar';
import { projectPath } from './styles';

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

/** 메인 상단 하이라이트 (F-15, deep 배경). 카드 전체가 상세 링크. */
export function HighlightCard({ project, now }: HighlightCardProps) {
  const items = project.stages.flatMap((stage) => stage.items.map((item) => item.done));
  const completedAt = project.lastCompleted?.at;
  return (
    <a
      href={projectPath(project)}
      className="flex h-full flex-col gap-4 rounded-section bg-deep p-6 text-white transition-shadow hover:shadow-lg"
    >
      <div className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-deep-label">
        <span>방금 체크리스트를 완료한 프로젝트</span>
        {completedAt ? (
          <span className="font-normal text-deep-text">· {relativeDay(completedAt, now)}</span>
        ) : null}
      </div>

      <div>
        <h2 className="text-2xl font-bold leading-snug">{project.title}</h2>
        <p className="mt-1 text-sm text-deep-text">{project.summary}</p>
      </div>

      <StepBar
        items={items}
        status={project.status}
        onDeep
        justCompletedIndex={justCompletedIndex(project)}
      />

      {project.lastCompleted ? (
        <p className="text-sm">
          <span aria-hidden="true" className="mr-1.5 font-bold text-mint">
            ✓
          </span>
          방금 완료: <span className="font-semibold text-mint">{project.lastCompleted.text}</span>
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-white/15 pt-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[28px] font-bold leading-none">
            {project.status === 'done' ? '완성!' : `${project.progress}%`}
          </span>
          <span className="font-mono text-[13px] text-deep-text">@{project.owner}</span>
        </div>
        <div className="flex flex-col items-end gap-1 text-[13px] text-deep-text">
          {project.recruiting ? (
            <span className="font-semibold text-white">
              모집 중 · {project.lookingFor.join(', ')}
            </span>
          ) : null}
          <span className="font-mono">
            <span aria-hidden="true">★</span>
            <span className="sr-only">스타</span> {project.stars}
          </span>
        </div>
      </div>
    </a>
  );
}
