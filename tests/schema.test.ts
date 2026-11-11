import { describe, expect, it } from 'vitest';
import {
  frontmatterSchema,
  normalizeTool,
  normalizeTools,
  projectSchema,
  projectsDataSchema,
} from '../lib/schema';

const base = {
  title: '커뮤니티 인기글 모아보기',
  summary: '국내 커뮤니티 인기글을 한곳에서 보는 앱',
  tools: ['Claude Code'],
  status: '진행중',
};

/** gray-matter가 템플릿의 빈 값(`contact:`)을 읽으면 null이 된다. */
const templateLike = {
  title: '내 프로젝트 이름',
  summary: '이 프로젝트가 무엇을 하는지 한 줄로',
  tools: ['Claude Code'],
  status: '진행중',
  recruiting: false,
  looking_for: [],
  contact: null,
  demo: null,
};

function errorsOf(input: unknown): string[] {
  const result = frontmatterSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

describe('normalizeTool', () => {
  it('대소문자와 공백을 무시하고 알려진 이름으로 맞춘다', () => {
    expect(normalizeTool('claude code')).toBe('Claude Code');
    expect(normalizeTool('  CLAUDECODE ')).toBe('Claude Code');
    expect(normalizeTool('github copilot')).toBe('GitHub Copilot');
    expect(normalizeTool('V0')).toBe('v0');
  });

  it('알려지지 않은 도구는 앞뒤 공백만 지운다', () => {
    expect(normalizeTool('  Gemini CLI ')).toBe('Gemini CLI');
  });

  it('정규화 후 중복을 하나로 합치고 순서는 유지한다', () => {
    expect(normalizeTools(['cursor', 'Claude Code', 'Cursor', 'claude code'])).toEqual([
      'Cursor',
      'Claude Code',
    ]);
  });
});

describe('frontmatterSchema: 통과', () => {
  it('spec 예시가 통과한다', () => {
    const result = frontmatterSchema.parse({
      ...base,
      tools: ['Claude Code', 'Cursor'],
      recruiting: true,
      looking_for: ['프론트엔드 1명', '디자이너'],
      contact: 'discord: minji_dev',
      demo: 'https://example.com',
    });
    expect(result.recruiting).toBe(true);
    expect(result.looking_for).toEqual(['프론트엔드 1명', '디자이너']);
  });

  it('템플릿 그대로(빈 값, 빈 배열)도 통과한다', () => {
    const result = frontmatterSchema.parse(templateLike);
    expect(result.contact).toBeNull();
    expect(result.demo).toBeNull();
    expect(result.looking_for).toEqual([]);
  });

  it('선택 필드를 아예 빼도 기본값이 채워진다', () => {
    const result = frontmatterSchema.parse(base);
    expect(result).toMatchObject({ recruiting: false, looking_for: [], contact: null, demo: null });
  });

  it('status의 공백을 무시한다', () => {
    expect(frontmatterSchema.parse({ ...base, status: '진행 중' }).status).toBe('진행중');
    expect(frontmatterSchema.parse({ ...base, status: ' 완료 ' }).status).toBe('완료');
  });

  it('도구 이름을 정규화한다', () => {
    expect(frontmatterSchema.parse({ ...base, tools: ['claude code', 'CURSOR'] }).tools).toEqual([
      'Claude Code',
      'Cursor',
    ]);
  });

  it('글자 수 경계: 제목 40자, 소개 50자, 이모지는 1자', () => {
    expect(errorsOf({ ...base, title: '가'.repeat(40), summary: '나'.repeat(50) })).toEqual([]);
    expect(errorsOf({ ...base, title: '🚀'.repeat(40) })).toEqual([]);
  });

  it('오픈카톡 링크와 디스코드 숫자 ID는 연락처로 통과한다', () => {
    const recruiting = { ...base, recruiting: true, looking_for: ['디자이너'] };
    expect(errorsOf({ ...recruiting, contact: 'https://open.kakao.com/o/sAb12345' })).toEqual([]);
    expect(errorsOf({ ...recruiting, contact: 'discord 123456789012345678' })).toEqual([]);
  });

  it('모집하지 않으면 연락처와 포지션이 없어도 된다', () => {
    expect(errorsOf({ ...base, recruiting: false, contact: '' })).toEqual([]);
  });
});

describe('frontmatterSchema: 실패', () => {
  it('필수 필드가 없으면 실패한다', () => {
    const errors = errorsOf({});
    expect(errors.some((e) => e.startsWith('title'))).toBe(true);
    expect(errors.some((e) => e.startsWith('summary'))).toBe(true);
    expect(errors.some((e) => e.startsWith('tools'))).toBe(true);
    expect(errors.some((e) => e.startsWith('status'))).toBe(true);
  });

  it('글자 수를 넘으면 실패한다', () => {
    expect(errorsOf({ ...base, title: '가'.repeat(41) })[0]).toMatch(/^title: .*40자/);
    expect(errorsOf({ ...base, summary: '나'.repeat(51) })[0]).toMatch(/^summary: .*50자/);
    expect(errorsOf({ ...base, title: '   ' })[0]).toMatch(/^title/);
  });

  it('도구가 비어 있으면 실패한다', () => {
    expect(errorsOf({ ...base, tools: [] })[0]).toMatch(/^tools/);
    expect(errorsOf({ ...base, tools: [''] })[0]).toMatch(/^tools/);
  });

  it('status가 정해진 값이 아니면 실패한다', () => {
    expect(errorsOf({ ...base, status: '개발중' })[0]).toMatch(/^status: .*진행중/);
  });

  it('모집 중이면 포지션과 연락처가 필수다', () => {
    const errors = errorsOf({ ...base, recruiting: true, looking_for: [], contact: null });
    expect(errors.some((e) => e.startsWith('looking_for'))).toBe(true);
    expect(errors.some((e) => e.startsWith('contact'))).toBe(true);
  });

  it('연락처가 이메일이면 실패한다', () => {
    expect(errorsOf({ ...base, contact: 'minji@example.com' })[0]).toMatch(/^contact: .*이메일/);
  });

  it.each([
    '010-1234-5678',
    '01012345678',
    '+82 10 1234 5678',
    '카톡 010.1234.5678 로 연락',
    '02-123-4567',
  ])('연락처가 전화번호면 실패한다: %s', (contact) => {
    expect(errorsOf({ ...base, contact })[0]).toMatch(/^contact: .*전화번호/);
  });

  it('demo가 https URL이 아니면 실패한다', () => {
    expect(errorsOf({ ...base, demo: 'http://example.com' })[0]).toMatch(/^demo/);
    expect(errorsOf({ ...base, demo: 'example.com' })[0]).toMatch(/^demo/);
    expect(errorsOf({ ...base, demo: 'https://' })[0]).toMatch(/^demo/);
  });

  it('recruiting이 boolean이 아니면 실패한다', () => {
    expect(errorsOf({ ...base, recruiting: 'yes' })[0]).toMatch(/^recruiting/);
  });
});

const project = {
  owner: 'minji-dev',
  repo: 'community-hot',
  url: 'https://github.com/minji-dev/community-hot',
  title: '커뮤니티 인기글 모아보기',
  summary: '국내 커뮤니티 인기글을 한곳에서 보는 앱',
  tools: ['Claude Code'],
  declaredStatus: '진행중',
  recruiting: false,
  lookingFor: [],
  contact: null,
  demo: null,
  stages: [
    { name: '기획', items: [{ text: '아이디어 정리', done: true }] },
    { name: null, items: [{ text: '배포', done: false }] },
  ],
  done: 1,
  total: 2,
  progress: 50,
  nextTask: '배포',
  lastCompleted: null,
  stars: 3,
  language: 'TypeScript',
  lastCommitAt: '2026-11-10T12:00:00Z',
  vicoUpdatedAt: '2026-11-09T12:00:00Z',
  activityAt: '2026-11-10T12:00:00Z',
  registeredAt: '2026-11-01T00:00:00.000Z',
};

describe('projectSchema / projectsDataSchema', () => {
  it('정상 프로젝트와 데이터 파일이 통과한다', () => {
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(
      projectsDataSchema.safeParse({
        generatedAt: '2026-11-11T00:00:00.000Z',
        projects: [
          project,
          { ...project, lastCompleted: { text: '아이디어 정리', at: '2026-11-10T00:00:00Z' } },
        ],
        errors: [{ repo: 'github.com/a/b', reason: 'VICO.md 없음', since: '2026-11-05T00:00:00Z' }],
      }).success,
    ).toBe(true);
  });

  it('진행률은 0~100 정수여야 한다', () => {
    expect(projectSchema.safeParse({ ...project, progress: 101 }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, progress: 33.3 }).success).toBe(false);
  });

  it('시각은 ISO 형식이어야 한다', () => {
    expect(projectSchema.safeParse({ ...project, activityAt: '어제' }).success).toBe(false);
  });

  it('errors 항목에 since가 없으면 실패한다', () => {
    expect(
      projectsDataSchema.safeParse({
        generatedAt: '2026-11-11T00:00:00.000Z',
        projects: [],
        errors: [{ repo: 'github.com/a/b', reason: 'x' }],
      }).success,
    ).toBe(false);
  });
});
