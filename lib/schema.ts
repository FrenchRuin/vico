// VICO.md frontmatter + 데이터 타입 (zod). 규칙은 docs/spec.md 3절, 6절.
import { z } from 'zod';
import { config } from '../vico.config';

export const DECLARED_STATUSES = ['진행중', '완료', '중단'] as const;
export type DeclaredStatus = (typeof DECLARED_STATUSES)[number];

const TITLE_MAX = 40;
const SUMMARY_MAX = 50;

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
/** 숫자와 구분자로만 이어진 덩어리. 숫자 개수는 따로 센다. */
const NUMBER_CHUNK_PATTERN = /\+?\(?\d[\d\s\-.()]*\d/g;
const PHONE_MIN_DIGITS = 9;
const PHONE_MAX_DIGITS = 15;

/** 문자 단위 길이 (이모지 1개 = 1자). */
function charLength(value: string): number {
  return Array.from(value).length;
}

function toolKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

/** 대소문자/공백을 무시하고 알려진 도구 이름으로 맞춘다. 모르는 도구는 앞뒤 공백만 지운다. */
export function normalizeTool(
  name: string,
  knownTools: readonly string[] = config.knownTools,
): string {
  const trimmed = name.trim();
  const key = toolKey(trimmed);
  return knownTools.find((tool) => toolKey(tool) === key) ?? trimmed;
}

/** 정규화 후 중복을 하나로 합친다. 처음 나온 순서를 유지한다. */
export function normalizeTools(
  names: readonly string[],
  knownTools: readonly string[] = config.knownTools,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const normalized = normalizeTool(name, knownTools);
    const key = toolKey(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

export function containsEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function containsPhoneNumber(value: string): boolean {
  for (const chunk of value.match(NUMBER_CHUNK_PATTERN) ?? []) {
    const digits = chunk.replace(/\D/g, '').length;
    if (digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS) return true;
  }
  return false;
}

/**
 * 글자 필드. YAML은 `title: 2048`을 숫자로 읽으므로 숫자도 글자로 받는다.
 * 앞뒤 공백을 지운 값을 돌려준다.
 */
function text() {
  return z
    .union([z.string(), z.number()], {
      error: (issue) => (issue.input == null ? '필수 항목이에요' : '글자로 적어 주세요'),
    })
    .transform((value) => String(value).trim());
}

function boundedText(max: number) {
  return text().superRefine((value, ctx) => {
    const length = charLength(value);
    if (length < 1 || length > max) {
      ctx.addIssue({ code: 'custom', message: `1~${max}자로 적어 주세요 (지금 ${length}자)` });
    }
  });
}

const nonEmptyText = text().refine((value) => value.length > 0, { error: '빈 값은 안 돼요' });

const statusSchema = z
  .string({ error: (issue) => (issue.input == null ? '필수 항목이에요' : '글자로 적어 주세요') })
  .transform((value) => value.replace(/\s+/g, ''))
  .pipe(z.enum(DECLARED_STATUSES, { error: '진행중, 완료, 중단 중 하나로 적어 주세요' }));

const contactSchema = text()
  .nullish()
  .transform((value) => value || null)
  .refine((value) => value === null || !containsEmail(value), {
    error: '이메일은 받지 않아요. 디스코드 아이디나 오픈카톡 링크를 적어 주세요',
  })
  .refine((value) => value === null || !containsPhoneNumber(value), {
    error: '전화번호는 받지 않아요. 디스코드 아이디나 오픈카톡 링크를 적어 주세요',
  });

const demoSchema = z
  .string({ error: '글자로 적어 주세요' })
  .nullish()
  .transform((value) => value?.trim() || null)
  .refine((value) => value === null || isHttpsUrl(value), {
    error: 'https://로 시작하는 주소를 적어 주세요',
  });

function isHttpsUrl(value: string): boolean {
  if (!value.startsWith('https://')) return false;
  try {
    return new URL(value).hostname.length > 0;
  } catch {
    return false;
  }
}

/** VICO.md frontmatter. 키 이름은 VICO.md에 쓰는 그대로(snake_case). */
export const frontmatterSchema = z
  .object({
    title: boundedText(TITLE_MAX),
    summary: boundedText(SUMMARY_MAX),
    tools: z
      .array(nonEmptyText, {
        error: (issue) =>
          issue.input == null
            ? '필수 항목이에요'
            : '[Claude Code, Cursor]처럼 목록으로 적어 주세요',
      })
      .min(1, { error: '도구를 1개 이상 적어 주세요' })
      .transform((tools) => normalizeTools(tools)),
    status: statusSchema,
    recruiting: z
      .boolean({ error: 'true 또는 false로 적어 주세요' })
      .nullish()
      .transform((value) => value ?? false),
    looking_for: z
      .array(nonEmptyText, { error: '[프론트엔드, 디자이너]처럼 목록으로 적어 주세요' })
      .nullish()
      .transform((value) => value ?? []),
    contact: contactSchema,
    demo: demoSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.recruiting) return;
    if (data.looking_for.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['looking_for'],
        message: '팀원을 구할 때는 찾는 포지션을 1개 이상 적어 주세요',
      });
    }
    if (data.contact === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['contact'],
        message: '팀원을 구할 때는 연락처(디스코드 아이디나 오픈카톡 링크)를 적어 주세요',
      });
    }
  });

export type VicoFrontmatter = z.output<typeof frontmatterSchema>;

const isoDateTime = z.iso.datetime({ offset: true });

export const checklistItemSchema = z.object({
  text: z.string(),
  done: z.boolean(),
});

export const stageSchema = z.object({
  name: z.string().nullable(),
  items: z.array(checklistItemSchema),
});

export const projectSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  url: z.url(),
  title: z.string(),
  summary: z.string(),
  tools: z.array(z.string()),
  declaredStatus: z.enum(DECLARED_STATUSES),
  recruiting: z.boolean(),
  lookingFor: z.array(z.string()),
  contact: z.string().nullable(),
  demo: z.string().nullable(),
  stages: z.array(stageSchema),
  done: z.int().min(0),
  total: z.int().min(0),
  progress: z.int().min(0).max(100),
  nextTask: z.string().nullable(),
  lastCompleted: z.object({ text: z.string(), at: isoDateTime }).nullable(),
  stars: z.int().min(0),
  language: z.string().nullable(),
  lastCommitAt: isoDateTime,
  vicoUpdatedAt: isoDateTime,
  activityAt: isoDateTime,
  registeredAt: isoDateTime,
});

export const collectErrorSchema = z.object({
  repo: z.string(),
  reason: z.string(),
  since: isoDateTime,
});

export const projectsDataSchema = z.object({
  generatedAt: isoDateTime,
  projects: z.array(projectSchema),
  errors: z.array(collectErrorSchema),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type Project = z.infer<typeof projectSchema>;
export type CollectError = z.infer<typeof collectErrorSchema>;
export type ProjectsData = z.infer<typeof projectsDataSchema>;
