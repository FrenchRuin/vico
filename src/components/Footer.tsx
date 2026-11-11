const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "2026년 11월 11일 12:00" (한국 시간) */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-gutter py-8 text-[13px] text-text-muted">
        <p>
          3시간마다 GitHub에서 확인해요 · 마지막 데이터 변경{' '}
          <time dateTime={generatedAt}>{formatDateTime(generatedAt)}</time>
        </p>
        <a
          href="/join"
          className="inline-flex min-h-11 items-center font-medium text-accent-text hover:underline"
        >
          참여 가이드
        </a>
      </div>
    </footer>
  );
}
