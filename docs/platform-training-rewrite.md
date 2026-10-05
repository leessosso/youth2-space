# `/training` → class-management (same-domain rewrite)

MVP §9.1: 훈련 프로그램은 2청년회 셸(`https://youth2-space.vercel.app`)과 **같은 도메인**의 `/training` path로 class-management에 붙인다. iframe·UI 이식 없음.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `TRAINING_ORIGIN` | class-management 배포 origin (scheme + host, **path 없음**). 예: `https://class-management-chi-amber.vercel.app` |
| `CLASS_MANAGEMENT_URL` | `TRAINING_ORIGIN`과 동일 목적 alias |

- **프로덕션**: env 미설정 시 기본값 `https://class-management-chi-amber.vercel.app` (next.config).
- **로컬**: env 없으면 rewrite 비활성 → `/training`은 Next 라우트가 없어 404. 프록시 테스트 시 `.env.local`에 origin 설정.
- **끄기**: `TRAINING_ORIGIN=` (빈 문자열)로 명시하면 rewrite 생략.

## Rewrite 매핑 (class-management 봇 권장 패턴과 동일)

`next.config.ts`는 훈련 규칙을 **`beforeFiles`**에 넣어, 셸이 `/training.rsc` 같은 flight URL을 자체 App Router RSC로 해석하지 않고 upstream으로 보냅니다. (통독 `docs/platform-tongdok-rewrite.md`와 동일 계열)

| youth2-space (source) | destination |
|----------------------|-------------|
| `/training` | `{TRAINING_ORIGIN}/training` |
| `/training/:path*` | `{TRAINING_ORIGIN}/training/:path*` |
| `/training.rsc`, `/training/training.rsc` | 동일 path (1:1) — **middleware** `NextResponse.rewrite`로 upstream 전달 |

예: `TRAINING_ORIGIN=https://class-management-chi-amber.vercel.app` →  
`/training/foo` → `https://class-management-chi-amber.vercel.app/training/foo`

### 루트 RSC flight (middleware)

출석 화면 이후 등에서 셸 edge가 `/training/...` RSC prefetch를 자체 flight로 처리하면 404가 난다 (통독 `/tongdok.rsc` 이중 prefix·App Router 가로채기와 같은 계열). `src/middleware.ts`가 `proxyTrainingRootFlightRequest`로 `/training.rsc`·`/training/training.rsc`를 class-management에 rewrite한다. `TRAINING_ORIGIN`에 `/training` path가 붙어 있어도 `normalizeTrainingOrigin`이 제거한다.

## class-management 쪽 기대 설정

1. **`basePath: '/training'`** — [class-management PR #2](https://github.com/leessosso/class-management/pull/2) (아직 미머지·미배포).  
   - **프로덕션 end-to-end는 PR #2 머지·배포 후**에만 정상 동작한다.  
   - 현재 라이브 origin은 basePath 없이 루트(`/`)만 있어, youth2-space 셸 rewrite만 올려도 `/training`은 404·깨진 asset이 난다.

2. **정적 자산**  
   - basePath 적용 시 JS/CSS는 `/training/_next/...`로 노출된다. youth2-space rewrite가 `/training/:path*`로 함께 전달한다.

3. **쿠키·세션**  
   - 브라우저는 `youth2-space.vercel.app` 호스트만 본다. class-management 전용 쿠키는 프록시 응답의 `Set-Cookie`가 **youth2-space 도메인**으로 내려와야 동작한다 (path/domain 속성 조정 필요할 수 있음).  
   - **공통 로그인·memberId 동기화**는 class-management 레포 follow-up (이 슬라이스 범위 밖).

## basePath 배포 전 한계

- [class-management PR #2](https://github.com/leessosso/class-management/pull/2) 머지·배포 전: 라이브 `class-management-chi-amber.vercel.app`에는 `/training` 앱이 없음.
- SSO 없으면 훈련 앱 자체 로그인(있다면)과 셸 로그인이 분리된다.

## 검증 (class-management PR #2 배포 후)

1. `https://youth2-space.vercel.app`에 로그인.
2. 같은 탭에서 `https://youth2-space.vercel.app/training` (또는 내비 **훈련** — shell PR #18 등).
3. Network: document·`_next` 요청이 youth2-space host의 `/training/...`로 가고 200.
4. class-management 단독 URL `{TRAINING_ORIGIN}/training`과 동일 화면.

## PR #18 (shell/nav)과의 관계

`src/app/(app)/training/page.tsx` placeholder가 있으면 **파일시스템 라우트가 rewrite보다 우선**해 프록시가 동작하지 않는다. rewrite를 쓸 때는 해당 페이지를 제거하거나 shell PR에서 링크만 `/training`으로 두고 페이지 파일은 넣지 않는다.

## sorting-hat

`next.config.ts`의 `/sorting-hat` → `index.html` rewrite는 기존과 동일하게 유지한다.
