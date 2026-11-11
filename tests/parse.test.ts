import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanInline, parseChecklist, parseVicoMarkdown } from '../lib/parse';

const frontmatter = `---
title: 테스트 프로젝트
summary: 파서 테스트
tools: [Claude Code]
status: 진행중
---
`;

function names(body: string) {
  return parseChecklist(body).map((stage) => stage.name);
}

function texts(body: string) {
  return parseChecklist(body).flatMap((stage) => stage.items.map((item) => item.text));
}

describe('parseChecklist: 체크박스 인식', () => {
  it('- [ ], - [x], - [X], * [ ]를 모두 인식한다', () => {
    const stages = parseChecklist('- [ ] 하나\n- [x] 둘\n- [X] 셋\n* [ ] 넷\n* [x] 다섯');
    expect(stages).toEqual([
      {
        name: null,
        items: [
          { text: '하나', done: false },
          { text: '둘', done: true },
          { text: '셋', done: true },
          { text: '넷', done: false },
          { text: '다섯', done: true },
        ],
      },
    ]);
  });

  it('일반 목록, 대괄호만 있는 줄, 빈 체크박스는 항목이 아니다', () => {
    expect(
      texts('- 그냥 목록\n- [ ]\n- [y] 이상한 표시\n-[ ] 공백 없음\n[ ] 목록 기호 없음'),
    ).toEqual([]);
  });

  it('들여쓴(중첩) 체크박스도 항목 하나로 센다', () => {
    const body = '- [x] 상위\n  - [ ] 하위 1\n    - [x] 하위 2\n\t- [ ] 탭 들여쓰기';
    expect(parseChecklist(body)[0]?.items).toEqual([
      { text: '상위', done: true },
      { text: '하위 1', done: false },
      { text: '하위 2', done: true },
      { text: '탭 들여쓰기', done: false },
    ]);
  });

  it('CRLF 줄바꿈도 처리한다', () => {
    expect(texts('## 단계\r\n- [x] 하나\r\n- [ ] 둘\r\n')).toEqual(['하나', '둘']);
  });
});

describe('parseChecklist: 단계 묶기', () => {
  it('## 제목이 없으면 이름 없는 단계 하나', () => {
    expect(names('- [ ] a\n- [ ] b')).toEqual([null]);
  });

  it('## 제목 여러 개로 나눈다', () => {
    const stages = parseChecklist('## 기획\n- [x] a\n## 개발\n- [ ] b\n- [ ] c\n## 출시\n- [ ] d');
    expect(stages.map((s) => [s.name, s.items.length])).toEqual([
      ['기획', 1],
      ['개발', 2],
      ['출시', 1],
    ]);
  });

  it('첫 ## 이전 항목은 이름 없는 단계가 된다', () => {
    expect(names('- [ ] 먼저\n## 개발\n- [ ] 나중')).toEqual([null, '개발']);
  });

  it('### 이하 제목과 # 제목은 단계를 나누지 않는다', () => {
    expect(names('# 프로젝트\n## 개발\n### 백엔드\n- [ ] a\n#### API\n- [ ] b')).toEqual(['개발']);
  });

  it('체크박스가 없는 ## 단계는 빠진다', () => {
    expect(names('## 소개\n설명 문장\n## 개발\n- [ ] a\n## 메모')).toEqual(['개발']);
  });

  it('단계 이름의 강조와 닫는 #을 지운다', () => {
    expect(names('## **개발** 단계 ##\n- [ ] a')).toEqual(['개발 단계']);
  });

  it('##뒤에 공백이 없으면 제목이 아니다', () => {
    expect(names('##개발\n- [ ] a')).toEqual([null]);
  });
});

describe('parseChecklist: 무시하는 영역', () => {
  it('HTML 주석 안의 ##과 체크박스를 무시한다', () => {
    const body = '<!--\n## 주석 제목\n- [ ] 주석 항목\n-->\n## 진짜\n- [ ] 진짜 항목';
    expect(parseChecklist(body)).toEqual([
      { name: '진짜', items: [{ text: '진짜 항목', done: false }] },
    ]);
  });

  it('한 줄 주석과 줄 중간 주석을 무시한다', () => {
    expect(texts('<!-- - [ ] 숨김 -->\n- [ ] 보임 <!-- 메모 -->')).toEqual(['보임']);
  });

  it('닫히지 않은 주석은 문서 끝까지 무시한다', () => {
    expect(texts('- [ ] 보임\n<!--\n- [ ] 숨김')).toEqual(['보임']);
  });

  it('코드 블록 안을 무시한다 (``` 와 ~~~)', () => {
    const body = '```md\n## 예시\n- [ ] 예시 항목\n```\n~~~\n- [x] 또 예시\n~~~\n- [ ] 진짜';
    expect(parseChecklist(body)).toEqual([{ name: null, items: [{ text: '진짜', done: false }] }]);
  });

  it('더 긴 펜스는 짧은 펜스로 닫히지 않는다', () => {
    expect(texts('````\n```\n- [ ] 숨김\n```\n````\n- [ ] 보임')).toEqual(['보임']);
  });

  it('코드 블록 안의 <!--는 주석을 시작하지 않는다', () => {
    expect(texts('```\n<!--\n```\n- [ ] 보임')).toEqual(['보임']);
  });
});

describe('cleanInline', () => {
  it.each([
    ['[로그인](https://x.com) 구현', '로그인 구현'],
    ['![로고](a.png) 넣기', '로고 넣기'],
    ['**굵게** 그리고 __굵게__', '굵게 그리고 굵게'],
    ['*기울임* 그리고 _기울임_', '기울임 그리고 기울임'],
    ['~~취소~~ 항목', '취소 항목'],
    ['`npm run` 실행', 'npm run 실행'],
    ['snake_case_name 유지', 'snake_case_name 유지'],
    ['2 * 3 * 4 계산', '2 * 3 * 4 계산'],
    ['  공백   정리  ', '공백 정리'],
  ])('%s → %s', (input, expected) => {
    expect(cleanInline(input)).toBe(expected);
  });
});

describe('parseVicoMarkdown', () => {
  it('frontmatter와 체크리스트를 함께 계산한다', () => {
    const result = parseVicoMarkdown(`${frontmatter}\n## 기획\n- [x] a\n- [x] b\n## 개발\n- [ ] c`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frontmatter.title).toBe('테스트 프로젝트');
    expect(result).toMatchObject({ done: 2, total: 3, progress: 67, nextTask: 'c' });
  });

  it('빈 체크리스트: 진행률 0, 다음 할 일 없음', () => {
    const result = parseVicoMarkdown(`${frontmatter}\n본문만 있어요`);
    expect(result).toMatchObject({
      ok: true,
      stages: [],
      done: 0,
      total: 0,
      progress: 0,
      nextTask: null,
    });
  });

  it('전부 완료: 진행률 100, 다음 할 일 없음', () => {
    const result = parseVicoMarkdown(`${frontmatter}\n- [x] a\n- [X] b`);
    expect(result).toMatchObject({ ok: true, done: 2, total: 2, progress: 100, nextTask: null });
  });

  it('BOM이 있어도 frontmatter를 읽는다', () => {
    expect(parseVicoMarkdown(`${String.fromCharCode(0xfeff)}${frontmatter}- [ ] a`).ok).toBe(true);
  });

  it('frontmatter가 없으면 필수 항목 오류', () => {
    const result = parseVicoMarkdown('- [ ] a');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('title: 필수 항목이에요');
  });

  it('YAML이 깨지면 읽을 수 없다는 오류', () => {
    const result = parseVicoMarkdown('---\ntitle: [닫히지 않음\n---\n- [ ] a');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/frontmatter/);
  });

  it('스키마 오류를 "필드: 메시지"로 돌려준다', () => {
    const result = parseVicoMarkdown(frontmatter.replace('진행중', '개발중'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(['status: 진행중, 완료, 중단 중 하나로 적어 주세요']);
  });

  it('templates/VICO.md 원본: 단계 3개, 항목 5개, 주석은 무시', () => {
    const template = readFileSync(new URL('../templates/VICO.md', import.meta.url), 'utf8');
    const result = parseVicoMarkdown(template);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stages.map((s) => [s.name, s.items.length])).toEqual([
      ['기획', 2],
      ['개발', 2],
      ['출시', 1],
    ]);
    expect(result).toMatchObject({ total: 5, done: 0, progress: 0, nextTask: '아이디어 정리' });
    expect(result.frontmatter).toMatchObject({ contact: null, demo: null, looking_for: [] });
  });
});
