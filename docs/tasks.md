# Vico 작업 목록

위에서부터 순서대로 진행한다. 작업마다 브랜치 하나, PR 하나. 끝나면 완료 기준을 확인하고 `[x]`로 바꾼다.
모든 작업의 공통 완료 기준: `pnpm check` 통과, 새 로직에는 테스트.

## 단계 1. 기반

- [x] **T01. 프로젝트 뼈대**
  - `git init` (아직 레포가 아니면), pnpm + Astro(static) + React + Tailwind + TypeScript strict 설정
  - Biome, Vitest 설정. `pnpm check` = `astro check && biome check . && vitest run` (`astro check`가 `lib/`, `scripts/`의 .ts도 검사하도록 tsconfig `include` 확인)
  - 스크립트 실행은 `tsx` (`"collect": "tsx scripts/collect.ts"` 등)
  - `package.json`의 `engines.node`와 `.nvmrc`에 Node LTS 버전 고정 (Cloudflare Pages 빌드와 맞추기 위함)
  - CLAUDE.md의 폴더 구조대로 빈 폴더/파일 생성, `.gitignore`(`.env`, `dist`, `node_modules`), `.env.example`(`GITHUB_TOKEN=`)
  - `vico.config.ts` 작성 (spec.md 6절 값 그대로)
  - Tailwind v4 `@theme`(`src/styles/global.css`)에 design.md 1절 토큰 등록, 글꼴 로드 (design.md 1절)
  - 완료 기준: `pnpm dev`로 빈 페이지가 뜨고 `pnpm check`, `pnpm build`가 통과

- [x] **T02. 스키마와 타입 (`lib/schema.ts`)**
  - VICO.md frontmatter zod 스키마 (spec.md 3절 표의 모든 규칙: 글자 수, recruiting일 때 필수 필드, contact의 이메일/전화번호 거부, demo URL, status 공백 무시). 빈 값(`contact:` → `null`)과 빈 배열 허용
  - 도구 이름 정규화 함수 (알려지지 않은 도구는 그대로 유지)
  - `Project`, `ProjectsData` 타입과 zod 스키마 (spec.md 6절)
  - 완료 기준: 정상/실패 케이스 테스트 각 5개 이상

- [x] **T03. VICO.md 파서 (`lib/parse.ts`, `lib/progress.ts`)**
  - gray-matter로 frontmatter/본문 분리 → 스키마 검증
  - 체크박스 인식(`- [ ]`, `- [x]`, `- [X]`, `* [ ]`), `##` 기준 단계 묶기, 첫 `##` 이전 항목 처리, 링크/강조 제거
  - HTML 주석과 코드 블록 안은 무시 (spec.md 3절)
  - done, total, progress(반올림, total 0이면 0), nextTask 계산
  - 이전/현재 단계 목록을 받아 새로 완료된 항목을 찾는 `findNewlyCompleted(prev, next)` (spec.md F-15: 이전에 같은 텍스트로 미완료였던 항목만, prev가 없으면 빈 결과)
  - 완료 기준: 제목 없음, 제목 여러 개, 빈 체크리스트, 전부 완료, 중첩 목록, 대문자 X, **`templates/VICO.md` 원본 파싱(단계 3개·항목 5개)**, 주석/코드 블록 속 `##`·체크박스 무시, 문구가 바뀐 항목은 새로 완료로 안 셈 테스트 포함

- [x] **T04. 상태와 추천 (`lib/status.ts`, `lib/similar.ts`)**
  - `getStatus(project, now, config)` → 활발/잠잠/휴면/완료 (spec.md 4절 판정 순서, 경과일 = 내림)
  - `getDormantSince(project, config)` → 휴면 시작일 (spec.md 4절)
  - `isActive(status)` (활발 또는 잠잠), `countActiveByOwner(projects, now)`
  - `relativeDay(date, now)` → "오늘" / "N일 전"
  - `getSimilar(project, all, now)` (spec.md 5절 F-16 규칙)
  - `getHighlight(all, now)` (F-15 규칙: `lastCompleted.at` 기준, 휴면 제외)
  - 완료 기준: 경계값(14일 23시간=활발, 15일, 45일 23시간=잠잠, 46일) 테스트, status: 중단/완료 우선순위 테스트, 체크박스 0개는 완료 아님 테스트, 중단 프로젝트의 휴면 시작일 테스트

- [x] **T05. 데이터 읽기와 예시 데이터 (`lib/data.ts`, `data/sample.data.json`)**
  - `loadData()`: `data/projects.data.json`이 있으면 그것, 없으면 `sample.data.json` (날짜를 now 기준으로 옮김, spec.md 6절)
  - 화면용 헬퍼: 상태 계산이 붙은 목록, 아이디별 목록, 통계(F-10)
  - 예시 데이터 9개: 활발 4, 잠잠 2, 완료 2, 휴면 1 / 모집 중 3 / 단계가 있는 것과 없는 것 섞기 / 도구 4종. 디자인 캔버스의 예시 프로젝트를 그대로 써도 된다
  - 완료 기준: 예시 데이터가 `ProjectsData` 스키마를 통과하는 테스트

## 단계 2. 화면

design.md를 기준으로 만든다. 컴포넌트는 React, 페이지는 Astro.

- [x] **T06. 공통 컴포넌트**
  - design.md 2절 표의 컴포넌트 전부 (FilterBar 제외)
  - 완료 기준: 개발용 페이지 `/dev/components`에서 상태 4종, 모집 유무, 단계 유무, 체크박스 0개 조합을 한 번에 확인 가능 (빌드 결과에는 포함하지 않음)
  - 구현 방법: `src/pages/dev/[page].astro`의 `getStaticPaths`가 `import.meta.env.DEV`일 때만 `components`를 돌려준다. (Astro는 `_`로 시작하는 파일을 라우팅에서 아예 빼서 `/_components`는 개발 서버에서도 열리지 않음)

- [x] **T07. 메인 화면 `/`**
  - design.md 3.1. FilterBar는 `client:load`, 나머지는 정적
  - 필터/정렬/검색은 브라우저에서 처리. 탭 상태를 URL 쿼리(`?tab=recruit&tool=Cursor&sort=stars`)에 반영해 공유 가능하게
  - "모집 중만 보기" 동작
  - 완료 기준: 예시 데이터로 탭별 개수가 맞고, 휴면은 진행중 탭과 팀원 모집 탭에 안 나오고, 하이라이트 대상이 없으면 영역이 숨겨짐

- [x] **T08. 프로젝트 상세 `/p/[owner]/[repo]`**
  - design.md 3.2. `getStaticPaths`로 전체 프로젝트 생성
  - 뱃지 마크다운 복사 버튼만 `client:visible`
  - 완료 기준: 단계 없는 프로젝트, 완료 프로젝트(다음 할 일 숨김), 모집 없는 프로젝트(배너 숨김), demo 없는 프로젝트 모두 정상 표시

- [x] **T09. 프로필 `/u/[id]`**
  - design.md 3.3. 등록 프로젝트가 있는 아이디만 생성
  - 완료 기준: 진행중 3개인 아이디는 "하나 더 올리기" 카드가 없음

- [x] **T10. 참여하기 `/join`**
  - design.md 3.4. 템플릿은 `templates/VICO.md` 파일 내용을 빌드 시 읽어서 표시 (복사본을 하드코딩하지 않음)
  - "projects.json 열기" 링크: `{config.repoUrl}/edit/main/projects.json`
  - 완료 기준: 템플릿을 고치면 페이지에도 반영됨

- [x] **T11. README 뱃지 `/badge/[owner]/[repo].svg`**
  - design.md 3.5. Astro 엔드포인트 + `getStaticPaths`
  - 완료 기준: 상태 4종 SVG 스냅샷 테스트, 빌드 결과 `dist/badge/…svg` 생성

- [x] **T12. 반응형과 접근성 점검**
  - design.md 4절. 390px, 768px, 1280px에서 가로 스크롤 없음
  - 키보드만으로 탭/칩/카드 이동 가능, 포커스 표시 보임
  - 완료 기준: 점검 결과를 PR 설명에 체크리스트로 남김

## 단계 3. 자동화

- [x] **T13. 수집 스크립트 `scripts/collect.ts`**
  - spec.md 7절 A-01. Octokit, 동시 5개, 재시도 2번, 레이트 리밋 대기
  - 이전 `projects.data.json`을 읽어 `lastCompleted`, `registeredAt`, `errors[].since` 이어받기
  - 결과가 같으면 파일을 쓰지 않음(generatedAt 제외 비교)
  - GitHub API 호출 부분은 주입 가능하게 만들어 테스트에서 가짜 응답 사용
  - 완료 기준: 가짜 응답으로 정상/레포 없음/비공개/VICO.md 없음/frontmatter 오류/첫 수집 시 lastCompleted null/연속 실패 since 유지 테스트, 로컬에서 실제 레포 1~2개로 `pnpm collect` 성공

- [x] **T14. 등록 검증 `scripts/validate.ts`**
  - spec.md 7절 A-03의 검사(0~7). base 브랜치의 projects.json과 비교해 새로 추가된 레포만 검사
  - 입력은 파일 경로 인자로 받는다 (`tsx scripts/validate.ts --base projects.json --head /tmp/pr-projects.json`). 워크플로가 base 코드로 PR의 projects.json만 읽게 하기 위함
  - 결과를 마크다운 표로 출력 (워크플로에서 PR 코멘트로 사용)
  - 완료 기준: 각 실패 사유별 테스트, 실패 시 exit code 1

- [x] **T15. 리마인더와 정리 `scripts/maintain.ts`**
  - spec.md 7절 A-04. 기본 dry-run으로 할 일만 출력, `--apply`일 때만 이슈/PR 생성
  - 중복 이슈/PR 방지 (활동일 이후 만든 `[Vico]` 이슈가 닫혀 있어도 다시 열지 않음)
  - 완료 기준: dry-run 출력 테스트 (예시 데이터 + 고정된 now), 닫힌 리마인더가 있으면 건너뜀 테스트, 중단 프로젝트 정리 시점 테스트

- [x] **T16. GitHub Actions 워크플로**
  - `ci.yml`: 모든 PR에서 `pnpm check` + `pnpm build`
  - `collect.yml`: cron `0 */3 * * *`, `projects.json` push, workflow_dispatch. 바뀐 경우만 `chore(data): update projects data` 커밋, `VICO_DEPLOY_KEY`로 push. concurrency 그룹 설정
  - `validate.yml`: `projects.json`을 바꾸는 pull_request. base 코드 체크아웃 + PR의 projects.json만 읽기, 결과를 artifact로 (spec.md A-03)
  - `validate-comment.yml`: validate의 workflow_run. artifact로 코멘트 작성/갱신, 체크아웃 없음, `pull-requests: write`만
  - `maintain.yml`: cron `5 15 * * *`(KST 0시 5분) + workflow_dispatch, `--apply`, 마지막에 Deploy Hook 호출 (A-05)
  - 모든 워크플로에 `permissions`를 필요한 만큼만 명시
  - 비밀값: `VICO_BOT_TOKEN`, `VICO_DEPLOY_KEY`, `CF_DEPLOY_HOOK_URL`
  - 완료 기준: 워크플로 문법 검사(actionlint) 통과, README에 필요한 Secrets 목록 기재

## 단계 4. 배포와 마무리

- [x] **T17. 배포 문서와 README**
  - README.md: Vico 소개, 참여 방법 요약(→ /join), 로컬 개발 방법, Secrets, Cloudflare Pages 설정(빌드 명령 `pnpm build`, 출력 `dist`, Node 버전)
  - `templates/VICO.md` 최종 확인
  - 완료 기준: README만 보고 새 PC에서 `pnpm dev`까지 가능

- [ ] **T18. 첫 실제 데이터로 점검**
  - 관리자 본인 레포 1~2개를 `projects.json`에 넣고 collect → build → 화면 확인
  - 완료 기준: 실제 데이터로 메인, 상세, 프로필, 뱃지가 모두 정상

## 사람이 직접 해야 하는 일 (Claude Code가 하지 않음)

- [ ] GitHub에 `vico` 레포 생성, main에 Ruleset 설정 (PR 필수, ci 통과 필수, **bypass 목록에 "Deploy keys" 추가**)
- [ ] 배포 키 생성 (`ssh-keygen -t ed25519`) → 공개 키는 레포 Deploy keys에 "Allow write access"로, 개인 키는 Secrets `VICO_DEPLOY_KEY`로 등록
- [ ] 봇 계정 `vico-bot` 생성 → classic PAT(`public_repo` 스코프만) 발급 → Secrets에 `VICO_BOT_TOKEN` 등록 → 봇을 vico 레포에 Write 협업자로 초대
- [ ] 레포 Settings → Actions: "Require approval for first-time contributors" 유지 (포크 PR 검사는 관리자 승인 후 실행)
- [ ] Cloudflare 계정에서 Pages 프로젝트 생성, GitHub 레포 연결, Deploy Hook 만들어 Secrets `CF_DEPLOY_HOOK_URL`에 등록
- [ ] Cloudflare Pages 무료 플랜의 월 빌드 한도 확인 (수집 최대 약 240회 + 매일 재빌드 30회 + 일반 머지)
- [ ] 디스코드 서버와 #팀원모집 채널 만들고 초대 링크를 `vico.config.ts`의 `discordUrl`에, 실제 레포 주소를 `repoUrl`에 입력

## 제안

(작업 중 문서에 없는 기능이 필요해 보이면 여기에 적는다)

- **리마인더 끄기 옵션**: frontmatter에 `reminder: false`를 두면 봇 이슈를 열지 않음. 지금은 "이슈 기능을 끄면 안 받음"으로 안내만 한다.
- **projects.json 충돌 줄이기**: 등록 PR이 동시에 여러 개 오면 배열 끝에서 충돌이 잦다. 사람이 늘면 알파벳 순 정렬을 강제하거나(삽입 위치가 흩어짐), `projects/{owner}__{repo}` 파일 하나씩으로 바꾸는 방안을 검토.
- **포크 저장소 등록 처리**: 포크 레포를 등록하면 원본 프로젝트와 헷갈릴 수 있다. 검증에서 경고로 표시하는 방안.
