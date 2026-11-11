type HeaderProps = {
  /** 현재 페이지 (메뉴 강조용) */
  current?: 'projects' | 'join';
};

/** 왼쪽 로고 + 설명, 오른쪽 메뉴. "내 프로필"은 로그인이 없어 MVP에서 뺀다. */
export function Header({ current }: HeaderProps) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-gutter">
        <a href="/" className="flex min-h-11 items-center gap-3">
          <span className="font-mono text-xl font-bold">
            vico<span className="text-accent">_</span>
          </span>
          <span className="hidden text-sm text-text-muted sm:inline">
            바이브 코딩 프로젝트 보드
          </span>
        </a>
        <nav aria-label="주 메뉴" className="flex items-center gap-2">
          <a
            href="/"
            aria-current={current === 'projects' ? 'page' : undefined}
            className={`hidden min-h-11 items-center rounded-[10px] px-3 text-sm font-medium text-text-sub hover:bg-muted sm:inline-flex ${
              current === 'projects' ? 'bg-muted text-text' : ''
            }`}
          >
            프로젝트
          </a>
          <a
            href="/join"
            aria-current={current === 'join' ? 'page' : undefined}
            className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-text"
          >
            프로젝트 등록하기
          </a>
        </nav>
      </div>
    </header>
  );
}
