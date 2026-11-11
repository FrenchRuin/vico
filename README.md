# Vico

바이브 코딩 프로젝트를 등록하면 진행률, GitHub 스타, 활동 상태를 한 화면에서 보여주는 커뮤니티 보드예요.
서버와 DB 없이 GitHub Actions가 데이터를 모으고 Cloudflare Pages가 정적 사이트를 배포해요.

> 참여 방법, 로컬 개발 방법은 T17에서 정리할 예정이에요. 기능 정의는 [docs/spec.md](docs/spec.md)를 보세요.

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
| `VICO_BOT_TOKEN` | collect, maintain | 봇 계정(`vico-bot`)의 **classic PAT, `public_repo` 스코프만**. 남의 레포에 이슈를 열어야 해서 fine-grained 토큰은 안 돼요. 봇 계정을 이 레포에 Write 협업자로 초대해 주세요 |
| `VICO_DEPLOY_KEY` | collect | `ssh-keygen -t ed25519 -C vico-collect -f vico_deploy -N ""`로 만든 **개인 키** 내용. 공개 키(`vico_deploy.pub`)는 Settings → Deploy keys에 **Allow write access**로 등록 |
| `CF_DEPLOY_HOOK_URL` | maintain | Cloudflare Pages → 프로젝트 → Settings → Builds → Deploy hooks에서 만든 주소. 없으면 매일 다시 빌드만 건너뛰어요 |

`GITHUB_TOKEN`은 Actions가 자동으로 줘요. validate는 이 읽기 전용 토큰만 써서 포크 PR에서도 Secrets가 노출되지 않아요.

## 레포 설정

- **main Ruleset**: PR 필수, `ci / check` 통과 필수, bypass 목록에 **Deploy keys** 추가 (collect의 데이터 커밋만 바로 push하기 위함). `validate`는 `projects.json`을 바꾸는 PR에서만 돌기 때문에 필수 체크로 두지 않아요.
- **Actions → General**: "Allow GitHub Actions to create and approve pull requests"는 꺼 둬도 돼요 (정리 PR은 봇 토큰으로 만들어요). "Require approval for first-time contributors"는 켜 두세요. 처음 온 PR은 관리자가 승인한 뒤에 검사가 돌아요.
- **공개 레포**: 참여자가 PR을 보내려면 레포가 공개여야 해요.
