# 셸 → 훈련 SSO (Phase 1, 티켓 발급)

셸(2청년회 · `https://youth2-space.vercel.app`)에서 **훈련** 메뉴로 들어갈 때 이름 재입력을 줄이기 위해, NextAuth 세션을 바탕으로 짧은 수명 JWT 티켓을 발급하고 훈련 앱의 consume 경로로 리다이렉트합니다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `PLATFORM_SSO_SECRET` | 셸·훈련(class-management)이 **동일한** HS256 비밀. Vercel 프로젝트 각각에 설정. 예시는 `.env.example`만 참고하고 실제 값은 커밋하지 않음. |

로컬에서 consume까지 테스트하려면 훈련 앱과 같은 비밀을 `.env.local`에 넣습니다.

## 진입 URL (셸)

- **발급**: `GET /api/platform/training-sso` — NextAuth 로그인 필수. `mustChangePassword`이면 `/change-password`로 먼저 보냄.
- **내비·홈 카드**: `/training` 직행 대신 위 API를 사용 (`TRAINING_SSO_ENTRY_PATH`).

## 지연 시간 (셸 측)

로그인 클릭 경로: `PlatformTrainingLink` → `GET /api/platform/training-sso` → 302 `/training/sso/consume?ticket=…` → rewrite.

- **세션 JWT에 `name`/`phone`/`role`이 있으면** Firestore `getUserById`를 하지 않고 바로 HS256 서명한다 (구세션만 폴백).
- 라우트 `preferredRegion = icn1` (서울). Firestore `(default)`는 `asia-northeast3`.
- `api/platform/*`는 미들웨어 matcher에서 제외 — 라우트가 자체로 세션·비밀번호 변경을 검사한다.

### Server-Timing · 구조화 로그

성공·조기 리다이렉트/오류 응답에 `Server-Timing` 헤더와 `console.info` JSON(`msg=platform_sso_timing`)을 붙인다. **티켓 JWT는 헤더·로그에 넣지 않는다.**

| 메트릭 | 의미 |
|--------|------|
| `auth` | NextAuth `auth()` |
| `subject` | 세션에서 클레임 해석 (Firestore 미사용) |
| `firestore` | `getUserById` 폴백 시에만 |
| `sign` | HS256 티켓 서명 |
| `source` | `desc="session"` \| `firestore` (또는 `unauth` 등 조기 종료 reason) |
| `total` | 핸들러 전체 |

프로덕션 Vercel 로그·브라우저 Network의 Server-Timing으로 shell 티켓 구간을 분리 측정한다.

### Hop (rewrite) 단축 여부

현재 Location은 **같은 호스트** `/training/sso/consume?ticket=…`이다. 브라우저는 shell edge를 한 번 더 타고 `TRAINING_ORIGIN`으로 rewrite된다.

`Location`을 `TRAINING_ORIGIN` 절대 URL로 바꾸면 shell rewrite hop은 줄일 수 있지만:

1. 훈련 consume이 세션 쿠키를 **class-management 호스트**에 심으면 same-domain(`/training`) 세션과 어긋난다.
2. issuer/audience/SECRET 계약은 유지돼도, consume 후 shell origin으로 되돌리는 리다이렉트·쿠키 path 조정이 **훈련(class-management) 쪽 협조** 없이는 깨진다.

따라서 셸은 same-origin consume Location을 유지한다. hop 단축은 훈련 앱이 shell 호스트 기준 Set-Cookie·후속 리다이렉트를 보장한 뒤 follow-up으로 검토한다.

## 티켓 (JWT, HS256)

| 클레임 | 값 |
|--------|-----|
| `iss` | `youth2-space` (`TRAINING_SSO_ISSUER`) |
| `aud` | `class-management` |
| `sub` | Firestore `User.id` |
| `name` | 로그인 계정 이름 |
| `phone` | 정규화된 전화(`normalizePhone`) 또는 `null` |
| `role` | `PASTOR` \| `LEADER` \| `ADMIN` (참고용, 훈련 `is_admin`과 무관) |
| `exp` | 발급 후 120초 |

## 핸드오프 (같은 호스트)

발급 성공 시:

```http
302 Location: /training/sso/consume?ticket=<JWT>
```

`/training/*`는 프로덕션에서 class-management로 rewrite됩니다. consume·link 처리는 **훈련 앱** 담당(Phase 1 수업관리 PR). 셸에는 `/training/sso/*` App Router 페이지를 두지 않습니다(rewrite 가림 방지).

기존 `/training` 직접 접속·이름 로그인은 훈련 앱에서 유지합니다.
