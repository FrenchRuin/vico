import { describe, expect, it } from 'vitest';
import { computeProgress, findNewlyCompleted, findNextTask } from '../lib/progress';
import type { Stage } from '../lib/schema';

function stage(name: string | null, ...items: [string, boolean][]): Stage {
  return { name, items: items.map(([text, done]) => ({ text, done })) };
}

describe('computeProgress', () => {
  it('단계를 합쳐 반올림 정수로 계산한다', () => {
    expect(
      computeProgress([stage('a', ['1', true]), stage('b', ['2', false], ['3', false])]),
    ).toEqual({
      done: 1,
      total: 3,
      progress: 33,
    });
    expect(computeProgress([stage(null, ['1', true], ['2', true], ['3', false])]).progress).toBe(
      67,
    );
  });

  it('0.5는 올림한다', () => {
    const items: [string, boolean][] = Array.from({ length: 8 }, (_, i) => [`${i}`, i < 1]);
    expect(computeProgress([stage(null, ...items)]).progress).toBe(13); // 12.5
  });

  it('항목이 없으면 0', () => {
    expect(computeProgress([])).toEqual({ done: 0, total: 0, progress: 0 });
  });

  it('전부 완료면 100', () => {
    expect(computeProgress([stage(null, ['1', true], ['2', true])]).progress).toBe(100);
  });

  it('하나라도 남았으면 100이 되지 않는다', () => {
    const items: [string, boolean][] = Array.from({ length: 300 }, (_, i) => [`${i}`, i > 0]);
    expect(computeProgress([stage(null, ...items)]).progress).toBe(99);
  });
});

describe('findNextTask', () => {
  it('문서 위에서부터 처음 나오는 미완료 항목', () => {
    expect(
      findNextTask([stage('a', ['1', true]), stage('b', ['2', true], ['3', false], ['4', false])]),
    ).toBe('3');
  });

  it('모두 완료이거나 비어 있으면 null', () => {
    expect(findNextTask([stage(null, ['1', true])])).toBeNull();
    expect(findNextTask([])).toBeNull();
  });
});

describe('findNewlyCompleted', () => {
  it('이전에 같은 텍스트로 미완료였고 지금 완료인 항목만', () => {
    const prev = [stage('a', ['로그인', false], ['배포', false], ['기획', true])];
    const next = [stage('a', ['로그인', true], ['배포', false], ['기획', true])];
    expect(findNewlyCompleted(prev, next)).toEqual([{ text: '로그인', done: true }]);
  });

  it('여러 개면 문서 순서대로 돌려준다', () => {
    const prev = [stage('a', ['1', false]), stage('b', ['2', false])];
    const next = [stage('a', ['1', true]), stage('b', ['2', true])];
    expect(findNewlyCompleted(prev, next).map((item) => item.text)).toEqual(['1', '2']);
  });

  it('이전 데이터가 없으면(첫 수집) 빈 결과', () => {
    expect(findNewlyCompleted(null, [stage(null, ['1', true])])).toEqual([]);
  });

  it('새로 추가했거나 문구를 고친 항목은 세지 않는다', () => {
    const prev = [stage(null, ['로그인', false])];
    const next = [stage(null, ['로그인 구현', true], ['새 항목', true])];
    expect(findNewlyCompleted(prev, next)).toEqual([]);
  });

  it('단계가 바뀌어도 텍스트로 비교한다', () => {
    const prev = [stage('개발', ['배포', false])];
    const next = [stage('출시', ['배포', true])];
    expect(findNewlyCompleted(prev, next)).toEqual([{ text: '배포', done: true }]);
  });

  it('같은 텍스트가 여러 개면 미완료였던 개수만큼만 센다', () => {
    const prev = [stage(null, ['테스트', false], ['테스트', true])];
    const next = [stage(null, ['테스트', true], ['테스트', true])];
    expect(findNewlyCompleted(prev, next)).toHaveLength(1);
  });

  it('완료를 다시 해제한 항목은 결과에 없다', () => {
    const prev = [stage(null, ['1', true])];
    const next = [stage(null, ['1', false])];
    expect(findNewlyCompleted(prev, next)).toEqual([]);
  });
});
