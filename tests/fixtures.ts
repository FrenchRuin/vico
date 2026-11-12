import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Project } from '../lib/schema';

/**
 * sample.data.json만 들어 있는 임시 data 폴더.
 * 실제 data/에 수집 데이터(projects.data.json)가 있어도 예시 데이터로 테스트하기 위함.
 */
export function sampleOnlyDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'vico-sample-'));
  copyFileSync(join(process.cwd(), 'data', 'sample.data.json'), join(dir, 'sample.data.json'));
  return dir;
}

export const NOW = new Date('2026-11-11T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

/** NOW 기준 days일 hours시간 전의 ISO 시각. */
export function ago(days: number, hours = 0): string {
  return new Date(NOW.getTime() - days * DAY - hours * 60 * 60 * 1000).toISOString();
}

/** 테스트용 프로젝트. 기본은 오늘 활동한 진행중 프로젝트(1/2 완료). */
export function makeProject(overrides: Partial<Project> = {}): Project {
  const owner = overrides.owner ?? 'minji';
  const repo = overrides.repo ?? 'app';
  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
    title: '테스트 프로젝트',
    summary: '테스트용',
    tools: ['Claude Code'],
    declaredStatus: '진행중',
    recruiting: false,
    lookingFor: [],
    contact: null,
    demo: null,
    stages: [
      {
        name: null,
        items: [
          { text: 'a', done: true },
          { text: 'b', done: false },
        ],
      },
    ],
    done: 1,
    total: 2,
    progress: 50,
    nextTask: 'b',
    lastCompleted: null,
    stars: 0,
    language: 'TypeScript',
    lastCommitAt: ago(0),
    vicoUpdatedAt: ago(0),
    activityAt: ago(0),
    registeredAt: ago(30),
    ...overrides,
  };
}
