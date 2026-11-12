type HeaderProps = {
  /** 현재 페이지 (메뉴 강조용) */
  current?: 'projects' | 'join';
};

const LINKS: readonly { href: string; label: string; page?: HeaderProps['current'] }[] = [
  { href: '/#projects', label: '프로젝트', page: 'projects' },
  { href: '/?tab=recruit#projects', label: '팀원 모집' },
  { href: '/?tab=done#projects', label: '완성작' },
  { href: '/join', label: '참여 가이드', page: 'join' },
];

/** 왼쪽 로고, 가운데 링크(넓은 화면만), 오른쪽 등록 버튼. "내 프로필"은 로그인이 없어 MVP에서 뺀다. */
export function Header({ current }: HeaderProps) {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex h-16 max-w-content items-center gap-7 px-gutter">
        <a href="/" aria-label="Vico 홈" className="flex min-h-11 items-center">
          <span className="font-mono text-xl font-bold">
            vico<span className="text-mint">_</span>
          </span>
        </a>
        <nav aria-label="주 메뉴" className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => {
            const isCurrent = link.page !== undefined && link.page === current;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-[10px] px-2.5 text-[13px] font-medium hover:text-text ${
                  isCurrent ? 'text-text' : 'text-text-muted'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
        <a
          href="/join"
          className="ml-auto inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          프로젝트 등록하기
        </a>
      </div>
    </header>
  );
}
