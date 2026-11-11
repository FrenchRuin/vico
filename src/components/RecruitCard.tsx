import type { ProjectView } from '../../lib/data';
import { projectPath } from './styles';

/** 모집 포지션 칩 + 제목 + "@아이디 · 진행률 N%". 카드 전체가 상세 링크. */
export function RecruitCard({ project }: { project: ProjectView }) {
  return (
    <a
      href={projectPath(project)}
      className="flex flex-col gap-2.5 rounded-card border border-accent-line bg-surface p-card transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap gap-1.5">
        {project.lookingFor.map((position) => (
          <span
            key={position}
            className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-text"
          >
            {position}
          </span>
        ))}
      </div>
      <span className="text-[15px] font-bold leading-snug">{project.title}</span>
      <span className="font-mono text-xs text-text-muted">
        @{project.owner} · 진행률 {project.progress}%
      </span>
    </a>
  );
}
