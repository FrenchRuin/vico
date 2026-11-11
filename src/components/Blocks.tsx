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
    <section className="flex flex-col gap-4 rounded-section bg-deep p-6 text-white sm:flex-row sm:items-center sm:justify-between">
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
