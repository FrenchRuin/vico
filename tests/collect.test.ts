import { describe, expect, it } from 'vitest';
import { parseRepoEntry, repoKey, toEntry } from '../lib/registry';
import { projectsDataSchema } from '../lib/schema';
import { collect, isSameData } from '../scripts/collect';
import {
  type GitHubClient,
  mapLimit,
  type RepoInfo,
  rateLimitWait,
  withRetry,
} from '../scripts/github';
import { NOW } from './fixtures';

const VICO = (body = '## 개발\n- [x] 첫 화면\n- [ ] 로그인\n- [ ] 배포') => `---
title: 테스트 앱
summary: 수집 테스트
tools: [claude code]
status: 진행중
---
${body}
`;

type FakeRepo = Partial<RepoInfo> & {
  vico?: string | null;
  lastCommitAt?: string | null;
  vicoUpdatedAt?: string | null;
  fail?: { status?: number };
};

/** owner/repo(소문자) → 가짜 레포 */
function fakeGitHub(repos: Record<string, FakeRepo>): GitHubClient & { calls: number } {
  const find = (owner: string, repo: string) => repos[`${owner}/${repo}`.toLowerCase()];
  const client = {
    calls: 0,
    async getRepo(owner: string, repo: string) {
      client.calls += 1;
      const r = find(owner, repo);
      if (!r) return null;
      if (r.fail) throw Object.assign(new Error('boom'), r.fail);
      return {
        owner: r.owner ?? owner,
        repo: r.repo ?? repo,
        private: r.private ?? false,
        stars: r.stars ?? 1,
        language: r.language ?? 'TypeScript',
        defaultBranch: 'main',
      };
    },
    async getLastCommitAt(owner: string, repo: string, path?: string) {
      const r = find(owner, repo);
      if (path) return r?.vicoUpdatedAt === undefined ? '2026-11-09T00:00:00Z' : r.vicoUpdatedAt;
      return r?.lastCommitAt === undefined ? '2026-11-10T00:00:00Z' : r.lastCommitAt;
    },
    async getFile(owner: string, repo: string) {
      const r = find(owner, repo);
      return r?.vico === undefined ? VICO() : r.vico;
    },
  };
  return client;
}

async function run(entries: unknown[], repos: Record<string, FakeRepo>, previous = null as never) {
  return collect({ entries, previous, github: fakeGitHub(repos), now: NOW });
}

describe('registry', () => {
  it('github.com/owner/repo 형식만 받는다', () => {
    expect(parseRepoEntry('github.com/minji-dev/app.web')).toEqual({
      owner: 'minji-dev',
      repo: 'app.web',
    });
    for (const bad of [
      'https://github.com/a/b',
      'github.com/a/b/',
      'github.com/a',
      'gitlab.com/a/b',
      'github.com/-a/b',
      'github.com/a/b.git',
      'github.com/a/..',
    ]) {
      expect(parseRepoEntry(bad)).toBeNull();
    }
    expect(repoKey({ owner: 'A', repo: 'B' })).toBe('a/b');
    expect(toEntry({ owner: 'a', repo: 'b' })).toBe('github.com/a/b');
  });
});

describe('collect: 정상', () => {
  it('VICO.md를 읽어 프로젝트를 만든다', async () => {
    const data = await run(['github.com/minji/app'], {
      'minji/app': { owner: 'Minji', repo: 'App', stars: 12 },
    });
    expect(projectsDataSchema.safeParse(data).success).toBe(true);
    expect(data.errors).toEqual([]);
    expect(data.projects[0]).toMatchObject({
      owner: 'Minji',
      repo: 'App',
      url: 'https://github.com/Minji/App',
      tools: ['Claude Code'],
      done: 1,
      total: 3,
      progress: 33,
      nextTask: '로그인',
      stars: 12,
      lastCommitAt: '2026-11-10T00:00:00Z',
      vicoUpdatedAt: '2026-11-09T00:00:00Z',
      activityAt: '2026-11-10T00:00:00Z',
      registeredAt: NOW.toISOString(),
      lastCompleted: null,
    });
  });

  it('활동일은 둘 중 최신 (VICO.md가 더 최근이면 그쪽)', async () => {
    const data = await run(['github.com/a/b'], {
      'a/b': { lastCommitAt: '2026-11-01T00:00:00Z', vicoUpdatedAt: '2026-11-05T00:00:00Z' },
    });
    expect(data.projects[0]?.activityAt).toBe('2026-11-05T00:00:00Z');
  });

  it('projects.json 순서를 따르고 중복(대소문자 무시)은 한 번만', async () => {
    const data = await run(['github.com/b/two', 'github.com/a/one', 'github.com/B/Two'], {
      'a/one': {},
      'b/two': {},
    });
    expect(data.projects.map((p) => p.repo)).toEqual(['two', 'one']);
  });

  it('동시 요청은 concurrency개를 넘지 않는다', async () => {
    let inFlight = 0;
    let peak = 0;
    const base = fakeGitHub({});
    const github: GitHubClient = {
      ...base,
      async getRepo(owner, repo) {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return { owner, repo, private: false, stars: 0, language: null, defaultBranch: 'main' };
      },
    };
    const entries = Array.from({ length: 12 }, (_, i) => `github.com/u/r${i}`);
    await collect({ entries, previous: null, github, now: NOW, concurrency: 5 });
    expect(peak).toBe(5);
  });
});

describe('collect: 실패', () => {
  it.each([
    ['레포 없음', {}, '레포를 찾을 수 없어요'],
    ['비공개', { 'a/b': { private: true } }, '비공개 레포예요'],
    ['VICO.md 없음', { 'a/b': { vico: null } }, 'VICO.md가 없어요'],
    ['frontmatter 오류', { 'a/b': { vico: '---\ntitle: x\n---\n' } }, 'VICO.md 형식 오류: summary'],
    ['커밋 없음', { 'a/b': { lastCommitAt: null } }, '커밋 기록을 읽을 수 없어요'],
  ] as const)('%s → errors에 넣고 projects에서 뺀다', async (_, repos, reason) => {
    const data = await run(['github.com/a/b'], repos as Record<string, FakeRepo>);
    expect(data.projects).toEqual([]);
    expect(data.errors).toEqual([
      { repo: 'github.com/a/b', reason: expect.stringContaining(reason), since: NOW.toISOString() },
    ]);
  });

  it('형식이 틀린 항목과 문자열이 아닌 항목도 오류로 남긴다', async () => {
    const data = await run(['https://github.com/a/b', 42], {});
    expect(data.errors.map((e) => e.reason)).toEqual([
      '형식이 github.com/아이디/레포가 아니에요',
      '형식이 github.com/아이디/레포가 아니에요',
    ]);
  });
});

describe('collect: 이전 데이터 이어받기', () => {
  async function twoRuns(firstBody: string, secondBody: string) {
    const first = await run(['github.com/a/b'], { 'a/b': { vico: VICO(firstBody) } });
    const later = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
    const second = await collect({
      entries: ['github.com/a/b'],
      previous: first,
      github: fakeGitHub({ 'a/b': { vico: VICO(secondBody) } }),
      now: later,
    });
    return { first, second, later };
  }

  it('첫 수집에서는 이미 체크된 항목이 있어도 lastCompleted가 null', async () => {
    const data = await run(['github.com/a/b'], {
      'a/b': { vico: VICO('- [x] a\n- [x] b\n- [ ] c') },
    });
    expect(data.projects[0]?.lastCompleted).toBeNull();
  });

  it('새로 체크된 항목(여러 개면 가장 아래)을 lastCompleted로, registeredAt은 유지', async () => {
    const { second, later } = await twoRuns(
      '- [ ] a\n- [ ] b\n- [ ] c',
      '- [x] a\n- [x] b\n- [ ] c',
    );
    expect(second.projects[0]?.lastCompleted).toEqual({ text: 'b', at: later.toISOString() });
    expect(second.projects[0]?.registeredAt).toBe(NOW.toISOString());
  });

  it('새로 체크된 게 없으면 이전 lastCompleted를 유지', async () => {
    const { second } = await twoRuns('- [ ] a\n- [ ] b\n- [ ] c', '- [x] a\n- [ ] b\n- [ ] c');
    const third = await collect({
      entries: ['github.com/a/b'],
      previous: second,
      github: fakeGitHub({ 'a/b': { vico: VICO('- [x] a\n- [ ] b\n- [ ] c\n- [ ] d') } }),
      now: new Date(NOW.getTime() + 6 * 60 * 60 * 1000),
    });
    expect(third.projects[0]?.lastCompleted).toEqual(second.projects[0]?.lastCompleted);
  });

  it('연속 실패는 처음 실패한 시각(since)을 유지한다', async () => {
    const first = await run(['github.com/a/b'], {});
    const second = await collect({
      entries: ['github.com/a/b'],
      previous: first,
      github: fakeGitHub({}),
      now: new Date(NOW.getTime() + 3 * 60 * 60 * 1000),
    });
    expect(second.errors[0]?.since).toBe(NOW.toISOString());
  });

  it('API 오류면 오류를 기록하되 이전 프로젝트를 유지한다', async () => {
    const first = await run(['github.com/a/b'], { 'a/b': {} });
    const second = await collect({
      entries: ['github.com/a/b'],
      previous: first,
      github: fakeGitHub({ 'a/b': { fail: { status: 502 } } }),
      now: new Date(NOW.getTime() + 3 * 60 * 60 * 1000),
    });
    expect(second.projects).toEqual(first.projects);
    expect(second.errors[0]?.reason).toBe('GitHub API 오류 (502)');
  });

  it('generatedAt만 다르면 같은 데이터로 본다', async () => {
    const { first, second } = await twoRuns(
      '- [ ] a\n- [ ] b\n- [ ] c',
      '- [ ] a\n- [ ] b\n- [ ] c',
    );
    expect(isSameData(first, second)).toBe(true);
    expect(isSameData(null, second)).toBe(false);
    const changed = { ...second, projects: second.projects.map((p) => ({ ...p, stars: 99 })) };
    expect(isSameData(first, changed)).toBe(false);
  });
});

describe('github 도우미', () => {
  const noSleep = { sleep: async () => {}, now: () => 0, maxWaitMs: 10_000 };

  it('5xx는 2번까지 재시도', async () => {
    let calls = 0;
    const task = async () => {
      calls += 1;
      if (calls < 3) throw Object.assign(new Error('x'), { status: 503 });
      return 'ok';
    };
    await expect(withRetry(task, { retries: 2, ...noSleep })).resolves.toBe('ok');
    expect(calls).toBe(3);
  });

  it('재시도를 다 쓰면 실패, 4xx(레이트 리밋 아님)는 바로 실패', async () => {
    let calls = 0;
    const always503 = async () => {
      calls += 1;
      throw Object.assign(new Error('x'), { status: 503 });
    };
    await expect(withRetry(always503, { retries: 2, ...noSleep })).rejects.toThrow();
    expect(calls).toBe(3);

    let badCalls = 0;
    const bad = async () => {
      badCalls += 1;
      throw Object.assign(new Error('x'), { status: 422 });
    };
    await expect(withRetry(bad, { retries: 2, ...noSleep })).rejects.toThrow();
    expect(badCalls).toBe(1);
  });

  it('레이트 리밋은 retry-after / reset까지 기다린다', () => {
    expect(rateLimitWait({ status: 429, response: { headers: { 'retry-after': '3' } } }, 0)).toBe(
      3000,
    );
    expect(
      rateLimitWait(
        {
          status: 403,
          response: { headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '10' } },
        },
        4000,
      ),
    ).toBe(7000);
    expect(rateLimitWait({ status: 403, response: { headers: {} } }, 0)).toBeNull();
  });

  it('너무 오래 기다려야 하면 기다리지 않고 실패', async () => {
    const waited: number[] = [];
    const task = async () => {
      throw Object.assign(new Error('x'), {
        status: 429,
        response: { headers: { 'retry-after': '600' } },
      });
    };
    await expect(
      withRetry(task, {
        retries: 2,
        sleep: async (ms) => void waited.push(ms),
        now: () => 0,
        maxWaitMs: 60_000,
      }),
    ).rejects.toThrow();
    expect(waited).toEqual([]);
  });

  it('mapLimit은 입력 순서대로 결과를 돌려준다', async () => {
    const out = await mapLimit([30, 10, 20], 2, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms));
      return i;
    });
    expect(out).toEqual([0, 1, 2]);
  });
});
