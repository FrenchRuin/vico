import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildSiteData, loadData } from '../lib/data';
import { DEFAULT_FILTER, filterProjects, tabCounts } from '../lib/filter';
import { getHighlight } from '../lib/similar';
import { CheckedStrip } from '../src/components/CheckedStrip';
import { formatDateTime } from '../src/components/Footer';
import { Hero } from '../src/components/Hero';
import { HighlightCard, justCompletedIndex } from '../src/components/HighlightCard';
import { Overview } from '../src/components/Overview';
import { ProjectBrowser } from '../src/components/ProjectBrowser';
import { makeProject, NOW, sampleOnlyDataDir } from './fixtures';

const { source, data } = loadData(NOW, sampleOnlyDataDir());
const site = buildSiteData(source, data, NOW);

describe('메인 화면 (예시 데이터)', () => {
  it('탭별 개수: 진행중 6, 팀원 모집 3, 완성작 2, 휴면 1', () => {
    expect(tabCounts(site.projects, DEFAULT_FILTER)).toEqual({
      ongoing: 6,
      recruit: 3,
      done: 2,
      dormant: 1,
    });
  });

  it('휴면 프로젝트는 진행중 탭에 없다', () => {
    const ongoing = filterProjects(site.projects, DEFAULT_FILTER);
    expect(ongoing.some((p) => p.status === 'dormant')).toBe(false);
  });

  it('첫 화면(서버 HTML)은 진행중 탭 카드 6개', () => {
    const html = renderToStaticMarkup(
      <ProjectBrowser projects={site.projects} nowIso={NOW.toISOString()} />,
    );
    expect(html.match(/<article/g)).toHaveLength(6);
    expect(html).toContain('aria-pressed="true"');
  });

  it('하이라이트 대상이 있고, 없으면 null이라 영역을 숨긴다', () => {
    expect(getHighlight(site.projects, NOW)?.repo).toBe('community-hot');
    expect(getHighlight([], NOW)).toBeNull();
  });
});

describe('HighlightCard', () => {
  it('방금 완료한 칸은 같은 텍스트의 완료 항목 중 마지막', () => {
    const project = makeProject({
      stages: [
        {
          name: null,
          items: [
            { text: '테스트', done: true },
            { text: '배포', done: true },
            { text: '테스트', done: true },
            { text: '홍보', done: false },
          ],
        },
      ],
      lastCompleted: { text: '테스트', at: NOW.toISOString() },
    });
    expect(justCompletedIndex(project)).toBe(2);
    expect(justCompletedIndex({ ...project, lastCompleted: null })).toBe(-1);
  });

  it('완료 상태면 진행률 대신 "완성!"', () => {
    const project = {
      ...makeProject({ lastCompleted: { text: 'a', at: NOW.toISOString() } }),
      status: 'done' as const,
    };
    const html = renderToStaticMarkup(<HighlightCard project={project} now={NOW} />);
    expect(html).toContain('완성!');
    expect(html).toContain('방금 완료: <span');
  });
});

describe('Footer', () => {
  it('한국 시간으로 표시한다', () => {
    expect(formatDateTime('2026-11-11T03:00:00.000Z')).toBe('2026년 11월 11일 12:00');
  });
});

describe('Hero', () => {
  it('하이라이트가 있으면 방금 완료 알약을 상세 링크로 보여주고, 없으면 숨긴다', () => {
    const highlight = {
      ...makeProject({
        title: '우리동네 날씨',
        lastCompleted: { text: '알림 화면', at: NOW.toISOString() },
      }),
      status: 'active' as const,
    };
    const withPill = renderToStaticMarkup(<Hero highlight={highlight} />);
    expect(withPill).toContain('방금 완료');
    expect(withPill).toContain('알림 화면');
    expect(withPill).toContain('href="/p/minji/app"');
    expect(renderToStaticMarkup(<Hero highlight={null} />)).not.toContain('방금 완료');
  });
});

describe('CheckedStrip', () => {
  it('대상이 없으면 아무것도 그리지 않는다', () => {
    expect(renderToStaticMarkup(<CheckedStrip projects={[]} />)).toBe('');
  });

  it('항목마다 상세 링크와 마지막 완료 항목을 보여준다', () => {
    const project = {
      ...makeProject({
        title: '독서 타이머',
        lastCompleted: { text: '책장 화면', at: NOW.toISOString() },
      }),
      status: 'active' as const,
    };
    const html = renderToStaticMarkup(<CheckedStrip projects={[project]} />);
    expect(html).toContain('href="/p/minji/app"');
    expect(html).toContain('독서 타이머 · 책장 화면');
  });
});

describe('Overview', () => {
  const stats = site.stats;

  it('등록 수를 크게 보여주고, 프로젝트 타일이 하나면 2열을 차지한다', () => {
    const recruit = {
      ...makeProject({ recruiting: true, lookingFor: ['디자이너'] }),
      status: 'active' as const,
    };
    const html = renderToStaticMarkup(
      <Overview stats={stats} highlight={null} recruiting={[recruit]} now={NOW} />,
    );
    expect(html).toContain(`>${stats.registered}</span>`);
    expect(html).toContain('찾는 사람:');
    expect(html.match(/lg:col-span-2/g)).toHaveLength(2);
  });

  it('프로젝트 타일이 없으면 숫자 타일이 2행을 차지하지 않는다', () => {
    const html = renderToStaticMarkup(
      <Overview stats={stats} highlight={null} recruiting={[]} now={NOW} />,
    );
    expect(html).not.toContain('lg:row-span-2');
  });
});
