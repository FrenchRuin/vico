import type { ProjectView } from '../../lib/data';
import { relativeDay } from '../../lib/status';
import { Avatar } from './Avatar';
import { RecruitBadge, StatusBadge, ToolBadge } from './Badges';
import { StepBar } from './StepBar';
import { profilePath, projectPath } from './styles';

type ProjectCardProps = {
  project: ProjectView;
  /** 빌드 시각 (상대 시각 계산용) */
  now: Date;
};

export function nextTaskText(project: Pick<ProjectView, 'total' | 'nextTask'>): string {
  if (project.total === 0) return '체크리스트가 비어 있어요';
  if (project.nextTask === null) return '체크리스트 완료';
  return `다음 할 일: ${project.nextTask}`;
}

/**
 * 카드 전체가 상세 링크다. 안쪽 @아이디 링크와 겹치지 않게
 * 제목 링크를 카드 전체로 늘리고(::after) 아이디 링크를 위에 올린다.
 */
export function ProjectCard({ project, now }: ProjectCardProps) {
  const items = project.stages.flatMap((stage) => stage.items.map((item) => item.done));
  return (
    <article className="relative flex flex-col gap-3 rounded-card border border-border bg-surface p-card transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent">
      <div className="flex items-center justify-between gap-2">
        <a
          href={profilePath(project.owner)}
          className="relative z-10 -my-2 flex min-h-11 min-w-0 items-center gap-2 font-mono text-[13px] font-medium text-text-sub hover:underline"
        >
          <Avatar id={project.owner} />
          <span className="truncate">@{project.owner}</span>
        </a>
        <StatusBadge status={project.status} suffix={relativeDay(project.activityAt, now)} />
      </div>

      <div className="flex items-start gap-2">
        <h3 className="min-w-0 text-[17px] font-bold leading-snug">
          <a
            href={projectPath(project)}
            className="outline-none after:absolute after:inset-0 after:rounded-card after:content-['']"
          >
            {project.title}
          </a>
        </h3>
        {project.recruiting && project.status !== 'dormant' ? (
          <span className="mt-0.5">
            <RecruitBadge />
          </span>
        ) : null}
      </div>

      <p className="line-clamp-2 min-h-10 text-sm leading-5 text-text-muted">{project.summary}</p>

      <StepBar items={items} status={project.status} />

      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate text-text-sub">{nextTaskText(project)}</span>
        <span className="font-mono font-bold">{project.progress}%</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-divider pt-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {project.tools.map((tool) => (
            <ToolBadge key={tool} tool={tool} />
          ))}
        </div>
        <span className="shrink-0 font-mono text-[13px] text-text-sub">
          <span aria-hidden="true" className="text-star">
            ★
          </span>
          <span className="sr-only">스타</span> {project.stars}
        </span>
      </div>
    </article>
  );
}
