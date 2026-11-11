import { useEffect, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

const LABEL: Record<CopyState, string> = {
  idle: '복사',
  copied: '복사했어요',
  failed: '복사하지 못했어요',
};

/** 텍스트를 클립보드에 복사하는 버튼 (client:visible). */
export function CopyButton({
  text,
  label = '마크다운 코드 복사',
}: {
  text: string;
  label?: string;
}) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={state === 'idle' ? label : LABEL[state]}
      className="inline-flex min-h-11 shrink-0 items-center rounded-[10px] border border-border-strong bg-surface px-4 text-sm font-semibold text-text-sub hover:bg-muted"
    >
      <span aria-live="polite">{LABEL[state]}</span>
    </button>
  );
}
