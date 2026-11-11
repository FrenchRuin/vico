// README 뱃지 SVG (F-14). 빌드 시 프로젝트마다 정적 파일로 만든다.
import type { APIRoute, GetStaticPaths } from 'astro';
import { badgeSvg } from '../../../../lib/badge';
import { getSiteData, type ProjectView } from '../../../../lib/data';

export const getStaticPaths = (() =>
  getSiteData(new Date()).projects.map((project) => ({
    params: { owner: project.owner, repo: project.repo },
    props: { project },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ project: ProjectView }> = ({ props }) =>
  new Response(badgeSvg(props.project), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
