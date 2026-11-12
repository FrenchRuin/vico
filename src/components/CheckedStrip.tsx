import type { ProjectView } from '../../lib/data';
import { projectPath } from './styles';

/**
 * "방금 체크한 항목" 띠 (docs/design.md 3.1). 한 줄로 두고 넘치면 가로로 스크롤한다.
 * 안의 링크로 포커스가 옮겨 가면 브라우저가 알아서 스크롤한다.
 */
export function CheckedStrip({ projects }: { projects: readonly ProjectView[] }) {
  if (projects.length === 0) return null;
  return (
    <section aria-labelledby="checked-title" className="px-gutter pb-12 text-center">
      <h2 id="checked-title" className="text-xs text-text-muted">
        방금 체크한 항목
      </h2>
      <ul className="strip-scroll mx-auto mt-2 flex max-w-content justify-center-safe gap-7 overflow-x-auto font-mono text-[13px] whitespace-nowrap text-text-muted">
        {projects.map((project) => (
          <li key={`${project.owner}/${project.repo}`}>
            <a
              href={projectPath(project)}
              className="inline-flex min-h-11 items-center gap-1.5 hover:text-text"
            >
              <span aria-hidden="true" className="text-mint">
                [x]
              </span>
              <span className="sr-only">완료:</span>
              {project.title} · {project.lastCompleted?.text}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
