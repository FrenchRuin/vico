// 진행률, 다음 할 일, 새로 완료된 항목. 규칙은 docs/spec.md 3절, 5절 F-15.
import type { ChecklistItem, Stage } from './schema';

export type ProgressSummary = {
  done: number;
  total: number;
  /** 0~100 정수. 미완료가 있으면 최대 99. */
  progress: number;
};

function allItems(stages: readonly Stage[]): ChecklistItem[] {
  return stages.flatMap((stage) => stage.items);
}

export function computeProgress(stages: readonly Stage[]): ProgressSummary {
  const items = allItems(stages);
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  if (total === 0) return { done, total, progress: 0 };
  const rounded = Math.round((done / total) * 100);
  return { done, total, progress: done < total ? Math.min(rounded, 99) : 100 };
}

/** 문서 위에서부터 처음 나오는 미완료 항목. 없으면 null. */
export function findNextTask(stages: readonly Stage[]): string | null {
  return allItems(stages).find((item) => !item.done)?.text ?? null;
}

/**
 * 이전 수집 대비 새로 체크된 항목 (문서 순서).
 * 이전에 같은 텍스트로 미완료였던 항목만 센다. 새로 추가했거나 문구를 고친 항목은 제외.
 * 이전 데이터가 없으면(첫 수집) 빈 배열.
 */
export function findNewlyCompleted(
  prev: readonly Stage[] | null,
  next: readonly Stage[],
): ChecklistItem[] {
  if (prev === null) return [];

  const doneBefore = new Map<string, number>();
  const openBefore = new Map<string, number>();
  for (const item of allItems(prev)) {
    const counter = item.done ? doneBefore : openBefore;
    counter.set(item.text, (counter.get(item.text) ?? 0) + 1);
  }

  const result: ChecklistItem[] = [];
  for (const item of allItems(next)) {
    if (!item.done) continue;
    const alreadyDone = doneBefore.get(item.text) ?? 0;
    if (alreadyDone > 0) {
      doneBefore.set(item.text, alreadyDone - 1);
      continue;
    }
    const wasOpen = openBefore.get(item.text) ?? 0;
    if (wasOpen > 0) {
      openBefore.set(item.text, wasOpen - 1);
      result.push(item);
    }
  }
  return result;
}
