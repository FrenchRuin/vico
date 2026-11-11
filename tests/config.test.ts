import { describe, expect, it } from 'vitest';
import { config } from '../vico.config';

describe('vico.config', () => {
  it('활발 기준이 잠잠 기준보다 짧다', () => {
    expect(config.activeDays).toBeLessThan(config.quietDays);
  });

  it('리마인더는 휴면 전에 간다', () => {
    expect(config.reminderDays).toBeGreaterThan(config.activeDays);
    expect(config.reminderDays).toBeLessThanOrEqual(config.quietDays);
  });

  it('모든 일수와 개수는 양의 정수다', () => {
    for (const value of [
      config.activeDays,
      config.quietDays,
      config.reminderDays,
      config.removeAfterDormantDays,
      config.removeAfterErrorDays,
      config.maxStepBarItems,
      config.maxActivePerOwner,
      config.minChecklistItems,
    ]) {
      expect(Number.isInteger(value) && value > 0).toBe(true);
    }
  });

  it('알려진 도구 이름이 대소문자/공백을 무시해도 겹치지 않는다', () => {
    const keys = config.knownTools.map((tool) => tool.toLowerCase().replace(/\s+/g, ''));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('사이트 주소는 https이고 끝 슬래시가 없다', () => {
    expect(config.siteUrl).toMatch(/^https:\/\/[^/]+$/);
  });
});
