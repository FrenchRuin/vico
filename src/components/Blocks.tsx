import type { ReactNode } from 'react';

type StatProps = {
  value: ReactNode;
  label: string;
};

/** 숫자(모노 22px) + 라벨(12px) 카드. */
export function Stat({ value, label }: StatProps) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <div className="font-mono text-[22px] font-bold leading-tight">{value}</div>
      <div className="mt-1 text-xs text-text-muted">{label}</div>
    </div>
  );
}

type BannerProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
};

/** deep 배경 배너 (제목, 설명, 흰 버튼). */
export function Banner({ title, description, actionLabel, actionHref, children }: BannerProps) {
  return (
    <section className="flex flex-col gap-4 rounded-section border border-border bg-deep p-6 text-white sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-bold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-deep-text">{description}</p> : null}
        {children}
      </div>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[10px] bg-white px-4 text-sm font-semibold text-deep hover:bg-deep-text"
        >
          {actionLabel}
        </a>
      ) : null}
    </section>
  );
}

/** 점선 테두리 빈 상태. */
export function EmptyState({ message = '조건에 맞는 프로젝트가 없어요' }: { message?: string }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong px-6 py-12 text-center text-sm text-text-muted">
      {message}
    </div>
  );
}

/** 메인 맨 아래 등록 권유 (가운데 정렬, 아래쪽 mint 빛). */
export function FinalCta() {
  return (
    <section
      aria-labelledby="final-title"
      className="relative overflow-hidden border-t border-border px-gutter py-16 text-center"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-52 left-1/2 h-[360px] w-[min(700px,100%)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(165_243_196/0.16),transparent)]"
      />
      <h2
        id="final-title"
        className="relative text-[28px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[40px]"
      >
        내 프로젝트도 올려 보세요
        <br />
        <span className="text-text-muted">VICO.md 하나와 PR 한 번이면 끝.</span>
      </h2>
      <a
        href="/join"
        className="relative mt-6 inline-flex min-h-12 items-center justify-center rounded-[10px] bg-accent px-5 text-[15px] font-semibold text-white hover:bg-accent-hover"
      >
        등록 방법 보기
      </a>
    </section>
  );
}
