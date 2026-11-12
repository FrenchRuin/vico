import type { CommunityStats, ProjectView } from '../../lib/data';
import { HighlightCard } from './HighlightCard';
import { RecruitCard } from './RecruitCard';
import { TILE } from './styles';

type OverviewProps = {
  stats: CommunityStats;
  highlight: ProjectView | null;
  recruiting: readonly ProjectView[];
  now: Date;
};

/** VICO.md 타일에 보여 줄 짧은 예시 (고정 문구). */
const SAMPLE_LINES: readonly { done: boolean; text: string }[] = [
  { done: true, text: '지도에 동네 표시' },
  { done: true, text: '체감 투표' },
  { done: false, text: '실제 폰에서 전체 흐름 확인' },
];

/** 메인 타일 묶음 "지금 만들어지는 중" (docs/design.md 3.1). */
export function Overview({ stats, highlight, recruiting, now }: OverviewProps) {
  const projectTiles = (highlight ? 1 : 0) + recruiting.length;
  // 프로젝트 타일이 하나뿐이면 2열을 차지해 빈칸을 막는다.
  const projectSpan = projectTiles === 1 ? 'lg:col-span-2' : '';

  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-6">
      <h2
        id="overview-title"
        className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]"
      >
        지금 만들어지는 중 <span className="text-text-muted">한눈에 보는 오늘의 Vico</span>
      </h2>

      <div className="grid gap-3.5 lg:grid-cols-3">
        <div className={`${TILE} justify-between ${projectTiles > 0 ? 'lg:row-span-2' : ''}`}>
          <div>
            <h3 className="text-[15px] font-bold">등록된 프로젝트</h3>
            <p className="mt-1.5 text-[13px] text-text-muted">VICO.md로 진행 상황을 공개한 레포</p>
          </div>
          <div className="relative z-10 mt-6">
            <p>
              <span className="block font-mono text-[80px] leading-[0.9] font-extrabold tracking-[-0.05em] text-mint sm:text-[120px]">
                {stats.registered}
              </span>
              <span className="mt-2 block text-lg font-bold">개의 프로젝트가 Vico에 있어요</span>
            </p>
            <dl className="mt-6 flex flex-col gap-2 text-sm">
              {(
                [
                  ['지금 활발', stats.activeNow],
                  ['팀원 모집', stats.recruiting],
                  ['완성', stats.completed],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between border-t border-border pt-2">
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="font-mono text-base font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-20 size-[260px] bg-[radial-gradient(closest-side,rgb(165_243_196/0.22),transparent)]"
          />
        </div>

        {highlight ? (
          <div className={`flex [&>a]:w-full ${projectSpan}`}>
            <HighlightCard project={highlight} now={now} />
          </div>
        ) : null}
        {recruiting.map((project) => (
          <div
            key={`${project.owner}/${project.repo}`}
            className={`flex [&>a]:w-full ${projectSpan}`}
          >
            <RecruitCard project={project} />
          </div>
        ))}

        <div className={`${TILE} gap-5 lg:col-span-2 lg:grid lg:grid-cols-2 lg:items-center`}>
          <div>
            <h3 className="text-[15px] font-bold">체크리스트가 곧 진행률</h3>
            <p className="mt-1.5 text-[13px] text-text-muted">
              VICO.md의 체크박스를 채울 때마다 진행률이 올라가요. 따로 입력할 건 없어요.
            </p>
            <a
              href="/join"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent-text hover:underline"
            >
              템플릿 보기 →
            </a>
          </div>
          <section
            aria-label="VICO.md 예시"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: 스크롤되는 영역은 키보드로도 닿아야 한다
            tabIndex={0}
            className="overflow-x-auto rounded-[10px] border border-border bg-bg px-4 py-3.5"
          >
            <pre className="font-mono text-[12.5px] leading-[1.8] text-text-sub">
              <span className="text-text-muted"># VICO.md</span>
              {'\n'}
              <span className="text-deep-label">title:</span> 우리동네 날씨
              {SAMPLE_LINES.map((line) => (
                <span key={line.text}>
                  {'\n'}
                  <span className={line.done ? 'text-mint' : ''}>
                    {line.done ? '- [x]' : '- [ ]'}
                  </span>{' '}
                  {line.text}
                </span>
              ))}
            </pre>
          </section>
        </div>
      </div>
    </section>
  );
}
