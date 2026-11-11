// 데이터 읽기 진입점. 사이트는 이 파일로만 데이터를 읽는다 (CLAUDE.md).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config as defaultConfig, type VicoConfig } from '../vico.config';
import { type Project, type ProjectsData, projectsDataSchema } from './schema';
import { type ActivityStatus, getStatus, isActive } from './status';

export type DataSource = 'collected' | 'sample';

export type ProjectView = Project & { status: ActivityStatus };

export type CommunityStats = {
  /** 등록(수집 성공) 프로젝트 수 */
  registered: number;
  /** 활발 + 잠잠 */
  inProgress: number;
  /** 활발 */
  activeNow: number;
  /** 휴면이 아닌 모집 중 프로젝트 */
  recruiting: number;
  /** 완료 */
  completed: number;
};

export type SiteData = {
  source: DataSource;
  generatedAt: string;
  projects: ProjectView[];
  stats: CommunityStats;
};

const DATA_FILE = 'projects.data.json';
const SAMPLE_FILE = 'sample.data.json';

/** `data/projects.data.json`이 있으면 그것, 없으면 예시 데이터 (날짜를 now 기준으로 옮김). */
export function loadData(
  now: Date,
  dataDir: string = join(process.cwd(), 'data'),
): { source: DataSource; data: ProjectsData } {
  const collectedPath = join(dataDir, DATA_FILE);
  if (existsSync(collectedPath)) {
    return { source: 'collected', data: readDataFile(collectedPath) };
  }
  const sample = readDataFile(join(dataDir, SAMPLE_FILE));
  return { source: 'sample', data: shiftDates(sample, now) };
}

function readDataFile(path: string): ProjectsData {
  const result = projectsDataSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`${path} 형식이 올바르지 않아요\n${details.join('\n')}`);
  }
  return result.data;
}

/** 모든 시각을 now - generatedAt만큼 옮긴다. */
export function shiftDates(data: ProjectsData, now: Date): ProjectsData {
  const offset = now.getTime() - new Date(data.generatedAt).getTime();
  const shift = (iso: string) => new Date(new Date(iso).getTime() + offset).toISOString();
  return {
    generatedAt: shift(data.generatedAt),
    projects: data.projects.map((project) => ({
      ...project,
      lastCompleted: project.lastCompleted
        ? { ...project.lastCompleted, at: shift(project.lastCompleted.at) }
        : null,
      lastCommitAt: shift(project.lastCommitAt),
      vicoUpdatedAt: shift(project.vicoUpdatedAt),
      activityAt: shift(project.activityAt),
      registeredAt: shift(project.registeredAt),
    })),
    errors: data.errors.map((error) => ({ ...error, since: shift(error.since) })),
  };
}

export function computeStats(projects: readonly ProjectView[]): CommunityStats {
  return {
    registered: projects.length,
    inProgress: projects.filter((p) => isActive(p.status)).length,
    activeNow: projects.filter((p) => p.status === 'active').length,
    recruiting: projects.filter((p) => p.recruiting && p.status !== 'dormant').length,
    completed: projects.filter((p) => p.status === 'done').length,
  };
}

/** 상태를 붙이고 최근 활동순으로 정렬한 화면용 데이터. */
export function buildSiteData(
  source: DataSource,
  data: ProjectsData,
  now: Date,
  config: Pick<VicoConfig, 'activeDays' | 'quietDays'> = defaultConfig,
): SiteData {
  const projects = data.projects
    .map((project) => ({ ...project, status: getStatus(project, now, config) }))
    .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime());
  return { source, generatedAt: data.generatedAt, projects, stats: computeStats(projects) };
}

/** 페이지에서 쓰는 진입점. */
export function getSiteData(now: Date = new Date()): SiteData {
  const { source, data } = loadData(now);
  return buildSiteData(source, data, now);
}

export function findProject(
  projects: readonly ProjectView[],
  owner: string,
  repo: string,
): ProjectView | undefined {
  const key = `${owner}/${repo}`.toLowerCase();
  return projects.find((p) => `${p.owner}/${p.repo}`.toLowerCase() === key);
}

/** 아이디(대소문자 무시)의 프로젝트 목록. */
export function listByOwner(projects: readonly ProjectView[], owner: string): ProjectView[] {
  const key = owner.toLowerCase();
  return projects.filter((p) => p.owner.toLowerCase() === key);
}

/** 프로젝트가 있는 아이디 목록 (처음 나온 표기 그대로, 중복 없음). */
export function listOwners(projects: readonly ProjectView[]): string[] {
  const owners = new Map<string, string>();
  for (const project of projects) {
    const key = project.owner.toLowerCase();
    if (!owners.has(key)) owners.set(key, project.owner);
  }
  return [...owners.values()];
}
