# Vico 기능 정의

## 1. 개요

Vico는 각자 진행 중인 바이브 코딩 프로젝트를 등록하면, 진행률과 GitHub 스타 수, 최근 활동을 한 화면에서 보여주는 커뮤니티예요. 팀원 모집도 함께 해요.

- 대상: AI 도구(Claude Code, Cursor 등)로 프로젝트를 만드는 개발자와 비개발자
- 운영 원칙: 서버와 DB 없이 운영비 0원. 등록은 PR 하나.
- 주소: `vico.pages.dev` (Cloudflare Pages 기본 주소. 이름이 이미 쓰이고 있으면 뒤에 글자가 붙을 수 있음)

## 2. 사용자 역할

| 역할 | 하는 일 | 필요한 것 |
| --- | --- | --- |
| 방문자 | 둘러보기, 필터/정렬/검색, 팀원 모집 보고 연락 | 없음 |
| 참여자 | 자기 레포에 VICO.md 작성, 등록 PR 제출, 체크리스트 업데이트 | GitHub 계정, 공개 레포 |
| 관리자 | 등록 PR 승인, 휴면 정리 PR 승인 | 이 레포 권한 |

## 3. VICO.md 형식

참여자 레포 루트에 `VICO.md`를 둔다. 템플릿은 `templates/VICO.md`.

```markdown
---
title: 커뮤니티 인기글 모아보기
summary: 국내 커뮤니티 인기글을 한곳에서 보는 앱
tools: [Claude Code, Cursor]
status: 진행중
recruiting: true
looking_for: [프론트엔드 1명, 디자이너]
contact: "discord: minji_dev"
demo: https://example.com
---

## 기획
- [x] 아이디어 정리
- [x] PRD 작성

## 개발
- [x] 크롤러 구현
- [ ] 로그인

## 출시
- [ ] 배포
```

### frontmatter

| 필드 | 필수 | 타입 | 규칙 |
| --- | --- | --- | --- |
| title | 필수 | string | 1~40자 |
| summary | 필수 | string | 1~50자 |
| tools | 필수 | string[] | 1개 이상. 표기 정규화: 대소문자/공백 무시하고 `vico.config.ts`의 알려진 도구 이름으로 맞춤 (예: `claude code` → `Claude Code`). 알려진 도구가 아니면 앞뒤 공백만 지우고 그대로 둔다 (실패 아님) |
| status | 필수 | enum | `진행중` / `완료` / `중단`. 공백은 무시하고 비교 (`진행 중`도 통과) |
| recruiting | 선택 | boolean | 기본 false |
| looking_for | recruiting이 true면 필수 | string[] | 1개 이상 |
| contact | recruiting이 true면 필수 | string | 디스코드 아이디 또는 오픈카톡 링크. **이메일, 전화번호 형식이면 검증 실패** |
| demo | 선택 | string | `https://`로 시작하는 URL |

선택 필드는 비워 두거나(`contact:`) 빈 배열(`looking_for: []`)이어도 통과해야 한다. 템플릿이 그렇게 되어 있다.

- 글자 수는 공백을 앞뒤로 지운 뒤 문자 단위로 센다 (이모지 1개 = 1자).
- `tools`에서 정규화 후 같은 도구가 여러 번 나오면 하나로 합친다.
- contact 판정 기준
  - 이메일: `아무것@아무것.아무것` 형태가 들어 있으면 실패.
  - 전화번호: 숫자와 구분자(공백, `-`, `.`, `(`, `)`, `+`)로만 이어진 덩어리에 숫자가 9~15개면 실패 (`010-1234-5678`, `+82 10 1234 5678`, `01012345678`). 디스코드 숫자 ID(17자리 이상)와 오픈카톡 링크 코드(영문 섞임)는 걸리지 않는다.
- 필드 오류 메시지는 한국어로, 참여자가 무엇을 고치면 되는지 알 수 있게 쓴다 (validate 코멘트에 그대로 나감).

### 본문 규칙

- 진행률 = 체크된 항목 수 ÷ 전체 체크박스 수 × 100 (반올림 정수). 단, 미완료 항목이 하나라도 있으면 최대 99 (199/200이 반올림으로 100%가 되어 완료 처리되는 것을 막기 위함). 체크박스는 `- [ ]`, `- [x]`, `- [X]`, `* [ ]` 모두 인식. 들여쓴(중첩) 체크박스도 항목 하나로 센다.
- 체크박스가 0개면 진행률 0, 다음 할 일 없음. 이 경우 진행률 100% 규칙으로 완료 처리하지 않는다 (등록 후 체크리스트를 지운 경우 대비. 수집 오류로 보지 않음).
- **HTML 주석(`<!-- -->`)과 코드 블록(```` ``` ````) 안의 내용은 무시한다.** 제목도 체크박스도 아니다. (템플릿 안내 주석이 단계로 잡히는 것을 막기 위함)
- **단계(F-13)**: `##` 제목 아래의 체크박스는 그 제목을 단계 이름으로 묶는다. 첫 `##` 이전의 체크박스나, `##` 제목이 하나도 없으면 단계 이름 없이 하나의 단계로 본다. `###` 이하 제목은 단계를 나누지 않는다.
- **다음 할 일(F-12)**: 문서 위에서부터 처음 나오는 미완료 항목. 모두 완료면 없음.
- 체크박스 텍스트의 마크다운 링크와 강조는 텍스트만 남긴다.

## 4. 활동 상태

활동일 = `max(기본 브랜치 마지막 커밋 시각, VICO.md 마지막 커밋 시각)`

> 레포의 `pushed_at`은 쓰지 않는다. 아무 브랜치 push(봇 브랜치 포함)에도 바뀌어서 실제 진행과 상관없이 활발로 보이기 때문.

경과일 = `floor((now - 활동일) / 24시간)`. 시간대와 상관없이 경과 시간으로만 센다.

| 상태 | 기준 (기본값, `vico.config.ts`) | 메인 화면 |
| --- | --- | --- |
| 완료 | 진행률 100%(체크박스 1개 이상) 또는 status: 완료 | 완성작 탭 (휴면 처리 안 함) |
| 활발 | 경과일 0~14 (`activeDays`) | 진행중 탭 위쪽 |
| 잠잠 | 경과일 15~45 (`quietDays`) | 진행중 탭 아래쪽 |
| 휴면 | 경과일 46 이상, 또는 status: 중단 | 휴면 탭 |

판정 순서: 완료 → 중단(휴면) → 날짜 기준. 휴면 프로젝트가 다시 활동하면 다음 수집 때 자동으로 활발로 돌아온다.

**휴면 시작일** (정리 기준): 날짜 기준 휴면이면 `활동일 + quietDays + 1일`, status: 중단이면 `vicoUpdatedAt` (중단으로 바꾼 커밋 시각으로 본다). `lib/status.ts`의 `getDormantSince`가 계산한다.

"진행중 프로젝트" = 상태가 활발 또는 잠잠인 프로젝트. GitHub 아이디당 최대 3개 (`maxActivePerOwner`). 여기서 "아이디"는 레포 owner이며 조직(organization)도 하나의 아이디로 본다. 이 제한은 등록 검증(A-03)에서만 막는다. 휴면이 다시 살아나 3개를 넘는 경우는 그대로 둔다.

## 5. 기능 목록

| ID | 기능 | 설명 | 우선순위 |
| --- | --- | --- | --- |
| F-01 | 프로젝트 등록 | `projects.json`에 레포 주소를 PR로 추가. 관리자 승인 시 등록 | 필수 |
| F-02 | 등록 가이드 | `/join` 페이지: VICO.md 템플릿, PR 방법, 검사 조건, 상태 기준, FAQ | 필수 |
| F-03 | 프로젝트 목록 | 카드형 목록 (화면은 design.md) | 필수 |
| F-04 | 필터 | 탭(진행중/팀원 모집/완성작/휴면), 도구별 | 필수 |
| F-05 | 정렬 | 최근 업데이트순(기본) / 스타순 / 진행률순 | 필수 |
| F-06 | 프로젝트 상세 | `/p/[owner]/[repo]` | 필수 |
| F-07 | 팀원 모집 | 모집 표시, 메인의 모집 줄, 상세의 모집 배너, 팀원 모집 탭. 휴면 프로젝트는 모집 줄과 모집 탭에서 제외 | 필수 |
| F-08 | 휴면/완성작 탭 | 메인 탭으로 제공 | 필수 |
| F-09 | 검색 | 제목, 소개 텍스트 검색 (브라우저에서 처리) | 권장 |
| F-10 | 커뮤니티 통계 | 등록 수, 지금 활발 수, 팀원 모집 수, 완성작 수 | 권장 |
| F-11 | 프로필 | `/u/[id]`: 그 사람의 진행중 프로젝트와 완성작 | 필수 |
| F-12 | 다음 할 일 | 첫 미완료 항목을 카드와 상세에 표시 | 필수 |
| F-13 | 단계별 체크리스트 | `##` 제목 기준으로 묶고 단계별 진행률 표시 | 필수 |
| F-14 | README 뱃지 | `/badge/[owner]/[repo].svg`. 진행률과 상태를 보여주는 SVG, 상세에서 마크다운 코드 복사 | 권장 |
| F-15 | 방금 완료 하이라이트 | 메인 상단에 체크리스트 항목을 가장 최근에 완료한 프로젝트와 "방금 완료한 항목" | 필수 |
| F-16 | 비슷한 프로젝트 | 상세 하단에 도구가 겹치는 프로젝트 최대 3개 | 권장 |

### 세부 규칙

- **F-15 방금 완료한 항목**: collect가 이전 `projects.data.json`과 비교해 새로 체크된 항목을 찾으면 `lastCompleted: { text, at }`로 저장한다 (`at`은 수집 시각, 여러 개면 문서에서 가장 아래 항목).
  - "새로 체크된 항목" = 이전 데이터에서 **같은 텍스트로 미완료**였고 지금 완료인 항목. 이전에 없던 텍스트(새로 추가하거나 문구를 고친 항목)는 체크돼 있어도 세지 않는다.
  - 이전 데이터에 그 프로젝트가 없으면(첫 수집) `lastCompleted`는 `null`. 이미 체크된 항목이 전부 "방금 완료"로 잡히는 것을 막기 위함.
  - 새로 체크된 항목이 없으면 이전 값을 유지한다.
  - 하이라이트 대상: 휴면이 아니고 `lastCompleted.at`이 `activeDays` 이내인 프로젝트 중 `lastCompleted.at`이 가장 최근인 것. 방금 100%를 찍어 완료가 된 프로젝트도 포함된다. 없으면 하이라이트 영역을 숨긴다.
- **F-16 비슷한 프로젝트**: 자기 자신과 휴면 제외, 겹치는 도구 수 내림차순 → 활동일 최신순, 최대 3개. 겹치는 도구가 없으면 섹션을 숨긴다.
- **F-14 뱃지**: 빌드 시 Astro 엔드포인트(`getStaticPaths`)로 정적 SVG 생성. 왼쪽 `vico`, 오른쪽 `{진행률}% · {상태}`. 상태별 색은 design.md. 마크다운: `[![vico](https://vico.pages.dev/badge/{owner}/{repo}.svg)](https://vico.pages.dev/p/{owner}/{repo})`.
- **F-10 지금 활발**: 상태가 활발인 프로젝트 수 (기준이 14일이라 "이번 주"라고 부르지 않는다).
- **F-04/F-05/F-09 URL 쿼리**: `?tab=ongoing|recruit|done|dormant&tool={도구 이름|other}&sort=recent|stars|progress&q={검색어}`. 기본값(진행중, 전체 도구, 최근 업데이트, 검색 없음)은 쿼리에서 뺀다. 모르는 값은 기본값으로 본다. 탭 개수는 도구와 검색 조건을 적용한 뒤의 개수. 스타순/진행률순은 같으면 최근 업데이트순.
- **F-04 도구 칩**: 데이터에 있는 알려진 도구(`knownTools` 순서) + 알려지지 않은 도구가 하나라도 있으면 마지막에 "기타" 칩. 칩이 끝없이 늘어나는 것을 막기 위함.

## 6. 데이터

### projects.json

```json
[
  "github.com/minji-dev/community-hot",
  "github.com/hoon/meeting-summary-bot"
]
```

- 문자열 배열. 형식: `github.com/{owner}/{repo}` (https:// 없이, 끝 슬래시 없이)
- 중복 금지. 대소문자 무시하고 비교.
- 화면 경로(`/p/…`, `/u/…`, 뱃지)의 owner/repo는 GitHub API가 돌려준 실제 표기를 쓴다. 레포 이름이 바뀌거나 이전되면 API 결과를 따르고, 명단 주소는 관리자가 정리한다.

### data/projects.data.json (collect가 생성)

```ts
type ProjectsData = {
  generatedAt: string;          // ISO 시각
  projects: Project[];
  errors: { repo: string; reason: string; since: string }[];  // 수집 실패한 레포 (화면에는 안 보임). since = 연속 실패가 시작된 수집 시각 (이전 errors에 있으면 이어받음)
};

type Project = {
  owner: string;
  repo: string;
  url: string;                  // https://github.com/owner/repo
  title: string;
  summary: string;
  tools: string[];
  declaredStatus: '진행중' | '완료' | '중단';
  recruiting: boolean;
  lookingFor: string[];
  contact: string | null;
  demo: string | null;
  stages: { name: string | null; items: { text: string; done: boolean }[] }[];
  done: number;
  total: number;
  progress: number;             // 0~100 정수
  nextTask: string | null;
  lastCompleted: { text: string; at: string } | null;
  stars: number;
  language: string | null;
  lastCommitAt: string;         // 기본 브랜치 마지막 커밋
  vicoUpdatedAt: string;        // VICO.md 마지막 커밋
  activityAt: string;           // 둘 중 최신
  registeredAt: string;         // projects.json에 처음 들어온 날 (이전 데이터에 없으면 수집 시각)
};
```

- **상태(활발/잠잠/휴면/완료)는 저장하지 않는다.** 빌드 시 `lib/status.ts`가 `activityAt`과 빌드 시각으로 계산한다. 저장 데이터와 화면 규칙이 어긋나지 않게 하기 위함이다.
- 그래서 데이터가 안 바뀌어도 날짜가 지나면 상태와 "N일 전"이 바뀌어야 한다. **사이트는 하루 한 번 데이터 변경과 상관없이 다시 빌드한다** (A-05). 화면의 상대 시각은 "빌드 시각 기준"이다.

### data/sample.data.json (로컬 개발용)

- `data/projects.data.json`이 없을 때만 쓴다.
- 읽을 때 모든 시각을 `now - generatedAt`만큼 옮긴다. 고정된 날짜가 시간이 지나 전부 휴면이 되는 것을 막고, 예시가 항상 의도한 상태(활발/잠잠/휴면)로 보이게 하기 위함.

### vico.config.ts

```ts
export const config = {
  activeDays: 14,
  quietDays: 45,
  reminderDays: 30,
  removeAfterDormantDays: 90,   // 휴면 시작일(4절)부터 90일
  removeAfterErrorDays: 7,      // 수집 실패가 이만큼 계속되면 정리 PR에 포함
  maxStepBarItems: 20,          // 이보다 많으면 StepBar 대신 일반 진행률 바
  maxActivePerOwner: 3,
  similarLimit: 3,              // F-16 비슷한 프로젝트 최대 개수
  recruitRowLimit: 3,           // 메인 모집 줄 최대 개수
  minChecklistItems: 3,
  siteUrl: 'https://vico.pages.dev',
  repoUrl: 'https://github.com/{관리자}/vico',   // 실제 주소로 교체
  discordUrl: '',                                // #팀원모집 채널 초대 링크
  knownTools: ['Claude Code', 'Cursor', 'Windsurf', 'GitHub Copilot', 'Codex', 'Lovable', 'Bolt', 'Replit', 'v0'],
};
```

## 7. 자동화

### A-01 수집 (`scripts/collect.ts`, collect.yml)

- 실행: 3시간마다, `projects.json` 변경 시, 수동 실행
- 레포마다: 레포 정보(stars, language, default_branch, private 여부) → 기본 브랜치 마지막 커밋 시각(`GET /repos/{o}/{r}/commits?per_page=1`) → VICO.md 내용 → VICO.md 마지막 커밋 시각(`GET /repos/{o}/{r}/commits?path=VICO.md&per_page=1`)
- 레포가 없거나 비공개거나 VICO.md가 없거나 frontmatter가 깨졌으면 `errors`에 넣고 `projects`에서 뺀다 (명단에서는 지우지 않음).
- 이전 데이터와 비교해 `lastCompleted`, `registeredAt`, `errors[].since`를 이어받는다.
- 결과가 이전과 같으면(generatedAt 제외) 커밋하지 않는다.
- 동시 요청은 5개 이하로 제한. API 실패 시 2번 재시도. 레이트 리밋 응답(403/429)이면 `retry-after`/`x-ratelimit-reset`만큼 기다린다.
- 데이터 커밋은 **배포 키(`VICO_DEPLOY_KEY`)로 main에 push**한다. main 보호 규칙(Ruleset)은 PR을 요구하므로, Ruleset의 bypass 목록에 "Deploy keys"를 추가해 이 커밋만 통과시킨다. `GITHUB_TOKEN`으로는 보호 규칙을 통과할 수 없다.

### A-03 등록 검증 (`scripts/validate.ts`, validate.yml)

`projects.json`을 바꾸는 PR에서 실행. 새로 추가된 레포만 검사하고, 결과를 PR 코멘트 하나로 남긴다(다시 실행하면 같은 코멘트를 수정). 하나라도 실패하면 체크 실패.

**포크 PR 처리 (보안)**: 참여자 PR은 포크에서 오므로 `pull_request` 이벤트에서는 Secrets가 없고 토큰이 읽기 전용이라 코멘트를 쓸 수 없다. 그래서 두 워크플로로 나눈다.

- `validate.yml` (`pull_request`): **base 브랜치 코드를 체크아웃**하고, PR의 `projects.json`만 `git show`로 꺼내 데이터로 읽는다. PR 쪽 스크립트는 실행하지 않는다. 결과 마크다운과 PR 번호를 artifact로 올리고, 실패면 exit 1.
- `validate-comment.yml` (`workflow_run`, validate 완료 시): artifact를 받아 PR 코멘트를 작성/갱신한다. PR 번호는 숫자인지 확인한 뒤 쓴다 (포크 PR은 `workflow_run.pull_requests`가 비어 있어서 artifact로 전달). 코드는 체크아웃하지 않는다.
- 처음 기여하는 사람의 PR은 GitHub가 워크플로 실행 승인을 요구한다. 관리자가 "Approve and run"을 눌러야 검사가 돈다.

0. 등록 PR이 `projects.json` 외 다른 파일을 바꾸지 않는지 (바꾸면 "등록 PR이 아님"으로 표시하고 나머지 검사는 그대로 진행)
1. `projects.json`이 올바른 JSON 문자열 배열이고 형식이 맞는지
2. 중복이 아닌지
3. 레포가 존재하고 공개인지
4. 커밋이 1개 이상인지
5. VICO.md가 있고 frontmatter가 스키마를 통과하는지
6. 체크리스트 항목이 3개 이상인지
7. 이 레포를 추가해도 해당 아이디의 진행중 프로젝트가 3개 이하인지

### A-04 리마인더와 정리 (`scripts/maintain.ts`, maintain.yml)

매일 1회. 기본 dry-run, 워크플로에서만 `--apply`.

- 활동일이 30일(`reminderDays`) 지났고 완료도 중단도 아닌 프로젝트: 해당 레포에 리마인더 이슈를 연다. 봇 계정이 만든 제목 접두어 `[Vico]` 이슈 중 **활동일 이후에 만든 것이 하나라도 있으면(열림/닫힘 모두)** 다시 열지 않는다. 참여자가 이슈를 닫기만 해도 매일 다시 열리는 것을 막기 위함. 활동 기간 한 번에 리마인더는 최대 1번.
- 레포에 이슈 기능이 꺼져 있으면 건너뛰고 로그만 남긴다.
- 휴면 시작일(4절)에서 90일(`removeAfterDormantDays`) 지난 프로젝트: `projects.json`에서 빼는 PR을 하나 만든다(한 번에 여러 레포를 묶어서). 이미 열린 정리 PR이 있으면 갱신.
- 수집 실패의 `since`가 7일(`removeAfterErrorDays`) 넘은 레포: 정리 PR에 함께 포함.
- 리마인더 이슈와 정리 PR은 모두 `VICO_BOT_TOKEN`으로 만든다. `GITHUB_TOKEN`으로 만든 PR에서는 다른 워크플로(ci.yml)가 실행되지 않아, "CI 통과 필수" 규칙 때문에 머지할 수 없기 때문.

리마인더 이슈 본문 예시:

> 안녕하세요, Vico 봇이에요. 이 프로젝트가 30일 동안 업데이트가 없어서 알려드려요. VICO.md 체크리스트를 업데이트하면 다시 활발 상태로 보여요. 더 이상 진행하지 않는다면 `status: 중단`으로 바꿔 주세요.

### A-05 매일 다시 빌드 (maintain.yml의 마지막 단계)

maintain 실행 후 Cloudflare Pages Deploy Hook(`CF_DEPLOY_HOOK_URL`)을 POST로 호출한다. 데이터가 안 바뀌어도 상태와 상대 시각이 하루 단위로 갱신되게 하기 위함. 실행 시각은 KST 0시 직후 (cron `5 15 * * *`, UTC).

### 토큰

| 이름 | 위치 | 용도 |
| --- | --- | --- |
| `GITHUB_TOKEN` | Actions 기본 제공 | PR 코멘트(validate-comment), 읽기 |
| `VICO_DEPLOY_KEY` | 레포 Secrets (개인 키) + Deploy keys (공개 키, 쓰기 권한) | collect의 데이터 커밋을 main에 push. Ruleset bypass 대상 |
| `VICO_BOT_TOKEN` | 레포 Secrets | 다른 레포 읽기(수집), 리마인더 이슈, 정리 PR. 별도 봇 계정의 **classic PAT, `public_repo` 스코프만**. Fine-grained 토큰은 남의 레포에 이슈를 열 수 없다. 봇 계정은 vico 레포에 Write 권한 협업자로만 추가한다 |
| `CF_DEPLOY_HOOK_URL` | 레포 Secrets | 매일 다시 빌드 (A-05) |
| `GITHUB_TOKEN` (로컬 `.env`) | 각자 PC | 로컬에서 collect 실행 |

## 8. MVP 범위 밖

DB, 로그인, 웹에서 바로 등록, 댓글, 좋아요, 진행률 변화 그래프, 주간 순위. 날짜별 진행률 기록이 필요한 기능은 나중에 Cloudflare D1 또는 스냅샷 JSON으로 추가한다.
