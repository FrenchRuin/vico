// A-01 수집: projects.json의 레포마다 GitHub에서 VICO.md와 정보를 모아 data/projects.data.json을 만든다.
// 규칙은 docs/spec.md 7절 A-01.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseVicoMarkdown } from '../lib/parse';
import { findNewlyCompleted } from '../lib/progress';
import { parseRepoEntry, repoKey } from '../lib/registry';
import {
  type CollectError,
  type Project,
  type ProjectsData,
  projectsDataSchema,
} from '../lib/schema';
import { config } from '../vico.config';
import {
  createOctokitClient,
  defaultRetryOptions,
  type GitHubClient,
  mapLimit,
  withRetries,
} from './github';

const VICO_FILE = 'VICO.md';

type Outcome =
  | { kind: 'ok'; project: Project }
  | { kind: 'error'; reason: string; keepPrevious: boolean };

export type CollectInput = {
  /** projects.json 원문 배열 */
  entries: readonly unknown[];
  previous: ProjectsData | null;
  github: GitHubClient;
  now: Date;
  concurrency?: number;
};

function apiErrorReason(error: unknown): string {
  const status = (error as { status?: number })?.status;
  return status ? `GitHub API 오류 (${status})` : 'GitHub API 오류 (네트워크)';
}

function latest(a: string, b: string): string {
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

async function collectOne(
  entry: string,
  github: GitHubClient,
  previous: Project | undefined,
  nowIso: string,
): Promise<Outcome> {
  const ref = parseRepoEntry(entry);
  if (!ref) {
    return {
      kind: 'error',
      reason: '형식이 github.com/아이디/레포가 아니에요',
      keepPrevious: false,
    };
  }

  try {
    const info = await github.getRepo(ref.owner, ref.repo);
    if (!info) return { kind: 'error', reason: '레포를 찾을 수 없어요', keepPrevious: false };
    if (info.private) return { kind: 'error', reason: '비공개 레포예요', keepPrevious: false };

    const source = await github.getFile(info.owner, info.repo, VICO_FILE);
    if (source === null) return { kind: 'error', reason: 'VICO.md가 없어요', keepPrevious: false };

    const parsed = parseVicoMarkdown(source);
    if (!parsed.ok) {
      return {
        kind: 'error',
        reason: `VICO.md 형식 오류: ${parsed.errors.join(' / ')}`,
        keepPrevious: false,
      };
    }

    const [lastCommitAt, vicoUpdatedAt] = await Promise.all([
      github.getLastCommitAt(info.owner, info.repo),
      github.getLastCommitAt(info.owner, info.repo, VICO_FILE),
    ]);
    if (!lastCommitAt || !vicoUpdatedAt) {
      return { kind: 'error', reason: '커밋 기록을 읽을 수 없어요', keepPrevious: false };
    }

    const newlyCompleted = findNewlyCompleted(previous?.stages ?? null, parsed.stages);
    const justDone = newlyCompleted.at(-1);
    const { frontmatter } = parsed;

    return {
      kind: 'ok',
      project: {
        owner: info.owner,
        repo: info.repo,
        url: `https://github.com/${info.owner}/${info.repo}`,
        title: frontmatter.title,
        summary: frontmatter.summary,
        tools: frontmatter.tools,
        declaredStatus: frontmatter.status,
        recruiting: frontmatter.recruiting,
        lookingFor: frontmatter.looking_for,
        contact: frontmatter.contact,
        demo: frontmatter.demo,
        stages: parsed.stages,
        done: parsed.done,
        total: parsed.total,
        progress: parsed.progress,
        nextTask: parsed.nextTask,
        lastCompleted: justDone
          ? { text: justDone.text, at: nowIso }
          : (previous?.lastCompleted ?? null),
        stars: info.stars,
        language: info.language,
        lastCommitAt,
        vicoUpdatedAt,
        activityAt: latest(lastCommitAt, vicoUpdatedAt),
        registeredAt: previous?.registeredAt ?? nowIso,
      },
    };
  } catch (error) {
    return { kind: 'error', reason: apiErrorReason(error), keepPrevious: true };
  }
}

/** 명단 전체를 수집한다. GitHub 접근은 주입받는다. */
export async function collect({
  entries,
  previous,
  github,
  now,
  concurrency = config.collectConcurrency,
}: CollectInput): Promise<ProjectsData> {
  const nowIso = now.toISOString();
  const previousProjects = new Map(
    (previous?.projects ?? []).map((project) => [repoKey(project), project]),
  );
  const previousErrors = new Map((previous?.errors ?? []).map((error) => [error.repo, error]));

  // 중복(대소문자 무시)은 처음 것만. 문자열이 아닌 항목은 그대로 오류로 남긴다.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of entries) {
    const entry = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  const outcomes = await mapLimit(unique, concurrency, (entry) => {
    const ref = parseRepoEntry(entry);
    return collectOne(entry, github, ref ? previousProjects.get(repoKey(ref)) : undefined, nowIso);
  });

  const projects: Project[] = [];
  const errors: CollectError[] = [];
  outcomes.forEach((outcome, index) => {
    const entry = unique[index] as string;
    if (outcome.kind === 'ok') {
      projects.push(outcome.project);
      return;
    }
    errors.push({
      repo: entry,
      reason: outcome.reason,
      since: previousErrors.get(entry)?.since ?? nowIso,
    });
    const ref = parseRepoEntry(entry);
    const kept = outcome.keepPrevious && ref ? previousProjects.get(repoKey(ref)) : undefined;
    if (kept) projects.push(kept);
  });

  return { generatedAt: nowIso, projects, errors };
}

/** generatedAt을 빼고 같은지 비교한다. */
export function isSameData(a: ProjectsData | null, b: ProjectsData): boolean {
  if (!a) return false;
  return (
    JSON.stringify({ projects: a.projects, errors: a.errors }) ===
    JSON.stringify({ projects: b.projects, errors: b.errors })
  );
}

function readPrevious(path: string): ProjectsData | null {
  if (!existsSync(path)) return null;
  return projectsDataSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env가 없으면 환경 변수만 쓴다.
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      'GITHUB_TOKEN이 필요해요. .env에 GITHUB_TOKEN=... 을 넣거나 환경 변수로 넘겨 주세요.',
    );
    process.exit(1);
  }

  const root = process.cwd();
  const dataPath = join(root, 'data', 'projects.data.json');
  const entries: unknown = JSON.parse(readFileSync(join(root, 'projects.json'), 'utf8'));
  if (!Array.isArray(entries)) throw new Error('projects.json은 배열이어야 해요');

  const previous = readPrevious(dataPath);
  const github = withRetries(createOctokitClient(token), {
    ...defaultRetryOptions,
    retries: config.apiRetries,
  });
  const next = await collect({ entries, previous, github, now: new Date() });

  console.log(`수집: 성공 ${next.projects.length}개, 오류 ${next.errors.length}개`);
  for (const error of next.errors) console.log(`  - ${error.repo}: ${error.reason}`);

  if (isSameData(previous, next)) {
    console.log('변경 없음. 파일을 쓰지 않아요.');
    return;
  }
  writeFileSync(dataPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`저장: ${dataPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
