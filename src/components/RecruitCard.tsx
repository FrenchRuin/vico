import type { ProjectView } from '../../lib/data';
import { StepBar } from './StepBar';
import { projectPath, TILE, TILE_PILL } from './styles';

/** 메인 타일 묶음의 "팀원 모집" 타일. 타일 전체가 상세 링크. */
export function RecruitCard({ project }: { project: ProjectView }) {
  const items = project.stages.flatMap((stage) => stage.items.map((item) => item.done));
  return (
    <a href={projectPath(project)} className={`${TILE} gap-3 hover:border-border-strong`}>
      <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
        <span className="min-w-0 truncate font-mono">@{project.owner}</span>
        <span className={`${TILE_PILL} border-deep-label/40 text-deep-label`}>팀원 모집 중</span>
      </div>

      <h3 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
        {project.title}
      </h3>

      <span className="mt-1 font-mono text-[44px] leading-none font-extrabold tracking-[-0.04em]">
        {project.progress}
        <span className="text-xl text-text-muted">%</span>
      </span>

      <StepBar items={items} status={project.status} />

      <p className="mt-auto text-[13px] text-text-muted">
        찾는 사람:{' '}
        <span className="font-semibold text-text-sub">{project.lookingFor.join(', ')}</span>
      </p>
    </a>
  );
}
