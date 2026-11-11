import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { loadTemplate } from '../lib/data';
import { CodeBlock, joinFaqItems, StatusTable, statusRows } from '../src/components/Join';
import { config } from '../vico.config';

describe('loadTemplate', () => {
  it('templates/VICO.md 원문을 그대로 읽는다', () => {
    const raw = readFileSync(join(process.cwd(), 'templates', 'VICO.md'), 'utf8');
    expect(loadTemplate()).toBe(raw.replace(/\r\n/g, '\n'));
  });

  it('템플릿을 고치면 그 내용이 나온다 (하드코딩하지 않음)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vico-template-'));
    const path = join(dir, 'VICO.md');
    writeFileSync(path, '---\ntitle: 바뀐 템플릿\r\n---\n');
    expect(loadTemplate(path)).toBe('---\ntitle: 바뀐 템플릿\n---\n');
  });

  it('코드 블록에 템플릿이 이스케이프되어 들어간다', () => {
    const html = renderToStaticMarkup(<CodeBlock code={loadTemplate()} label="t" />);
    expect(html).toContain('&lt;!--');
    expect(html).toContain('title: 내 프로젝트 이름');
  });
});

describe('활동 상태 표', () => {
  it('기준 숫자는 config에서 온다', () => {
    const rows = statusRows({ activeDays: 7, quietDays: 30 });
    expect(rows.map((r) => r.rule)).toEqual([
      '마지막 업데이트가 7일 이내',
      '마지막 업데이트가 8~30일 전',
      '30일 넘게 업데이트가 없거나 status: 중단',
      '체크리스트를 모두 완료했거나 status: 완료',
    ]);
  });

  it('상태 뱃지 4종을 그린다', () => {
    const html = renderToStaticMarkup(<StatusTable config={config} />);
    for (const label of ['활발', '잠잠', '휴면', '완료']) expect(html).toContain(label);
  });
});

describe('FAQ', () => {
  it('질문 4개, 숫자는 config 기준', () => {
    const items = joinFaqItems({ reminderDays: 20, removeAfterDormantDays: 60 });
    expect(items.map((i) => i.question)).toEqual([
      '코드는 비공개로 두고 싶어요',
      '정보를 고치고 싶어요',
      '프로젝트를 내리고 싶어요',
      '봇이 이슈를 열었어요',
    ]);
    const text = items.map((i) => renderToStaticMarkup(i.answer)).join(' ');
    expect(text).toContain('20일 동안');
    expect(text).toContain('60일이 지나면');
  });
});
