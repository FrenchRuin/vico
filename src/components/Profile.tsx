import type { OwnerProfile, ProjectView } from '../../lib/data';
import { Avatar } from './Avatar';
import { StatusBadge } from './Badges';
import { projectPath } from './styles';

const monthFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
});

/** "2026년 9월" (한국 시간) */
export function formatMonth(iso: string): string {
  return monthFormat.format(new Date(iso));
}

type ProfileBannerProps = {
  profile: OwnerProfile;
  maxActive: number;
};

/** deep 배너: 아바타, 아이디, 시작한 달, 통계 3개, GitHub 프로필 버튼. */
export function ProfileBanner({ profile, maxActive }: ProfileBannerProps) {
  const stats: [string, string][] = [
    [`${profile.ongoing.length} / ${maxActive}`, '진행중'],
    [String(profile.done.length), '완성작'],
    [String(profile.totalStars), '받은 스타'],
  ];
  return (
    <section className="flex flex-col gap-6 rounded-section border border-border bg-deep p-6 text-white sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <Avatar id={profile.owner} size={80} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate font-mono text-2xl font-bold">@{profile.owner}</h1>
          <p className="text-sm text-deep-text">
            {formatMonth(profile.since)}부터 Vico에서 만드는 중
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:items-end">
        <dl className="grid grid-cols-3 gap-2">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-card bg-white/10 px-4 py-2.5">
              <dt className="sr-only">{label}</dt>
              <dd className="font-mono text-[22px] font-bold leading-tight">{value}</dd>
              <dd aria-hidden="true" className="text-xs text-deep-text">
                {label}
              </dd>
            </div>
          ))}
        </dl>
        <a
          href={`https://github.com/${profile.owner}`}
          className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-white px-4 text-sm font-semibold text-deep hover:bg-deep-text"
        >
          GitHub 프로필
        </a>
      </div>
    </section>
  );
}

/** 진행중이 maxActive보다 적을 때 마지막에 놓는 점선 카드. */
export function AddProjectCard({ remaining }: { remaining: number }) {
  return (
    <a
      href="/join"
      className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-border-strong p-card text-center hover:border-accent hover:bg-surface"
    >
      <span className="font-bold text-accent-text">프로젝트 하나 더 올리기</span>
      <span className="text-sm text-text-muted">{remaining}자리 남았어요</span>
    </a>
  );
}

/** 완성작/휴면용 한 줄 카드 (제목, 상태 뱃지, 소개, 스타). 카드 전체가 상세 링크. */
export function CompactProjectRow({ project }: { project: ProjectView }) {
  return (
    <a
      href={projectPath(project)}
      className="flex flex-col gap-1 rounded-card border border-border bg-surface px-5 py-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-4"
    >
      <span className="flex shrink-0 items-center gap-2">
        <span className="font-bold">{project.title}</span>
        <StatusBadge status={project.status} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{project.summary}</span>
      <span className="shrink-0 font-mono text-[13px] text-text-sub">
        <span aria-hidden="true" className="text-star">
          ★
        </span>
        <span className="sr-only">스타</span> {project.stars}
      </span>
    </a>
  );
}
