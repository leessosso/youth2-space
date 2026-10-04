# `/tongdok` → tongdok-mu (same-domain rewrite)

훈련(`/training`)과 동일 패턴: 통독 앱은 mokyang-flow(youth2-space)와 **같은 도메인**의 `/tongdok` path로 tongdok-mu에 붙인다. iframe·UI 이식 없음. 로그인 없이 연 `/tongdok`은 통독 앱 자체 세션으로 그대로 연다. 로그인한 셸의 「통독으로 가기」만 별도 짧은 티켓을 쓴다 (`docs/platform-tongdok-sso.md`). 훈련 SSO 발급 경로는 바꾸지 않는다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `TONGDOK_ORIGIN` | tongdok-mu 배포 origin (scheme + host, **path 없음**). 예: `https://tongdok-mu.vercel.app` |

- **프로덕션**: env 미설정 시 기본값 `https://tongdok-mu.vercel.app` (next.config).
- **로컬**: env 없으면 rewrite 비활성 → `/tongdok`은 Next 라우트가 없어 404. 프록시 테스트 시 `.env.local`에 origin 설정.
- **끄기**: `TONGDOK_ORIGIN=` (빈 문자열)로 명시하면 rewrite 생략.

## Rewrite 매핑

`next.config.ts`는 통독 규칙을 **`beforeFiles`**에 넣어, 셸이 `/tongdok.rsc` 같은 flight URL을 자체 App Router RSC로 해석하지 않고 upstream으로 보냅니다.

| mokyang-flow (source) | upstream path (destination) |
|----------------------|-----------------------------|
| `/tongdok` | `/tongdok` |
| `/tongdok/:path*` | `/tongdok/:path*` (일반 자산·라우트·`login.rsc` 등) |
| `/tongdok.rsc`, `/tongdok/tongdok.rsc` | 동일 path (1:1) — **middleware** `NextResponse.rewrite`로 upstream 전달 |

예: `TONGDOK_ORIGIN=https://tongdok-mu.vercel.app` →  
`/tongdok/foo` → `https://tongdok-mu.vercel.app/tongdok/foo`  
`/tongdok/tongdok.rsc` → `https://tongdok-mu.vercel.app/tongdok/tongdok.rsc`

### 루트 RSC flight (middleware)

Next.js 셸은 `/tongdok/tongdok.rsc`·`/tongdok.rsc`를 **자체 App Router flight**로 처리하려 해 `beforeFiles` rewrite 전에 307 self-redirect가 난다. `src/middleware.ts`가 `proxyTongdokRootFlightRequest`로 tongdok-mu에 `NextResponse.rewrite`(RSC 헤더 전달)를 **NextAuth middleware보다 먼저** 수행한다 (`auth(callback)` 래핑은 `authorized: false` 시 로그인 리다이렉트를 건너뛰므로 사용하지 않음). `/tongdok/login.rsc` 등 하위 flight는 rewrite만으로 충분해 middleware 대상이 아니다.

`TONGDOK_ORIGIN`에 `/tongdok` path가 실수로 포함돼도 `normalizeTongdokOrigin`이 제거해 `{origin}/tongdok/tongdok/...` 이중 prefix를 막습니다.

## tongdok-mu 쪽 기대 설정

1. **`basePath: '/tongdok'`** — tongdok-mu 레포에서 별도 PR로 적용.  
   - **프로덕션 end-to-end는 basePath 배포 후**에만 정상 동작한다.  
   - 현재 라이브 origin은 basePath 없이 루트(`/`)만 있을 수 있어, shell rewrite만 올려도 `/tongdok`은 404·깨진 asset이 날 수 있다.

2. **정적 자산**  
   - basePath 적용 시 JS/CSS는 `/tongdok/_next/...`로 노출된다. mokyang-flow rewrite가 `/tongdok/:path*`로 함께 전달한다.

3. **단독 URL**  
   - `https://tongdok-mu.vercel.app` 직접 접속은 shell에서 막거나 리다이렉트하지 않는다. 내비 링크만 `/tongdok`으로 통일한다.

## 검증 (tongdok-mu basePath 배포 후)

1. 같은 탭에서 `https://<mokyang-flow-host>/tongdok` (또는 내비 **통독으로 가기**).
2. Network: document·`_next` 요청이 mokyang-flow host의 `/tongdok/...`로 가고 200.
3. tongdok-mu 단독 URL `{TONGDOK_ORIGIN}/tongdok`과 동일 화면.

## 훈련 SSO·통독 티켓

- `/api/platform/training-sso`, `TRAINING_ORIGIN` rewrite, `TRAINING_SSO_ISSUER`는 기존과 동일.
- 로그인한 「통독으로 가기」는 `/api/platform/tongdok-sso`로 짧은 티켓을 받아 `/tongdok/sso/consume`으로 간다. 계약은 `docs/platform-tongdok-sso.md`.
- 비로그인 `GET /tongdok`(및 `/tongdok/*`, `/tongdok.rsc`)은 티켓 없이 공개이며 rewrite로 통독 앱에 전달된다.

## NextAuth 미들웨어

`src/auth.config.ts`의 `authorized`는 `isTongdokShellPublicPath`로 `/tongdok`, `/tongdok/*`, `/tongdok.rsc` 등 flight URL을 **셸 로그인 없이** 통과시킨다 (rewrite가 tongdok-mu로 전달). 비밀번호 변경 강제(`mustChangePassword`) 리다이렉트도 통독 prefix에서는 적용하지 않는다.
