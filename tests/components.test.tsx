import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ProjectView } from '../lib/data';
import { AVATAR_COLORS, avatarColorIndex, avatarInitials } from '../src/components/Avatar';
import { StatusBadge } from '../src/components/Badges';
import { nextTaskText, ProjectCard } from '../src/components/ProjectCard';
import { StepBar } from '../src/components/StepBar';
import { makeProject, NOW } from './fixtures';

function view(overrides: Partial<ProjectView> = {}): ProjectView {
  return { ...makeProject(overrides), status: 'active', ...overrides };
}

describe('Avatar', () => {
  it('영문/숫자 앞 2글자를 대문자로', () => {
    expect(avatarInitials('minji-dev')).toBe('MI');
    expect(avatarInitials('a')).toBe('A');
    expect(avatarInitials('-_-')).toBe('?');
  });

  it('같은 아이디는 대소문자와 상관없이 같은 색', () => {
    expect(avatarColorIndex('Minji')).toBe(avatarColorIndex('minji'));
    for (const id of ['a', 'hoon', 'seoyeon', 'jun-k']) {
      expect(avatarColorIndex(id)).toBeLessThan(AVATAR_COLORS.length);
    }
  });
});

describe('StatusBadge', () => {
  it('상태 이름과 덧붙인 말', () => {
    expect(renderToStaticMarkup(<StatusBadge status="quiet" suffix="3일 전" />)).toContain(
      '잠잠 · 3일 전',
    );
  });
});

describe('StepBar', () => {
  it('항목 수만큼 칸을 그리고 aria-label을 단다', () => {
    const html = renderToStaticMarkup(<StepBar items={[true, false, true]} status="active" />);
    expect(html).toContain('aria-label="체크리스트 3개 중 2개 완료"');
    expect(html.match(/<span/g)).toHaveLength(3);
  });

  it('20개를 넘으면 일반 진행률 바', () => {
    const items = Array.from({ length: 21 }, (_, i) => i < 7);
    const html = renderToStaticMarkup(<StepBar items={items} status="active" />);
    expect(html).not.toContain('<span');
    expect(html).toContain('width:33.33');
  });

  it('항목이 없으면 빈 진행률 바', () => {
    const html = renderToStaticMarkup(<StepBar items={[]} status="active" />);
    expect(html).toContain('체크리스트 0개 중 0개 완료');
    expect(html).toContain('width:0%');
  });
});

describe('ProjectCard', () => {
  it('다음 할 일 문구', () => {
    expect(nextTaskText({ total: 0, nextTask: null })).toBe('체크리스트가 비어 있어요');
    expect(nextTaskText({ total: 3, nextTask: null })).toBe('체크리스트 완료');
    expect(nextTaskText({ total: 3, nextTask: '로그인' })).toBe('다음 할 일: 로그인');
  });

  it('상세 링크, 프로필 링크, 상태, 진행률을 보여준다', () => {
    const html = renderToStaticMarkup(<ProjectCard project={view()} now={NOW} />);
    expect(html).toContain('href="/p/minji/app"');
    expect(html).toContain('href="/u/minji"');
    expect(html).toContain('활발 · 오늘');
    expect(html).toContain('50%');
  });

  it('휴면이면 모집 중이어도 모집 뱃지를 숨긴다', () => {
    const recruiting = view({ recruiting: true });
    expect(renderToStaticMarkup(<ProjectCard project={recruiting} now={NOW} />)).toContain(
      '모집 중',
    );
    const dormant = view({ recruiting: true, status: 'dormant' });
    expect(renderToStaticMarkup(<ProjectCard project={dormant} now={NOW} />)).not.toContain(
      '모집 중',
    );
  });
});
