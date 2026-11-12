import type { ProjectView } from '../../lib/data';
import type { Stage } from '../../lib/schema';
import { relativeDay, STATUS_LABEL } from '../../lib/status';
import { RecruitBadge, StatusBadge, ToolBadge } from './Badges';
import { ProgressRing } from './ProgressRing';
import { profilePath, projectPath, STATUS_CLASS } from './styles';

const SECTION = 'rounded-section border border-border bg-surface p-6';
const BUTTON = 'inline-flex min-h-11 items-center rounded-[10px] px-4 text-[15px] font-semibold';

/** 요약 카드: 원형 진행률 + 상태, 제목, 소개, 메타 정보, 버튼. */
export function ProjectSummary({ project, now }: { project: ProjectView; now: Date }) {
  return (
    <section className={`${SECTION} flex flex-col gap-6 sm:flex-row sm:items-center`}>
      <ProgressRing
        done={project.done}
        total={project.total}
        progress={project.progress}
        status={project.status}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={project.status}
            suffix={`${relativeDay(project.activityAt, now)} 업데이트`}
          />
          {project.recruiting && project.status !== 'dormant' ? <RecruitBadge /> : null}
        </div>
        <h1 className="text-[28px] font-bold leading-tight">{project.title}</h1>
        <p className="text-text-sub">{project.summary}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-sub">
          <a
            href={profilePath(project.owner)}
            className="inline-flex min-h-11 items-center font-mono font-medium hover:underline sm:min-h-0"
          >
            @{project.owner}
          </a>
          <span className="flex flex-wrap gap-1.5">
            {project.tools.map((tool) => (
              <ToolBadge key={tool} tool={tool} />
            ))}
          </span>
          {project.language ? <span>{project.language}</span> : null}
          <span className="font-mono">
            <span aria-hidden="true" className="text-star">
              ★
            </span>
            <span className="sr-only">스타</span> {project.stars}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={project.url}
            className={`${BUTTON} border border-border-strong bg-surface text-text hover:bg-muted`}
          >
            레포 보기
          </a>
          {project.demo ? (
            <a href={project.demo} className={`${BUTTON} bg-text text-bg hover:bg-text-sub`}>
              데모 열기
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** 다음 할 일 띠. 다음 할 일이 없으면 그리지 않는다. */
export function NextTaskStrip({ nextTask }: { nextTask: string | null }) {
  if (nextTask === null) return null;
  return (
    <section className="flex flex-col gap-1 rounded-card bg-accent-soft px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="text-[13px] font-bold text-accent-text">다음 할 일</span>
      <span className="font-semibold">{nextTask}</span>
      <span className="text-sm text-text-muted sm:ml-auto">VICO.md의 첫 번째 미완료 항목</span>
    </section>
  );
}

function StageBlock({ stage, status }: { stage: Stage; status: ProjectView['status'] }) {
  const done = stage.items.filter((item) => item.done).length;
  const total = stage.items.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {stage.name ? <h3 className="shrink-0 font-bold">{stage.name}</h3> : null}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-track">
          <div
            className={`h-full rounded-full ${STATUS_CLASS[status].bar}`}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[13px] text-text-muted">
          {done}/{total}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stage.items.map((item, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: 정적 목록이고 같은 문구가 여러 번 나올 수 있다
            key={`${index}-${item.text}`}
            className={`flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[15px] ${
              item.done ? 'bg-muted text-text-muted' : 'border border-border bg-surface'
            }`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-bold ${
                item.done ? 'bg-mint text-bg' : 'border border-border-strong'
              }`}
            >
              {item.done ? '✓' : ''}
            </span>
            <span>
              <span className="sr-only">{item.done ? '완료: ' : '미완료: '}</span>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 진행 체크리스트: 단계별 진행률 바 + 항목 그리드. */
export function ChecklistSection({ project }: { project: ProjectView }) {
  return (
    <section aria-labelledby="checklist-title" className={`${SECTION} flex flex-col gap-6`}>
      <h2 id="checklist-title" className="text-xl font-bold">
        진행 체크리스트
      </h2>
      {project.stages.length === 0 ? (
        <p className="text-[15px] text-text-muted">
          체크리스트가 비어 있어요. VICO.md에 <code className="font-mono">- [ ] 할 일</code>{' '}
          형식으로 적으면 여기에 보여요.
        </p>
      ) : (
        project.stages.map((stage, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 정적 목록이고 단계 이름이 없거나 겹칠 수 있다
          <StageBlock key={`${index}-${stage.name ?? ''}`} stage={stage} status={project.status} />
        ))
      )}
    </section>
  );
}

function ContactValue({ contact }: { contact: string }) {
  if (/^https:\/\/\S+$/.test(contact)) {
    return (
      <a href={contact} rel="noopener noreferrer" className="break-all underline">
        {contact}
      </a>
    );
  }
  return <span className="break-all font-mono">{contact}</span>;
}

/** 팀원 모집 배너 (deep). 모집 중이고 휴면이 아닐 때만. */
export function RecruitBanner({
  project,
  discordUrl,
}: {
  project: ProjectView;
  discordUrl: string;
}) {
  if (!project.recruiting || project.status === 'dormant') return null;
  return (
    <section className="flex flex-col gap-4 rounded-section border border-border bg-deep p-6 text-white">
      <h2 className="text-xl font-bold">이 프로젝트는 팀원을 찾고 있어요</h2>
      <div className="flex flex-wrap gap-2">
        {project.lookingFor.map((position) => (
          <span
            key={position}
            className="rounded-full bg-white/10 px-3 py-1 text-[15px] font-semibold text-white"
          >
            {position}
          </span>
        ))}
      </div>
      {project.contact ? (
        <p className="text-[15px] text-deep-text">
          연락처: <ContactValue contact={project.contact} />
        </p>
      ) : null}
      {discordUrl ? (
        <a
          href={discordUrl}
          rel="noopener noreferrer"
          className={`${BUTTON} self-start bg-white text-deep hover:bg-deep-text`}
        >
          #팀원모집에서 이야기하기
        </a>
      ) : null}
    </section>
  );
}

/** 비슷한 프로젝트 작은 카드. 카드 전체가 상세 링크. */
export function SimilarCard({ project }: { project: ProjectView }) {
  return (
    <a
      href={projectPath(project)}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[13px] text-text-muted">@{project.owner}</span>
        <StatusBadge status={project.status} />
      </div>
      <span className="font-bold leading-snug">{project.title}</span>
      <span className="text-sm text-text-muted">
        진행률 <span className="font-mono font-bold text-text">{project.progress}%</span>
        <span className="sr-only"> · 상태 {STATUS_LABEL[project.status]}</span>
      </span>
    </a>
  );
}
