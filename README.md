# Vico

바이브 코딩 프로젝트를 등록하면 진행률, GitHub 스타, 활동 상태를 한 화면에서 보여주는 커뮤니티 보드예요.
서버와 DB 없이 GitHub Actions가 데이터를 모으고 Cloudflare Pages가 정적 사이트를 배포해요.

- 기능 정의: [docs/spec.md](docs/spec.md)
- 화면 구성: [docs/design.md](docs/design.md)
- 작업 순서: [docs/tasks.md](docs/tasks.md)

## 참여하기

자세한 안내와 자주 묻는 질문은 사이트의 **/join** 페이지에 있어요. 요약하면 이래요.

1. 공개 레포 루트에 [`templates/VICO.md`](templates/VICO.md)를 복사해 `VICO.md`로 두고, 제목·소개·도구·체크리스트를 채워요 (체크리스트 3개 이상).
2. 이 레포의 [`projects.json`](projects.json)에 `"github.com/{owner}/{repo}"`를 한 줄 추가하는 PR을 보내요. 한 사람당 진행 중인 프로젝트는 3개까지예요.
3. PR에 검증 결과 코멘트가 달려요. 통과하고 머지되면 3시간 안에 사이트에 나타나요.
4. 이후에는 자기 레포의 `VICO.md` 체크박스만 고치면 진행률이 따라 바뀌어요.

## 로컬 개발

### 준비물

- **Node.js 24** (LTS). 버전은 [`.nvmrc`](.nvmrc)에 있어요. nvm/fnm을 쓰면 `nvm use`나 `fnm use`로 맞출 수 있어요.
- **pnpm**. Node에 들어 있는 corepack으로 켜면 `package.json`의 `packageManager`에 적힌 버전이 쓰여요.

```sh
corepack enable
```

Windows에서 Node가 `C:\Program Files`에 깔려 있으면 `corepack enable`이 권한 오류(EPERM)를 낼 수 있어요. 관리자 터미널에서 다시 하거나, 대신 `npm install -g pnpm`으로 설치해요.

### 실행

```sh
git clone https://github.com/FrenchRuin/vico.git
cd vico
pnpm install
pnpm dev
```

브라우저에서 http://localhost:4321 을 열어요. `data/projects.data.json`이 없으면 `data/sample.data.json` 예시 데이터로 화면을 보여줘요. 이때 날짜는 오늘 기준으로 옮겨서 활동 상태가 그럴듯하게 나와요.

### 명령어

| 명령 | 하는 일 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 정적 빌드 → `dist/` |
| `pnpm preview` | 빌드 결과를 로컬에서 확인 |
| `pnpm check` | 타입 검사 + Biome + Vitest. PR 전에 통과해야 해요 |
| `pnpm format` | Biome로 자동 정리 |
| `pnpm collect` | 실제 GitHub에서 수집 → `data/projects.data.json` |
| `pnpm validate` | `projects.json` 검증 |
| `pnpm maintain` | 리마인더/정리 미리보기 (dry-run). `--apply`일 때만 실제로 이슈와 PR을 만들어요 |

### 실제 데이터로 보기

`collect`와 `validate`는 GitHub 토큰이 필요해요. `.env.example`을 `.env`로 복사하고 토큰을 넣어요. 공개 레포를 읽기만 하므로 fine-grained 토큰의 "Public repositories (read-only)"면 충분해요. `maintain` 미리보기는 토큰 없이 collect 결과만 있으면 되고, `--apply`는 봇 토큰이 필요해서 보통 워크플로에서만 돌려요.

```sh
cp .env.example .env
# .env 안의 GITHUB_TOKEN= 뒤에 토큰을 붙여 넣기
pnpm collect
pnpm dev
```

`.env`와 `data/projects.data.json`의 수동 수정본은 커밋하지 마세요. 데이터 파일은 collect 워크플로만 커밋해요.

## 배포 (Cloudflare Pages)

Cloudflare 대시보드 → Workers & Pages → Create → **Pages** 탭 → Import an existing Git repository에서 이 레포를 고르고 아래처럼 설정해요.

> Create를 누르면 **Workers** 탭이 기본으로 선택돼 있어요. Workers로 만들면 `wrangler deploy` 단계에서 실패해요. 설정 화면에 "Deploy command" 칸이 있으면 Workers로 들어온 거예요.

| 항목 | 값 |
| --- | --- |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| 환경 변수 | `NODE_VERSION=24`, `PNPM_VERSION=10.34.5` (빌드 환경 기본값과 버전을 맞추기 위함) |
- 데이터는 collect가 main에 커밋할 때마다 다시 배포돼요. 커밋이 없는 날에도 활동 상태(며칠 지났는지)가 바뀌어야 해서, maintain이 매일 Deploy Hook으로 한 번 더 빌드해요. Settings → Builds → Deploy hooks에서 훅을 만들고 주소를 `CF_DEPLOY_HOOK_URL` Secret에 넣어요.
- 무료 플랜은 월 빌드 횟수 제한이 있어요. 수집 커밋(최대 약 240회) + 매일 재빌드(30회) + 일반 머지를 합쳐서 한도 안인지 확인해요.
- 사이트 주소는 `https://vico-6eo.pages.dev`예요 (`vico`라는 이름은 이미 쓰이고 있었어요). 주소가 바뀌면 `vico.config.ts`의 `siteUrl`을 고쳐요. 뱃지 링크와 공유 주소에 쓰여요.

## GitHub Actions

| 워크플로 | 언제 | 하는 일 |
| --- | --- | --- |
| `ci.yml` | 모든 PR, main push (`data/`만 바뀐 경우 제외) | `pnpm check`, `pnpm build`, actionlint |
| `collect.yml` | 3시간마다, `projects.json`이 main에 바뀔 때, 수동 | `pnpm collect` → 바뀌었으면 `chore(data): update projects data` 커밋 |
| `validate.yml` | `projects.json`을 바꾸는 PR | 새로 추가된 레포 검사 → 결과를 artifact로 |
| `validate-comment.yml` | validate가 끝났을 때 | 결과를 PR 코멘트로 작성/갱신 |
| `maintain.yml` | 매일 KST 0시 5분, 수동 | 리마인더 이슈, 정리 PR, Cloudflare 다시 빌드 |

## 필요한 Secrets

레포 Settings → Secrets and variables → Actions에 등록해요.

| 이름 | 쓰는 곳 | 만드는 법 |
| --- | --- | --- |
| `VICO_BOT_TOKEN` | collect, maintain | 봇 계정(`vico-bot-kr`)의 **classic PAT, `public_repo` 스코프만**. 남의 레포에 이슈를 열어야 해서 fine-grained 토큰은 안 돼요. 봇 계정을 이 레포에 Write 협업자로 초대해 주세요 |
| `VICO_DEPLOY_KEY` | collect | `ssh-keygen -t ed25519 -C vico-collect -f vico_deploy -N ""`로 만든 **개인 키** 내용. 공개 키(`vico_deploy.pub`)는 Settings → Deploy keys에 **Allow write access**로 등록 |
| `CF_DEPLOY_HOOK_URL` | maintain | Cloudflare Pages → 프로젝트 → Settings → Builds → Deploy hooks에서 만든 주소. 없으면 매일 다시 빌드만 건너뛰어요 |

`GITHUB_TOKEN`은 Actions가 자동으로 줘요. validate는 이 읽기 전용 토큰만 써서 포크 PR에서도 Secrets가 노출되지 않아요.

## 레포 설정

- **main Ruleset**: PR 필수, `ci / check` 통과 필수, bypass 목록에 **Deploy keys** 추가 (collect의 데이터 커밋만 바로 push하기 위함). `validate`는 `projects.json`을 바꾸는 PR에서만 돌기 때문에 필수 체크로 두지 않아요.
- **Actions → General**: "Allow GitHub Actions to create and approve pull requests"는 꺼 둬도 돼요 (정리 PR은 봇 토큰으로 만들어요). "Require approval for first-time contributors"는 켜 두세요. 처음 온 PR은 관리자가 승인한 뒤에 검사가 돌아요.
- **공개 레포**: 참여자가 PR을 보내려면 레포가 공개여야 해요.
- **`vico.config.ts`**: `repoUrl`(이 레포 주소), `discordUrl`(#팀원모집 채널 초대 링크)을 채워요.
