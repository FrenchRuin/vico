/**
 * Vico의 숫자 기준값과 사이트 설정. 기준값은 이 파일에만 둔다 (CLAUDE.md).
 * 값의 의미는 docs/spec.md 4절, 6절, 7절 참고.
 */
export const config = {
  activeDays: 14,
  quietDays: 45,
  reminderDays: 30,
  removeAfterDormantDays: 90, // 휴면 시작일(spec 4절)부터 90일
  removeAfterErrorDays: 7, // 수집 실패가 이만큼 계속되면 정리 PR에 포함
  maxStepBarItems: 20, // 이보다 많으면 StepBar 대신 일반 진행률 바
  maxActivePerOwner: 3,
  similarLimit: 3, // 상세 하단 비슷한 프로젝트 최대 개수 (F-16)
  minChecklistItems: 3,
  siteUrl: 'https://vico.pages.dev',
  repoUrl: 'https://github.com/{관리자}/vico', // 실제 주소로 교체
  discordUrl: '', // #팀원모집 채널 초대 링크
  knownTools: [
    'Claude Code',
    'Cursor',
    'Windsurf',
    'GitHub Copilot',
    'Codex',
    'Lovable',
    'Bolt',
    'Replit',
    'v0',
  ],
} as const;

export type VicoConfig = typeof config;
