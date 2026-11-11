import { describe, expect, it } from 'vitest';
import {
  countActiveByOwner,
  daysSince,
  getDormantSince,
  getStatus,
  isActive,
  relativeDay,
  STATUS_LABEL,
} from '../lib/status';
import { ago, makeProject, NOW } from './fixtures';

describe('daysSince', () => {
  it('경과 시간을 내림한 일수', () => {
    expect(daysSince(ago(0, 23), NOW)).toBe(0);
    expect(daysSince(ago(1), NOW)).toBe(1);
    expect(daysSince(ago(14, 23), NOW)).toBe(14);
  });

  it('미래 시각은 0일', () => {
    expect(daysSince(ago(-2), NOW)).toBe(0);
  });
});

describe('getStatus: 날짜 경계', () => {
  it.each([
    [0, 0, 'active'],
    [14, 0, 'active'],
    [14, 23, 'active'],
    [15, 0, 'quiet'],
    [45, 0, 'quiet'],
    [45, 23, 'quiet'],
    [46, 0, 'dormant'],
    [200, 0, 'dormant'],
  ] as const)('%i일 %i시간 전 활동 → %s', (days, hours, expected) => {
    expect(getStatus(makeProject({ activityAt: ago(days, hours) }), NOW)).toBe(expected);
  });
});

describe('getStatus: 우선순위', () => {
  it('status: 완료면 오래돼도 완료', () => {
    expect(getStatus(makeProject({ declaredStatus: '완료', activityAt: ago(300) }), NOW)).toBe(
      'done',
    );
  });

  it('진행률 100%면 완료', () => {
    const project = makeProject({ done: 2, total: 2, progress: 100, activityAt: ago(100) });
    expect(getStatus(project, NOW)).toBe('done');
  });

  it('완료가 중단보다 먼저다', () => {
    const project = makeProject({ declaredStatus: '중단', done: 2, total: 2, progress: 100 });
    expect(getStatus(project, NOW)).toBe('done');
  });

  it('status: 중단이면 최근 활동이어도 휴면', () => {
    expect(getStatus(makeProject({ declaredStatus: '중단', activityAt: ago(0) }), NOW)).toBe(
      'dormant',
    );
  });

  it('체크박스가 0개면 진행률 100%로 완료 처리하지 않는다', () => {
    const project = makeProject({ stages: [], done: 0, total: 0, progress: 0 });
    expect(getStatus(project, NOW)).toBe('active');
  });
});

describe('getDormantSince', () => {
  it('날짜 기준 휴면: 활동일 + quietDays + 1일', () => {
    const activityAt = ago(100);
    const expected = new Date(new Date(activityAt).getTime() + 46 * 24 * 60 * 60 * 1000);
    expect(getDormantSince(makeProject({ activityAt }), NOW)?.toISOString()).toBe(
      expected.toISOString(),
    );
  });

  it('중단 프로젝트는 VICO.md 마지막 커밋 시각', () => {
    const project = makeProject({
      declaredStatus: '중단',
      vicoUpdatedAt: ago(10),
      activityAt: ago(1),
    });
    expect(getDormantSince(project, NOW)?.toISOString()).toBe(ago(10));
  });

  it('휴면이 아니면 null', () => {
    expect(getDormantSince(makeProject({ activityAt: ago(10) }), NOW)).toBeNull();
    expect(
      getDormantSince(makeProject({ declaredStatus: '완료', activityAt: ago(300) }), NOW),
    ).toBeNull();
  });
});

describe('isActive / countActiveByOwner', () => {
  it('활발과 잠잠만 진행중이다', () => {
    expect(isActive('active')).toBe(true);
    expect(isActive('quiet')).toBe(true);
    expect(isActive('dormant')).toBe(false);
    expect(isActive('done')).toBe(false);
  });

  it('아이디(대소문자 무시)별로 진행중 프로젝트만 센다', () => {
    const projects = [
      makeProject({ owner: 'Minji', repo: 'a' }),
      makeProject({ owner: 'minji', repo: 'b', activityAt: ago(20) }),
      makeProject({ owner: 'minji', repo: 'c', activityAt: ago(60) }),
      makeProject({ owner: 'minji', repo: 'd', declaredStatus: '완료' }),
      makeProject({ owner: 'hoon', repo: 'e' }),
    ];
    const counts = countActiveByOwner(projects, NOW);
    expect(counts.get('minji')).toBe(2);
    expect(counts.get('hoon')).toBe(1);
  });
});

describe('relativeDay', () => {
  it('0일이면 오늘, 그 외 N일 전', () => {
    expect(relativeDay(ago(0, 23), NOW)).toBe('오늘');
    expect(relativeDay(ago(1), NOW)).toBe('1일 전');
    expect(relativeDay(ago(32, 5), NOW)).toBe('32일 전');
  });
});

describe('STATUS_LABEL', () => {
  it('화면 표시용 한국어 이름', () => {
    expect(STATUS_LABEL).toEqual({ active: '활발', quiet: '잠잠', dormant: '휴면', done: '완료' });
  });
});
