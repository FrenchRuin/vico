// projects.json 항목 형식. 규칙은 docs/spec.md 6절.

export type RepoRef = { owner: string; repo: string };

/** GitHub 아이디/레포 이름에 쓸 수 있는 글자로만 된 `github.com/{owner}/{repo}` */
const ENTRY_PATTERN = /^github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})$/;

/** `github.com/{owner}/{repo}` (https:// 없이, 끝 슬래시 없이)를 읽는다. 형식이 틀리면 null. */
export function parseRepoEntry(entry: string): RepoRef | null {
  const match = ENTRY_PATTERN.exec(entry);
  if (!match?.[1] || !match[2]) return null;
  if (match[2] === '.' || match[2] === '..' || match[2].endsWith('.git')) return null;
  return { owner: match[1], repo: match[2] };
}

/** 대소문자를 무시한 비교 키 */
export function repoKey({ owner, repo }: RepoRef): string {
  return `${owner}/${repo}`.toLowerCase();
}

export function toEntry({ owner, repo }: RepoRef): string {
  return `github.com/${owner}/${repo}`;
}
