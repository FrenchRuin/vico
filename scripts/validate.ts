// A-03 등록 검증: PR의 projects.json에서 새로 추가된 레포만 검사하고 결과를 마크다운 표로 낸다.
// 규칙은 docs/spec.md 7절 A-03. PR 쪽 코드를 실행하지 않도록 입력은 파일 경로로만 받는다.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseRepoEntry } from '../lib/registry';
import { type ProjectsData, projectsDataSchema } from '../lib/schema';
import { countActiveByOwner, getStatus, isActive } from '../lib/status';
import { config } from '../vico.config';
import { collectRepo } from './collect';
import { createOctokitClient, defaultRetryOptions, type GitHubClient, withRetries } from './github';

/** PR 코멘트를 찾아 갱신할 때 쓰는 표시 */
export const COMMENT_MARKER = '<!-- vico-validate -->';
const REGISTRY_FILE = 'projects.json';

export type RepoResult = { entry: string; ok: boolean; reasons: string[] };

export type ValidationResult = {
  ok: boolean;
  /** 실패는 아니지만 알려 줄 것 (등록 PR이 아님 등) */
  warnings: string[];
  /** 파일 전체 문제 (JSON 형식 등) */
  fileErrors: string[];
  repos: RepoResult[];
};

export type ValidateInput = {
  /** base 브랜치의 projects.json 원문 (없으면 null) */
  baseText: string | null;
  /** PR의 projects.json 원문 */
  headText: string;
  /** PR에서 바뀐 파일 목록 (모르면 생략) */
  changedFiles?: readonly string[];
  /** base의 수집 데이터 (아이디당 진행중 개수 계산용) */
  existing: ProjectsData | null;
  github: GitHubClient;
  now: Date;
};

function parseList(text: string): { list: unknown[] | null; error: string | null } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      list: null,
      error: 'projects.json이 올바른 JSON이 아니에요 (쉼표, 따옴표를 확인해 주세요)',
    };
  }
  if (!Array.isArray(value)) return { list: null, error: 'projects.json은 [ ] 배열이어야 해요' };
  return { list: value, error: null };
}

export async function validateRegistration(input: ValidateInput): Promise<ValidationResult> {
  const warnings: string[] = [];
  const fileErrors: string[] = [];

  // 0. 등록 PR은 projects.json만 바꾼다 (경고만)
  const others = (input.changedFiles ?? []).filter((file) => file !== REGISTRY_FILE);
  if (others.length > 0) {
    warnings.push(
      `등록 PR이 아니에요: projects.json 외에 ${others.length}개 파일이 바뀌었어요 (${others.slice(0, 5).join(', ')})`,
    );
  }

  // 1. 올바른 JSON 문자열 배열인지
  const head = parseList(input.headText);
  if (!head.list) {
    return { ok: false, warnings, fileErrors: [head.error as string], repos: [] };
  }
  const nonStrings = head.list.filter((item) => typeof item !== 'string');
  if (nonStrings.length > 0)
    fileErrors.push('projects.json의 모든 항목은 "따옴표로 감싼 문자열"이어야 해요');

  const baseList = input.baseText ? (parseList(input.baseText).list ?? []) : [];
  const baseKeys = new Set(
    baseList.filter((item): item is string => typeof item === 'string').map((e) => e.toLowerCase()),
  );
  const headEntries = head.list.filter((item): item is string => typeof item === 'string');
  const added = headEntries.filter((entry) => !baseKeys.has(entry.toLowerCase()));

  // 진행중 개수: 기존 데이터 + 이번에 함께 추가되는 레포
  const activeByOwner = countActiveByOwner(input.existing?.projects ?? [], input.now);

  const repos: RepoResult[] = [];
  const seenInHead = new Map<string, number>();
  for (const entry of headEntries) {
    const key = entry.toLowerCase();
    seenInHead.set(key, (seenInHead.get(key) ?? 0) + 1);
  }

  for (const entry of added) {
    const reasons: string[] = [];
    const ref = parseRepoEntry(entry);
    if (!ref) {
      reasons.push('형식이 github.com/아이디/레포가 아니에요 (https://와 끝의 /는 빼 주세요)');
      repos.push({ entry, ok: false, reasons });
      continue;
    }

    // 2. 중복
    if ((seenInHead.get(entry.toLowerCase()) ?? 0) > 1) {
      reasons.push('명단에 같은 레포가 이미 있어요');
    }

    // 3~5. 레포 존재/공개, 커밋, VICO.md 스키마 (수집과 같은 규칙)
    const outcome = await collectRepo(entry, input.github, undefined, input.now.toISOString());
    if (outcome.kind === 'error') {
      reasons.push(outcome.reason);
      repos.push({ entry, ok: false, reasons });
      continue;
    }
    const project = outcome.project;

    // 6. 체크리스트 개수
    if (project.total < config.minChecklistItems) {
      reasons.push(
        `체크리스트 항목이 ${config.minChecklistItems}개 이상이어야 해요 (지금 ${project.total}개)`,
      );
    }

    // 7. 아이디당 진행중 개수
    if (isActive(getStatus(project, input.now))) {
      const owner = project.owner.toLowerCase();
      const count = (activeByOwner.get(owner) ?? 0) + 1;
      activeByOwner.set(owner, count);
      if (count > config.maxActivePerOwner) {
        reasons.push(
          `@${project.owner}의 진행중 프로젝트가 ${config.maxActivePerOwner}개를 넘어요 (추가하면 ${count}개). 하나를 완료하거나 중단으로 바꿔 주세요`,
        );
      }
    }

    repos.push({ entry, ok: reasons.length === 0, reasons });
  }

  const ok = fileErrors.length === 0 && repos.every((repo) => repo.ok);
  return { ok, warnings, fileErrors, repos };
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** PR 코멘트용 마크다운 */
export function toMarkdown(result: ValidationResult): string {
  const lines = [COMMENT_MARKER, `## Vico 등록 검사 ${result.ok ? '✅ 통과' : '❌ 실패'}`, ''];

  for (const warning of result.warnings) lines.push(`> ⚠️ ${warning}`, '');
  for (const error of result.fileErrors) lines.push(`- ❌ ${error}`);
  if (result.fileErrors.length > 0) lines.push('');

  if (result.repos.length === 0 && result.fileErrors.length === 0) {
    lines.push('새로 추가된 레포가 없어요.');
  } else if (result.repos.length > 0) {
    lines.push('| 레포 | 결과 | 고칠 점 |', '| --- | --- | --- |');
    for (const repo of result.repos) {
      lines.push(
        `| \`${escapeCell(repo.entry)}\` | ${repo.ok ? '✅' : '❌'} | ${repo.ok ? '' : escapeCell(repo.reasons.join(' / '))} |`,
      );
    }
  }

  lines.push(
    '',
    result.ok
      ? '관리자가 확인하고 머지하면 3시간 안에 Vico에 나타나요.'
      : 'VICO.md나 projects.json을 고쳐서 다시 push하면 이 코멘트가 새 결과로 바뀌어요.',
  );
  return `${lines.join('\n')}\n`;
}

function argValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env가 없으면 환경 변수만 쓴다.
  }
  const args = process.argv.slice(2);
  const basePath = argValue(args, '--base');
  const headPath = argValue(args, '--head') ?? 'projects.json';
  const changedPath = argValue(args, '--changed-files');
  const dataPath = argValue(args, '--data') ?? 'data/projects.data.json';
  const outPath = argValue(args, '--out');

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      'GITHUB_TOKEN이 필요해요. .env에 GITHUB_TOKEN=... 을 넣거나 환경 변수로 넘겨 주세요.',
    );
    process.exit(1);
  }

  const result = await validateRegistration({
    baseText: basePath && existsSync(basePath) ? readFileSync(basePath, 'utf8') : null,
    headText: readFileSync(headPath, 'utf8'),
    changedFiles: changedPath
      ? readFileSync(changedPath, 'utf8').split(/\r?\n/).filter(Boolean)
      : undefined,
    existing: existsSync(dataPath)
      ? projectsDataSchema.parse(JSON.parse(readFileSync(dataPath, 'utf8')))
      : null,
    github: withRetries(createOctokitClient(token), {
      ...defaultRetryOptions,
      retries: config.apiRetries,
    }),
    now: new Date(),
  });

  const markdown = toMarkdown(result);
  if (outPath) writeFileSync(outPath, markdown);
  process.stdout.write(markdown);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
