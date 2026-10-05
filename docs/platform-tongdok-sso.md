# 셸 → 통독 진입 티켓

셸(2청년회 · `https://youth2-space.vercel.app`)에서 **통독으로 가기**를 누르면, 훈련 SSO와 같은 방식으로 NextAuth 세션 기준의 짧은 HS256 JWT를 발급하고 통독 앱 consume 경로로 리다이렉트합니다.

훈련·통독 티켓의 issuer는 같은 `TRAINING_SSO_ISSUER`(`youth2-space`)입니다. audience만 `tongdok`으로 달라 훈련 티켓을 통독에 재사용할 수 없습니다.

통독 앱(`leessosso/tongdok`)은 이 티켓을 아직 검증·소비하지 않습니다. 아래 계약은 셸이 보내는 그대로이며, consume 구현은 통독 레포 follow-up입니다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `PLATFORM_SSO_SECRET` | 셸·훈련·통독이 **동일한** HS256 비밀. 통독 Vercel 프로젝트에도 같은 값을 넣어야 consume이 검증된다. 예시는 `.env.example`만 참고하고 실제 값은 커밋하지 않음. |

`TRAINING_ORIGIN`, `/training` rewrite, `TONGDOK_ORIGIN`, `/tongdok` rewrite destination은 이 변경과 무관합니다.

## 진입 URL (셸, 로그인 사용자만)

- **발급**: `GET /api/platform/training-sso`가 아니라 `GET /api/platform/tongdok-sso`.
- NextAuth 세션이 없으면 401(미들웨어가 셸 `/login`으로 보낼 수 있음). `mustChangePassword`이면 `/change-password`로 먼저 보냄.
- 비밀이 없으면 503.
- **내비**: 헤더 `PlatformTongdokLink`와 드로어 「통독으로 가기」가 `TONGDOK_SSO_ENTRY_PATH`(`/api/platform/tongdok-sso`)로 전체 페이지 이동. `next/link`를 쓰지 않음.

비로그인 사용자가 주소창에 `/tongdok`을 여는 경우는 이 API를 타지 않습니다.

## 지연 시간 (셸 측)

로그인 클릭 경로: `PlatformTongdokLink` → `GET /api/platform/tongdok-sso` → 302 `/tongdok/sso/consume?ticket=…` → rewrite.

- **세션 JWT에 `name`/`phone`/`role`이 있으면** Firestore `getUserById`를 하지 않고 바로 HS256 서명한다 (구세션만 폴백).
- 라우트 `preferredRegion = icn1` (서울). Firestore `(default)`는 `asia-northeast3`.
- `api/platform/*`는 미들웨어 matcher에서 제외 — 라우트가 자체로 세션·비밀번호 변경을 검사한다.

## 티켓 (JWT, HS256)

| 클레임 | 값 |
|--------|-----|
| `iss` | `youth2-space` (`TRAINING_SSO_ISSUER`) |
| `aud` | `tongdok` |
| `sub` | Firestore `User.id` |
| `name` | 로그인 계정 이름 |
| `phone` | 정규화된 전화(`normalizePhone`) 또는 `null` |
| `role` | `PASTOR` \| `LEADER` \| `ADMIN` (참고용. 통독 권한 저장소를 만들지 않음) |
| `exp` | 발급 후 120초 |

## 핸드오프 (같은 호스트)

발급 성공 시:

```http
302 Location: /tongdok/sso/consume?ticket=<JWT>
```

`ticket` 쿼리 한 개. 경로는 `/tongdok` prefix를 유지합니다. `/tongdok/*`는 기존 `beforeFiles` rewrite로 tongdok 앱에 전달됩니다. 셸에는 `/tongdok/sso/*` App Router 페이지를 두지 않습니다(rewrite 가림 방지).

## 비로그인 `/tongdok`은 그대로 공개

`src/auth.config.ts`의 `authorized`는 `isTongdokShellPublicPath`로 다음을 셸 로그인 없이 통과시킵니다.

- `pathname === "/tongdok"`
- `pathname.startsWith("/tongdok/")` (`/tongdok/sso/consume` 포함)
- `pathname.startsWith("/tongdok.")` (`/tongdok.rsc` 등)

따라서 로그아웃 상태의 `GET /tongdok`과 그 RSC flight는 셸 `/login`으로 가지 않고 통독 앱 rewrite로 열립니다. 티켓은 로그인 세션으로 발급 API를 칠 때만 붙습니다.

`/`와 `/training`은 통독 public path가 아니므로 비로그인 시 기존처럼 셸 로그인으로 갑니다. `src/middleware.ts`의 `auth(request)` 호출 방식은 바꾸지 않았습니다.

## 통독 앱이 아직 해야 할 일

`leessosso/tongdok` `main`에는 `src/app/sso/consume`도 `PLATFORM_SSO_SECRET`도 없습니다. basePath는 이미 `/tongdok`입니다. 통독 쪽에서 구현할 것:

1. `PLATFORM_SSO_SECRET`을 셸과 동일하게 설정.
2. basePath 기준 `src/app/sso/consume` (브라우저 URL `/tongdok/sso/consume`)에서 `ticket` 쿼리를 HS256으로 검증 (`iss=youth2-space`, `aud=tongdok`, `exp` 120초).
3. 검증 성공 시 통독 자체 세션을 열고, 실패·쿼리 없음은 기존 통독 로그인(또는 공개 홈)으로 둔다. 셸은 비로그인 `/tongdok`을 막지 않는다.
4. 멤버 마스터나 권한 관리 화면은 이 셸 단계에 없다. `sub`/`name`/`phone`/`role`만 받는다.
