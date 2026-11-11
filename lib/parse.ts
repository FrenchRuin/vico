// VICO.md → frontmatter, 체크리스트, 단계, 다음 할 일. 규칙은 docs/spec.md 3절.
import matter from 'gray-matter';
import { computeProgress, findNextTask, type ProgressSummary } from './progress';
import { frontmatterSchema, type Stage, type VicoFrontmatter } from './schema';

export type ParsedVico = ProgressSummary & {
  ok: true;
  frontmatter: VicoFrontmatter;
  stages: Stage[];
  nextTask: string | null;
};

export type ParseFailure = {
  ok: false;
  /** "필드: 메시지" 형식. validate 코멘트에 그대로 쓴다. */
  errors: string[];
};

const STAGE_HEADING = /^ {0,3}##[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const CHECKBOX = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;
const BOM = 0xfeff;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/** 체크박스/단계 이름의 마크다운 링크, 이미지, 강조, 코드 표시를 지우고 텍스트만 남긴다. */
export function cleanInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '$1')
    .replace(/(^|[^\p{L}\p{N}_])_(?=\S)([^_]+?)(?<=\S)_(?![\p{L}\p{N}_])/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 코드 블록 안의 줄과 HTML 주석을 지운 줄 목록. */
function visibleLines(body: string): string[] {
  const lines: string[] = [];
  let fence: { char: string; length: number } | null = null;
  let inComment = false;

  for (const raw of body.split(/\r?\n/)) {
    let line = raw;

    if (inComment) {
      const end = line.indexOf('-->');
      if (end === -1) continue;
      inComment = false;
      line = line.slice(end + 3);
    }

    const fenceMatch = FENCE.exec(line);
    if (fence) {
      if (fenceMatch?.[1]?.[0] === fence.char && fenceMatch[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch?.[1]) {
      fence = { char: fenceMatch[1][0] ?? '`', length: fenceMatch[1].length };
      continue;
    }

    line = line.replace(/<!--[\s\S]*?-->/g, '');
    const open = line.indexOf('<!--');
    if (open !== -1) {
      inComment = true;
      line = line.slice(0, open);
    }
    lines.push(line);
  }
  return lines;
}

/** 본문을 단계별 체크리스트로 나눈다. 체크박스가 없는 단계는 뺀다. */
export function parseChecklist(body: string): Stage[] {
  const stages: Stage[] = [{ name: null, items: [] }];

  for (const line of visibleLines(body)) {
    const heading = STAGE_HEADING.exec(line);
    if (heading) {
      stages.push({ name: cleanInline(heading[1] ?? '') || null, items: [] });
      continue;
    }
    const checkbox = CHECKBOX.exec(line);
    if (checkbox) {
      const text = cleanInline(checkbox[2] ?? '');
      if (text) stages.at(-1)?.items.push({ text, done: checkbox[1] !== ' ' });
    }
  }
  return stages.filter((stage) => stage.items.length > 0);
}

/** VICO.md 전체를 읽어 frontmatter 검증과 진행률 계산을 한 번에 한다. */
export function parseVicoMarkdown(source: string): ParsedVico | ParseFailure {
  let data: unknown;
  let body: string;
  try {
    // 옵션 객체를 넘기면 gray-matter의 내부 캐시를 쓰지 않는다.
    const withoutBom = source.charCodeAt(0) === BOM ? source.slice(1) : source;
    const parsed = matter(withoutBom, {});
    data = parsed.data;
    body = parsed.content;
  } catch {
    return {
      ok: false,
      errors: [
        'frontmatter: 읽을 수 없어요. --- 사이의 YAML 형식(괄호, 따옴표, 들여쓰기)을 확인해 주세요',
      ],
    };
  }

  const result = frontmatterSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`,
      ),
    };
  }

  const stages = parseChecklist(body);
  return {
    ok: true,
    frontmatter: result.data,
    stages,
    ...computeProgress(stages),
    nextTask: findNextTask(stages),
  };
}
