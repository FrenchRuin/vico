# Vico — Claude Code 작업 규칙

Vico는 바이브 코딩 프로젝트를 등록하면 진행률, GitHub 스타, 활동 상태를 한 화면에 보여주는 커뮤니티 사이트다.
참여자는 자기 레포에 `VICO.md`를 두고, 이 레포의 `projects.json`에 레포 주소를 PR로 추가한다.
서버와 DB 없이 GitHub Actions가 데이터를 모으고 Cloudflare Pages가 정적 사이트를 배포한다.

## 먼저 읽을 문서

| 문서 | 내용 |
| --- | --- |
| `docs/spec.md` | 기능 정의, VICO.md 형식, 데이터 구조, 자동화 규칙 |
| `docs/design.md` | 화면 구성, 디자인 토큰, 컴포넌트 |
| `docs/tasks.md` | 작업 순서와 완료 기준. **작업은 이 순서대로 진행한다** |
| `templates/VICO.md` | 참여자용 VICO.md 템플릿 |

## 작업 방식

- `docs/tasks.md`의 작업을 위에서부터 하나씩 진행한다. 한 작업이 끝나면 완료 기준을 확인하고 체크박스를 `[x]`로 바꾼다.
- 작업 하나가 끝날 때마다 `pnpm check`가 통과해야 한다.
- 문서와 다르게 구현해야 할 이유가 생기면, 코드보다 먼저 해당 문서를 고치고 이유를 한 줄 남긴다.
- 문서에 없는 기능은 추가하지 않는다. 필요해 보이면 `docs/tasks.md` 맨 아래 "제안" 섹션에 적는다.

## 기술 스택

- TypeScript 6 (strict), Node.js 24 LTS, pnpm. TypeScript 7은 `@astrojs/check`가 아직 지원하지 않아서 6에 고정한다
- Biome는 `.md`를 검사하지 않는다 (템플릿 frontmatter를 망가뜨림)
- Astro (정적 빌드, `output: 'static'`) + React (상호작용 컴포넌트만) + Tailwind CSS
- gray-matter (frontmatter 파싱), zod (스키마 검증), @octokit/rest (GitHub API)
- Vitest (테스트), Biome (린트/포맷), tsx (scripts 실행)

## 폴더 구조

```text
vico/
├── projects.json            # 등록 명단 (참여자가 PR로 수정)
├── vico.config.ts           # 기준값 (기준일, 1인당 개수 제한 등)
├── data/
│   ├── projects.data.json   # collect가 생성. 직접 수정 금지
│   └── sample.data.json     # 로컬 개발용 예시 데이터
├── templates/VICO.md
├── lib/                     # 사이트와 스크립트가 같이 쓰는 순수 로직
│   ├── schema.ts            # VICO.md frontmatter + 데이터 타입 (zod)
│   ├── parse.ts             # VICO.md → 체크리스트, 단계, 다음 할 일
│   ├── progress.ts          # 진행률 계산
│   ├── status.ts            # 활발/잠잠/휴면/완료 판정
│   ├── similar.ts           # 비슷한 프로젝트, 하이라이트
│   ├── filter.ts            # 메인 탭/도구/검색/정렬 규칙과 URL 쿼리
│   ├── badge.ts             # README 뱃지 마크다운과 SVG
│   └── data.ts              # 데이터 읽기 진입점 (사이트는 이것만 사용)
├── scripts/                 # GitHub Actions에서 실행
│   ├── collect.ts
│   ├── validate.ts
│   └── maintain.ts
├── src/
│   ├── pages/               # .astro 파일은 페이지 뼈대만
│   ├── layouts/             # <html>/<head> 공통 뼈대 (BaseLayout.astro)
│   ├── components/          # UI 컴포넌트 (React .tsx)
│   └── styles/
├── tests/
└── .github/workflows/
```

## 코드 규칙

- **UI 컴포넌트는 React(`.tsx`)로 만든다.** `.astro` 파일은 데이터를 불러와 컴포넌트에 넘기는 페이지 뼈대 역할만 한다. 상호작용이 없는 컴포넌트는 `client:` 지시어 없이 렌더링해서 JS를 보내지 않는다.
- **규칙은 `lib/`에 한 번만 둔다.** 진행률, 상태, 스키마 계산을 페이지나 스크립트에 복사하지 않는다.
- **숫자 기준값은 `vico.config.ts`에만 둔다.** 14일, 45일, 3개 같은 값을 코드에 직접 쓰지 않는다.
- **사이트는 `lib/data.ts`로만 데이터를 읽는다.** 나중에 저장소를 D1으로 바꿔도 화면 코드는 고치지 않게 하기 위함이다.
- `lib/`의 함수는 순수 함수로 만들고 반드시 테스트를 붙인다. 현재 시각이 필요하면 인자로 받는다 (`now: Date`).
- `data/projects.data.json`은 직접 수정하지 않는다.
- 사용자에게 보이는 문구는 한국어, 코드 식별자와 커밋 메시지 접두어는 영어.
- 접근성: 클릭 요소는 `<button>`이나 `<a href>`, 아이콘만 있는 버튼에는 `aria-label`, 텍스트 대비 4.5:1 이상, 터치 영역 44px 이상.

## 명령어

| 명령 | 하는 일 |
| --- | --- |
| `pnpm dev` | 개발 서버 (데이터 없으면 sample.data.json 사용) |
| `pnpm build` | 정적 빌드 → `dist/` |
| `pnpm collect` | 실제 GitHub에서 수집 → `data/projects.data.json` (`GITHUB_TOKEN` 필요) |
| `pnpm validate` | `projects.json` 검증 |
| `pnpm maintain` | 리마인더/정리 (기본은 dry-run, `--apply`일 때만 실제 실행) |
| `pnpm check` | 타입 검사 + Biome + Vitest |

## 커밋

- 접두어: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- main에 직접 커밋하지 않는다. `feat/…`, `fix/…` 브랜치에서 작업한다.
- 예외: collect 워크플로의 `chore(data): update projects data` 커밋 (배포 키로 push, Ruleset bypass. spec.md A-01).

## 하지 말 것

- DB, 로그인, 서버 렌더링을 추가하지 않는다 (MVP 범위 밖).
- `.env`나 토큰을 커밋하지 않는다. `.env.example`만 커밋한다.
- 외부 사이트를 크롤링하지 않는다. 데이터는 GitHub API로만 가져온다.
- 포크 PR에서 실행되는 워크플로가 PR 쪽 코드를 실행하거나 Secrets에 접근하게 만들지 않는다 (spec.md A-03).
