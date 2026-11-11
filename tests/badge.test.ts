import { describe, expect, it } from 'vitest';
import { BADGE_COLOR, badgeMarkdown, badgeSvg, badgeUrl, textWidth } from '../lib/badge';
import type { ActivityStatus } from '../lib/status';

const STATUSES: ActivityStatus[] = ['active', 'quiet', 'dormant', 'done'];

/** WCAG 상대 휘도 대비 */
function contrastWithWhite(hex: string): number {
  const channel = (i: number) => {
    const v = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  return 1.05 / (luminance + 0.05);
}

describe('badgeMarkdown', () => {
  it('spec F-14의 마크다운 형식', () => {
    expect(badgeUrl({ owner: 'a', repo: 'b' }, 'https://x.dev')).toBe(
      'https://x.dev/badge/a/b.svg',
    );
    expect(badgeMarkdown({ owner: 'a', repo: 'b' }, 'https://x.dev')).toBe(
      '[![vico](https://x.dev/badge/a/b.svg)](https://x.dev/p/a/b)',
    );
  });
});

describe('badgeSvg', () => {
  it.each(STATUSES)('상태별 SVG 스냅샷: %s', (status) => {
    expect(badgeSvg({ progress: 60, status })).toMatchSnapshot();
  });

  it('높이 20, 상태 색, 제목, 오른쪽 문구', () => {
    const svg = badgeSvg({ progress: 60, status: 'active' });
    expect(svg).toContain('height="20"');
    expect(svg).toContain(`fill="${BADGE_COLOR.active}"`);
    expect(svg).toContain('<title>Vico 진행률 60% 활발</title>');
    expect(svg).toContain('>60% · 활발</text>');
    expect(svg).toContain('font-family="Verdana,sans-serif"');
  });

  it('진행률 자릿수에 따라 폭이 늘어난다', () => {
    const width = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1]);
    expect(width(badgeSvg({ progress: 100, status: 'done' }))).toBeGreaterThan(
      width(badgeSvg({ progress: 5, status: 'done' })),
    );
  });

  it('한글은 영문보다 넓게 잡는다', () => {
    expect(textWidth('활발')).toBeGreaterThan(textWidth('ab'));
  });

  it('모든 상태 배경색이 흰 글자 대비 4.5:1 이상', () => {
    for (const status of STATUSES) {
      expect(contrastWithWhite(BADGE_COLOR[status])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
