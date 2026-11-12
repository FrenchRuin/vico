import type { ProjectView } from '../../lib/data';
import { projectPath } from './styles';

type HeroProps = {
  /** 방금 완료 하이라이트 (F-15). 없으면 알약을 숨긴다. */
  highlight: ProjectView | null;
};

const PRIMARY =
  'inline-flex min-h-12 items-center justify-center rounded-[10px] bg-accent px-5 text-[15px] font-semibold text-white hover:bg-accent-hover';
const GHOST =
  'inline-flex min-h-12 items-center justify-center rounded-[10px] border border-border-strong bg-white/[0.03] px-5 text-[15px] font-semibold text-text hover:bg-muted';

/** 메인 첫 화면: 방금 완료 알약, 슬로건, 소개, 버튼 2개 (docs/design.md 3.1). */
export function Hero({ highlight }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="dot-grid hero-glow relative overflow-hidden px-gutter pt-16 pb-14 text-center sm:pt-20"
    >
      <div className="relative mx-auto flex max-w-content flex-col items-center">
        {highlight?.lastCompleted ? (
          <a
            href={projectPath(highlight)}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-border-strong bg-white/[0.03] py-1.5 pr-1.5 pl-3.5 text-xs text-text-muted hover:border-accent-line"
          >
            <span
              aria-hidden="true"
              className="size-[7px] shrink-0 rounded-full bg-mint shadow-[0_0_8px_var(--color-mint)]"
            />
            <span className="min-w-0 truncate">
              방금 완료 · <span className="font-semibold text-text">{highlight.title}</span> —{' '}
              {highlight.lastCompleted.text}
            </span>
            <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-bg">
              보기 →
            </span>
          </a>
        ) : null}

        <h1
          id="hero-title"
          className="mt-6 text-[40px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[64px]"
        >
          혼자 만들어도,
          <br />
          <span className="slogan-gradient">같이 보이게</span>
          <span
            aria-hidden="true"
            className="cursor-blink ml-2 inline-block h-[0.08em] w-[0.48em] bg-mint align-baseline"
          />
        </h1>

        <p className="mt-5 max-w-[600px] text-[17px] text-text-muted">
          Vico는 바이브 코딩 프로젝트 보드예요. 레포에{' '}
          <strong className="font-semibold text-text">VICO.md</strong> 하나만 두면 진행률, GitHub
          스타, 활동 상태가 3시간마다 여기에 모여요.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <a href="/join" className={PRIMARY}>
            내 프로젝트 올리기
          </a>
          <a href="#projects" className={GHOST}>
            프로젝트 구경하기
          </a>
        </div>
      </div>
    </section>
  );
}
