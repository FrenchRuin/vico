// A-04 리마인더와 정리. 기본은 dry-run(할 일만 출력), --apply일 때만 이슈/PR을 만든다.
// 규칙은 docs/spec.md 7절 A-04.
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Octokit } from '@octokit/rest';
import { repoKey } from '../lib/registry';
import { type Project, type ProjectsData, projectsDataSchema } from '../lib/schema';
import { daysSince, getDormantSince, getStatus } from '../lib/status';
import { config as defaultConfig, type VicoConfig } from '../vico.config';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REMINDER_PREFIX = '[Vico]';
export const CLEANUP_BRANCH = 'vico/cleanup';

type MaintainConfig = Pick<
  VicoConfig,
  | 'activeDays'
  | 'quietDays'
  | 'reminderDays'
  | 'removeAfterDormantDays'
  | 'removeAfterErrorDays'
  | 'siteUrl'
>;

export type Removal = { entry: string; reason: string };

export type MaintenancePlan = {
  /** 리마인더 대상 (이미 보낸 적이 있는지는 실행할 때 확인) */
  reminders: Project[];
  removals: Removal[];
  /** 정리 후 projects.json 항목 */
  remaining: string[];
};

/** 무엇을 할지 정한다. GitHub는 부르지 않는다. */
export function planMaintenance(
  data: ProjectsData,
  entries: readonly string[],
  now: Date,
  config: MaintainConfig = defaultConfig,
): MaintenancePlan {
  const reminders = data.projects.filter(
    (project) =>
      project.declaredStatus !== '중단' &&
      getStatus(project, now, config) !== 'done' &&
      daysSince(project.activityAt, now) >= config.reminderDays,
  );

  const reasonByKey = new Map<string, string>();
  for (const project of data.projects) {
    const since = getDormantSince(project, now, config);
    if (!since) continue;
    const days = Math.floor((now.getTime() - since.getTime()) / DAY_MS);
    if (days >= config.removeAfterDormantDays) {
      reasonByKey.set(repoKey(project), `휴면 ${days}일째`);
    }
  }
  const errorByEntry = new Map<string, string>();
  for (const error of data.errors) {
    const days = Math.floor((now.getTime() - new Date(error.since).getTime()) / DAY_MS);
    if (days > config.removeAfterErrorDays) {
      errorByEntry.set(error.repo.toLowerCase(), `수집 실패 ${days}일째: ${error.reason}`);
    }
  }

  const removals: Removal[] = [];
  const remaining: string[] = [];
  for (const entry of entries) {
    const key = entry.toLowerCase().replace(/^github\.com\//, '');
    const reason = reasonByKey.get(key) ?? errorByEntry.get(entry.toLowerCase());
    if (reason) removals.push({ entry, reason });
    else remaining.push(entry);
  }
  return { reminders, removals, remaining };
}

export function reminderTitle(config: Pick<VicoConfig, 'reminderDays'> = defaultConfig): string {
  return `${REMINDER_PREFIX} ${config.reminderDays}일 동안 업데이트가 없어요`;
}

export function reminderBody(
  project: Pick<Project, 'owner' | 'repo'>,
  config: Pick<VicoConfig, 'reminderDays' | 'siteUrl'> = defaultConfig,
): string {
  return [
    `안녕하세요, Vico 봇이에요. 이 프로젝트가 ${config.reminderDays}일 동안 업데이트가 없어서 알려드려요.`,
    'VICO.md 체크리스트를 업데이트하면 다시 활발 상태로 보여요. 더 이상 진행하지 않는다면 `status: 중단`으로 바꿔 주세요.',
    '',
    `Vico 페이지: ${config.siteUrl}/p/${project.owner}/${project.repo}`,
    '',
    '이 이슈는 닫아도 괜찮아요. 다시 업데이트하면 알림 주기가 처음부터 시작돼요.',
  ].join('\n');
}

export function cleanupPrBody(removals: readonly Removal[]): string {
  return [
    'Vico 봇이 정리 대상을 찾았어요. 확인 후 머지해 주세요.',
    '',
    '| 레포 | 이유 |',
    '| --- | --- |',
    ...removals.map((r) => `| \`${r.entry}\` | ${r.reason.replace(/\|/g, '\\|')} |`),
    '',
    '다시 활동하면 언제든 다시 등록할 수 있어요.',
  ].join('\n');
}

export function registryJson(entries: readonly string[]): string {
  return `${JSON.stringify(entries, null, 2)}\n`;
}

/** --apply에서 쓰는 GitHub 동작. 테스트에서는 가짜를 넣는다. */
export interface MaintenanceOps {
  /** since 이후에 만든 Vico 리마인더 이슈(열림/닫힘)가 있는지 */
  hasReminderSince(owner: string, repo: string, since: string): Promise<boolean>;
  openReminder(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<'created' | 'issues-disabled'>;
  /** 정리 브랜치에 projects.json을 올리고 PR을 만들거나 갱신한다. PR 주소를 돌려준다. */
  upsertCleanupPr(projectsJson: string, body: string): Promise<string>;
}

/** 계획을 실행한다. apply가 false면 할 일만 적는다. 출력 줄 목록을 돌려준다. */
export async function runMaintenance(
  plan: MaintenancePlan,
  options: { apply: boolean; ops?: MaintenanceOps; config?: MaintainConfig },
): Promise<string[]> {
  const config = options.config ?? defaultConfig;
  const log: string[] = [options.apply ? '[apply]' : '[dry-run] 실제로는 아무것도 하지 않아요'];

  log.push(`리마인더 대상 ${plan.reminders.length}개`);
  for (const project of plan.reminders) {
    const name = `${project.owner}/${project.repo}`;
    if (!options.apply || !options.ops) {
      log.push(`  - ${name}: 이슈를 열어요 (활동일 이후 연 리마인더가 있으면 건너뜀)`);
      continue;
    }
    if (await options.ops.hasReminderSince(project.owner, project.repo, project.activityAt)) {
      log.push(`  - ${name}: 이미 리마인더를 보냈어요. 건너뜀`);
      continue;
    }
    const result = await options.ops.openReminder(
      project.owner,
      project.repo,
      reminderTitle(config),
      reminderBody(project, config),
    );
    log.push(
      result === 'created'
        ? `  - ${name}: 이슈를 열었어요`
        : `  - ${name}: 이슈 기능이 꺼져 있어 건너뜀`,
    );
  }

  log.push(`정리 대상 ${plan.removals.length}개`);
  for (const removal of plan.removals) log.push(`  - ${removal.entry}: ${removal.reason}`);
  if (plan.removals.length > 0) {
    if (options.apply && options.ops) {
      const url = await options.ops.upsertCleanupPr(
        registryJson(plan.remaining),
        cleanupPrBody(plan.removals),
      );
      log.push(`정리 PR: ${url}`);
    } else {
      log.push(`정리 PR을 만들거나 갱신해요 (브랜치 ${CLEANUP_BRANCH})`);
    }
  }
  return log;
}

type HttpError = { status?: number };

/** repoUrl(https://github.com/{owner}/{repo})에서 owner/repo를 꺼낸다. */
export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/.exec(url);
  if (!match?.[1] || !match[2])
    throw new Error(`vico.config.ts의 repoUrl을 읽을 수 없어요: ${url}`);
  return { owner: match[1], repo: match[2] };
}

export function createOctokitOps(token: string, repoUrl: string): MaintenanceOps {
  const octokit = new Octokit({ auth: token, userAgent: 'vico-maintain' });
  const home = parseRepoUrl(repoUrl);
  let login: Promise<string> | null = null;
  const botLogin = () => {
    login ??= octokit.rest.users.getAuthenticated().then(({ data }) => data.login);
    return login;
  };

  return {
    async hasReminderSince(owner, repo, since) {
      const creator = await botLogin();
      const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
        owner,
        repo,
        state: 'all',
        creator,
        since,
        per_page: 100,
      });
      const sinceTime = new Date(since).getTime();
      return issues.some(
        (issue) =>
          !issue.pull_request &&
          issue.title.startsWith(REMINDER_PREFIX) &&
          new Date(issue.created_at).getTime() >= sinceTime,
      );
    },

    async openReminder(owner, repo, title, body) {
      try {
        await octokit.rest.issues.create({ owner, repo, title, body });
        return 'created';
      } catch (error) {
        // 이슈 기능이 꺼진 레포는 410을 돌려준다.
        if ((error as HttpError).status === 410) return 'issues-disabled';
        throw error;
      }
    },

    async upsertCleanupPr(projectsJson, body) {
      const { owner, repo } = home;
      const base = (await octokit.rest.repos.get({ owner, repo })).data.default_branch;
      const baseSha = (await octokit.rest.git.getRef({ owner, repo, ref: `heads/${base}` })).data
        .object.sha;

      // 정리 브랜치를 base 최신으로 맞춘 뒤 projects.json을 덮어쓴다.
      try {
        await octokit.rest.git.updateRef({
          owner,
          repo,
          ref: `heads/${CLEANUP_BRANCH}`,
          sha: baseSha,
          force: true,
        });
      } catch {
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${CLEANUP_BRANCH}`,
          sha: baseSha,
        });
      }
      const current = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'projects.json',
        ref: CLEANUP_BRANCH,
      });
      const sha = Array.isArray(current.data) ? undefined : current.data.sha;
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'projects.json',
        branch: CLEANUP_BRANCH,
        message: 'chore: remove inactive projects from registry',
        content: Buffer.from(projectsJson, 'utf8').toString('base64'),
        sha,
      });

      const title = 'chore: 휴면/수집 실패 프로젝트 정리';
      const open = await octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${CLEANUP_BRANCH}`,
        state: 'open',
      });
      const existing = open.data[0];
      if (existing) {
        await octokit.rest.pulls.update({ owner, repo, pull_number: existing.number, body });
        return existing.html_url;
      }
      const created = await octokit.rest.pulls.create({
        owner,
        repo,
        head: CLEANUP_BRANCH,
        base,
        title,
        body,
      });
      return created.data.html_url;
    },
  };
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env가 없으면 환경 변수만 쓴다.
  }
  const apply = process.argv.includes('--apply');
  const dataPath = 'data/projects.data.json';
  if (!existsSync(dataPath)) {
    console.log('data/projects.data.json이 없어요. 먼저 pnpm collect를 실행해 주세요.');
    return;
  }
  const data = projectsDataSchema.parse(JSON.parse(readFileSync(dataPath, 'utf8')));
  const entries: unknown = JSON.parse(readFileSync('projects.json', 'utf8'));
  if (!Array.isArray(entries)) throw new Error('projects.json은 배열이어야 해요');

  const plan = planMaintenance(
    data,
    entries.filter((e): e is string => typeof e === 'string'),
    new Date(),
  );

  let ops: MaintenanceOps | undefined;
  if (apply) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('--apply에는 GITHUB_TOKEN(봇 토큰)이 필요해요.');
      process.exit(1);
    }
    ops = createOctokitOps(token, defaultConfig.repoUrl);
  }
  for (const line of await runMaintenance(plan, { apply, ops })) console.log(line);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
