// README 뱃지 (F-14). 마크다운과 SVG. 모양은 docs/design.md 3.5.
import { config } from '../vico.config';
import { type ActivityStatus, STATUS_LABEL } from './status';

type RepoRef = { owner: string; repo: string };

export function badgeUrl({ owner, repo }: RepoRef, siteUrl: string = config.siteUrl): string {
  return `${siteUrl}/badge/${owner}/${repo}.svg`;
}

/** `[![vico](…/badge/{owner}/{repo}.svg)](…/p/{owner}/{repo})` */
export function badgeMarkdown(ref: RepoRef, siteUrl: string = config.siteUrl): string {
  return `[![vico](${badgeUrl(ref, siteUrl)})](${siteUrl}/p/${ref.owner}/${ref.repo})`;
}

/** 오른쪽 배경색. 흰 글자 대비 4.5:1 이상 (design.md 3.5). */
export const BADGE_COLOR: Record<ActivityStatus, string> = {
  active: '#4F46E5',
  quiet: '#8A5A00',
  dormant: '#6B7280',
  done: '#1F7A3E',
};

const LEFT_COLOR = '#111827';
const LEFT_TEXT = 'vico';
const HEIGHT = 20;
const PADDING_X = 6;

/**
 * Verdana 11px 기준 글자 폭 추정 (SVG 안에서는 웹폰트를 쓰지 않는다).
 * 한글은 정사각형에 가까워 영문보다 넓게 잡는다.
 */
export function textWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    if (/[ㄱ-ㆎ가-힣]/.test(char)) width += 11;
    else if (char === '%') width += 10;
    else if (/[0-9]/.test(char)) width += 7;
    else if (/[mwMW]/.test(char)) width += 10;
    else if (/[iljtfI.,:;!|'·]/.test(char)) width += 4;
    else if (char === ' ') width += 4;
    else width += 7;
  }
  return width;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 높이 20px, 왼쪽 "vico", 오른쪽 "{progress}% · {상태}". */
export function badgeSvg({
  progress,
  status,
}: {
  progress: number;
  status: ActivityStatus;
}): string {
  const label = STATUS_LABEL[status];
  const right = `${progress}% · ${label}`;
  const title = `Vico 진행률 ${progress}% ${label}`;
  const leftWidth = textWidth(LEFT_TEXT) + PADDING_X * 2;
  const rightWidth = textWidth(right) + PADDING_X * 2;
  const width = leftWidth + rightWidth;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" role="img" aria-label="${escapeXml(title)}">`,
    `<title>${escapeXml(title)}</title>`,
    `<clipPath id="r"><rect width="${width}" height="${HEIGHT}" rx="3" fill="#fff"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${leftWidth}" height="${HEIGHT}" fill="${LEFT_COLOR}"/>`,
    `<rect x="${leftWidth}" width="${rightWidth}" height="${HEIGHT}" fill="${BADGE_COLOR[status]}"/>`,
    `</g>`,
    `<g fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" font-size="11">`,
    `<text x="${leftWidth / 2}" y="14">${LEFT_TEXT}</text>`,
    `<text x="${leftWidth + rightWidth / 2}" y="14">${escapeXml(right)}</text>`,
    `</g>`,
    `</svg>`,
  ].join('');
}
