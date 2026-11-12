import type { ReactNode } from 'react';
import type { ActivityStatus } from '../../lib/status';
import type { VicoConfig } from '../../vico.config';
import { StatusBadge } from './Badges';

type StepCardProps = {
  step: number;
  title: string;
  children: ReactNode;
};

/** 번호가 붙은 단계 카드. */
export function StepCard({ step, title, children }: StepCardProps) {
  return (
    <li className="flex gap-4 rounded-section border border-border bg-surface p-6">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-mono font-bold text-white"
      >
        {step}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className="text-lg font-bold">
          <span className="sr-only">{step}단계. </span>
          {title}
        </h2>
        {children}
      </div>
    </li>
  );
}

/** 어두운 배경 코드 블록. 가로로 길면 블록 안에서만 스크롤한다. */
export function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <section
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: 스크롤되는 영역은 키보드로도 닿아야 한다
      tabIndex={0}
      className="overflow-x-auto rounded-card bg-deep p-4"
    >
      <pre className="font-mono text-[13px] leading-relaxed text-deep-text">
        <code>{code}</code>
      </pre>
    </section>
  );
}

type StatusRow = { status: ActivityStatus; rule: string; where: string };

/** 활동 상태 기준. 숫자는 config에서 가져온다. */
export function statusRows(config: Pick<VicoConfig, 'activeDays' | 'quietDays'>): StatusRow[] {
  return [
    {
      status: 'active',
      rule: `마지막 업데이트가 ${config.activeDays}일 이내`,
      where: '진행중 탭 위쪽',
    },
    {
      status: 'quiet',
      rule: `마지막 업데이트가 ${config.activeDays + 1}~${config.quietDays}일 전`,
      where: '진행중 탭 아래쪽',
    },
    {
      status: 'dormant',
      rule: `${config.quietDays}일 넘게 업데이트가 없거나 status: 중단`,
      where: '휴면 탭',
    },
    {
      status: 'done',
      rule: '체크리스트를 모두 완료했거나 status: 완료',
      where: '완성작 탭',
    },
  ];
}

export function StatusTable({ config }: { config: Pick<VicoConfig, 'activeDays' | 'quietDays'> }) {
  return (
    <div className="overflow-hidden rounded-section border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs text-text-muted">
          <tr>
            <th scope="col" className="px-3 py-3 font-semibold sm:px-5">
              상태
            </th>
            <th scope="col" className="px-3 py-3 font-semibold sm:px-5">
              기준
            </th>
            <th scope="col" className="px-3 py-3 font-semibold sm:px-5">
              어디에 보이나요
            </th>
          </tr>
        </thead>
        <tbody>
          {statusRows(config).map((row) => (
            <tr key={row.status} className="border-b border-divider last:border-0">
              <td className="px-3 py-3.5 sm:px-5">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-3.5 sm:px-5">{row.rule}</td>
              <td className="px-3 py-3.5 text-text-sub sm:px-5">{row.where}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type FaqItem = { question: string; answer: ReactNode };

/** /join의 자주 묻는 질문. 숫자는 config에서 가져온다. */
export function joinFaqItems(
  config: Pick<VicoConfig, 'reminderDays' | 'removeAfterDormantDays'>,
): FaqItem[] {
  return [
    {
      question: '코드는 비공개로 두고 싶어요',
      answer: (
        <>
          Vico는 공개 레포의 VICO.md만 읽어요. 코드를 비공개로 두고 싶다면 VICO.md만 담은 공개
          레포를 따로 만들어 등록해도 돼요. 이때 업데이트 기준은 그 공개 레포의 커밋이에요.
        </>
      ),
    },
    {
      question: '정보를 고치고 싶어요',
      answer: <>레포의 VICO.md를 고쳐서 커밋하면 3시간 안에 Vico에도 반영돼요.</>,
    },
    {
      question: '프로젝트를 내리고 싶어요',
      answer: (
        <>
          projects.json에서 레포 주소를 지우는 PR을 보내 주세요. 잠시 쉬는 거라면 VICO.md의 status를{' '}
          <code className="font-mono">중단</code>으로 바꾸면 휴면 탭으로 옮겨져요. 휴면이 된 지{' '}
          {config.removeAfterDormantDays}일이 지나면 명단에서 자동으로 정리되고, 언제든 다시 등록할
          수 있어요.
        </>
      ),
    },
    {
      question: '봇이 이슈를 열었어요',
      answer: (
        <>
          {config.reminderDays}일 동안 업데이트가 없으면 vico-bot-kr이 알림 이슈를 한 번 열어요.
          닫아도 되고, 다시 업데이트하면 알림 주기가 초기화돼요. 레포의 이슈 기능을 꺼 두면 알림을
          받지 않아요.
        </>
      ),
    },
  ];
}

/** 자주 묻는 질문 (<details>). */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-card border border-border bg-surface open:pb-2"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold [&::-webkit-details-marker]:hidden">
            {item.question}
            <span
              aria-hidden="true"
              className="text-text-muted transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="px-5 pb-3 text-sm leading-relaxed text-text-sub">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
