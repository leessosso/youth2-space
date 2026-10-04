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
