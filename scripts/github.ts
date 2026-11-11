// GitHub API 접근. 스크립트는 이 인터페이스만 쓰고, 테스트에서는 가짜 구현을 넣는다.
import { Octokit } from '@octokit/rest';

export type RepoInfo = {
  /** API가 돌려준 실제 표기 */
  owner: string;
  repo: string;
  private: boolean;
  stars: number;
  language: string | null;
  defaultBranch: string;
};

export interface GitHubClient {
  /** 없으면 null */
  getRepo(owner: string, repo: string): Promise<RepoInfo | null>;
  /** 기본 브랜치(또는 path를 건드린) 마지막 커밋 시각. 커밋이 없으면 null */
  getLastCommitAt(owner: string, repo: string, path?: string): Promise<string | null>;
  /** 파일 내용(UTF-8). 없으면 null */
  getFile(owner: string, repo: string, path: string): Promise<string | null>;
}

type HttpError = { status?: number; response?: { headers?: Record<string, string | undefined> } };

function isNotFound(error: unknown): boolean {
  const status = (error as HttpError)?.status;
  // 빈 레포의 커밋 목록은 409를 돌려준다.
  return status === 404 || status === 409;
}

export function createOctokitClient(token: string): GitHubClient {
  const octokit = new Octokit({ auth: token, userAgent: 'vico-collect' });

  return {
    async getRepo(owner, repo) {
      try {
        const { data } = await octokit.rest.repos.get({ owner, repo });
        return {
          owner: data.owner.login,
          repo: data.name,
          private: data.private,
          stars: data.stargazers_count,
          language: data.language ?? null,
          defaultBranch: data.default_branch,
        };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async getLastCommitAt(owner, repo, path) {
      try {
        const { data } = await octokit.rest.repos.listCommits({
          owner,
          repo,
          per_page: 1,
          ...(path ? { path } : {}),
        });
        const commit = data[0]?.commit;
        return commit?.committer?.date ?? commit?.author?.date ?? null;
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async getFile(owner, repo, path) {
      try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) return null;
        return Buffer.from(data.content, 'base64').toString('utf8');
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
  };
}

export type RetryOptions = {
  retries: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** 레이트 리밋 대기 최대 시간 (이보다 길면 기다리지 않고 실패) */
  maxWaitMs: number;
};

export const defaultRetryOptions: RetryOptions = {
  retries: 2,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
  maxWaitMs: 5 * 60 * 1000,
};

/** 레이트 리밋이면 기다릴 시간(ms), 아니면 null. */
export function rateLimitWait(error: unknown, now: number): number | null {
  const { status, response } = (error as HttpError) ?? {};
  const headers = response?.headers ?? {};
  if (status !== 403 && status !== 429) return null;
  const retryAfter = Number(headers['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  if (headers['x-ratelimit-remaining'] === '0') {
    const reset = Number(headers['x-ratelimit-reset']) * 1000;
    return Number.isFinite(reset) ? Math.max(0, reset - now) + 1000 : 60_000;
  }
  return status === 429 ? 60_000 : null;
}

function isRetryable(error: unknown): boolean {
  const status = (error as HttpError)?.status;
  return status === undefined || status >= 500;
}

/** 5xx/네트워크 오류는 바로, 레이트 리밋은 기다렸다가 다시 시도한다. */
export async function withRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions = defaultRetryOptions,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= options.retries) throw error;
      const wait = rateLimitWait(error, options.now());
      if (wait !== null) {
        if (wait > options.maxWaitMs) throw error;
        await options.sleep(wait);
      } else if (isRetryable(error)) {
        await options.sleep(1000 * 2 ** attempt);
      } else {
        throw error;
      }
    }
  }
}

/** 클라이언트의 모든 호출에 재시도를 씌운다. */
export function withRetries(
  client: GitHubClient,
  options: RetryOptions = defaultRetryOptions,
): GitHubClient {
  return {
    getRepo: (owner, repo) => withRetry(() => client.getRepo(owner, repo), options),
    getLastCommitAt: (owner, repo, path) =>
      withRetry(() => client.getLastCommitAt(owner, repo, path), options),
    getFile: (owner, repo, path) => withRetry(() => client.getFile(owner, repo, path), options),
  };
}

/** 동시에 최대 limit개씩 실행하고 입력 순서대로 결과를 돌려준다. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index] as T, index);
    }
  });
  await Promise.all(workers);
  return results;
}
