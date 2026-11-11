import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectView } from '../../lib/data';
import {
  DEFAULT_FILTER,
  type FilterState,
  filterProjects,
  parseFilterQuery,
  TAB_LABEL,
  tabCounts,
  toFilterQuery,
  toolChips,
} from '../../lib/filter';
import { EmptyState } from './Blocks';
import { FilterBar } from './FilterBar';
import { ProjectCard } from './ProjectCard';

type ProjectBrowserProps = {
  projects: ProjectView[];
  /** 빌드 시각. 서버와 브라우저가 같은 상대 시각을 그리도록 문자열로 받는다. */
  nowIso: string;
};

/**
 * "모든 프로젝트" 영역 (client:load). 필터/정렬/검색은 브라우저에서 처리하고
 * 상태를 URL 쿼리에 반영한다. 첫 렌더는 기본값으로 그려 서버 HTML과 맞춘 뒤 쿼리를 읽는다.
 */
export function ProjectBrowser({ projects, nowIso }: ProjectBrowserProps) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [state, setState] = useState<FilterState>(DEFAULT_FILTER);
  const loaded = useRef(false);

  useEffect(() => {
    setState(parseFilterQuery(window.location.search));
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const { pathname, hash } = window.location;
    window.history.replaceState(null, '', `${pathname}${toFilterQuery(state)}${hash}`);
  }, [state]);

  const tools = useMemo(() => toolChips(projects), [projects]);
  const counts = useMemo(() => tabCounts(projects, state), [projects, state]);
  const visible = useMemo(() => filterProjects(projects, state), [projects, state]);

  return (
    <div className="flex flex-col gap-5">
      <FilterBar state={state} counts={counts} tools={tools} onChange={setState} />

      <p aria-live="polite" className="sr-only">
        {TAB_LABEL[state.tab]} 프로젝트 {visible.length}개
      </p>

      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 max-sm:grid-cols-1">
          {visible.map((project) => (
            <ProjectCard key={`${project.owner}/${project.repo}`} project={project} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
