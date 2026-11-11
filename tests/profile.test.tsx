import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildSiteData, getOwnerProfile, loadData, type ProjectView } from '../lib/data';
import { getStatus } from '../lib/status';
import { formatMonth, ProfileBanner } from '../src/components/Profile';
import { config } from '../vico.config';
import { ago, makeProject, NOW } from './fixtures';

function view(overrides: Parameters<typeof makeProject>[0] = {}): ProjectView {
  const project = makeProject(overrides);
  return { ...project, status: getStatus(project, NOW) };
}

describe('getOwnerProfile', () => {
  const projects = [
    view({ owner: 'Minji', repo: 'q', activityAt: ago(20), stars: 3, registeredAt: ago(40) }),
    view({ owner: 'minji', repo: 'a', activityAt: ago(2), stars: 5, registeredAt: ago(90) }),
    view({ owner: 'minji', repo: 'd', declaredStatus: '완료', stars: 10 }),
    view({ owner: 'minji', repo: 's', activityAt: ago(70) }),
    view({ owner: 'hoon', repo: 'x', stars: 100 }),
  ];

  it('진행중(활발 먼저), 완성작, 휴면으로 나누고 스타를 더한다', () => {
    const profile = getOwnerProfile(projects, 'MINJI');
    expect(profile?.ongoing.map((p) => p.repo)).toEqual(['a', 'q']);
    expect(profile?.done.map((p) => p.repo)).toEqual(['d']);
    expect(profile?.dormant.map((p) => p.repo)).toEqual(['s']);
    expect(profile?.totalStars).toBe(18);
    expect(profile?.since).toBe(ago(90));
  });

  it('프로젝트가 없으면 null', () => {
    expect(getOwnerProfile(projects, 'nobody')).toBeNull();
  });
});

describe('프로필 화면', () => {
  it('시작한 달은 한국 시간 기준', () => {
    expect(formatMonth('2026-08-31T16:00:00.000Z')).toBe('2026년 9월');
  });

  it('진행중 3개를 채운 아이디(minji-dev)는 "하나 더 올리기" 자리가 없다', () => {
    const { source, data } = loadData(NOW, join(process.cwd(), 'data'));
    const site = buildSiteData(source, data, NOW);
    const full = getOwnerProfile(site.projects, 'minji-dev');
    const partial = getOwnerProfile(site.projects, 'hoon');
    expect(full?.ongoing).toHaveLength(config.maxActivePerOwner);
    expect(config.maxActivePerOwner - (partial?.ongoing.length ?? 0)).toBeGreaterThan(0);
  });

  it('배너에 "진행중 N / 3"과 GitHub 링크', () => {
    const profile = getOwnerProfile([view({ owner: 'hoon' })], 'hoon');
    if (!profile) throw new Error('profile');
    const html = renderToStaticMarkup(<ProfileBanner profile={profile} maxActive={3} />);
    expect(html).toContain('1 / 3');
    expect(html).toContain('href="https://github.com/hoon"');
    expect(html).toContain('부터 Vico에서 만드는 중');
  });
});
