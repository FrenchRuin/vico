import type { GitHubClient, RepoInfo } from '../scripts/github';

/** 테스트용 VICO.md */
export const VICO = (body = '## 개발\n- [x] 첫 화면\n- [ ] 로그인\n- [ ] 배포') => `---
title: 테스트 앱
summary: 수집 테스트
tools: [claude code]
status: 진행중
---
${body}
`;

export type FakeRepo = Partial<RepoInfo> & {
  vico?: string | null;
  lastCommitAt?: string | null;
  vicoUpdatedAt?: string | null;
  fail?: { status?: number };
};

/** owner/repo(소문자) → 가짜 레포 */
export function fakeGitHub(repos: Record<string, FakeRepo>): GitHubClient & { calls: number } {
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
