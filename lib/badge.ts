// README 뱃지 (F-14). 마크다운은 여기서, SVG는 T11에서 추가한다.
import { config } from '../vico.config';

type RepoRef = { owner: string; repo: string };

export function badgeUrl({ owner, repo }: RepoRef, siteUrl: string = config.siteUrl): string {
  return `${siteUrl}/badge/${owner}/${repo}.svg`;
}

/** `[![vico](…/badge/{owner}/{repo}.svg)](…/p/{owner}/{repo})` */
export function badgeMarkdown(ref: RepoRef, siteUrl: string = config.siteUrl): string {
  return `[![vico](${badgeUrl(ref, siteUrl)})](${siteUrl}/p/${ref.owner}/${ref.repo})`;
}
