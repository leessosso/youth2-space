# 투표(poll) 관리자 셸 SSO

계약 원문: poll 저장소 `docs/security-shell-admin.md` (leessosso/poll PR #2). PLATFORM-SPEC 14.4·14.7 5단계.

## 엔드포인트

### 1. `GET /api/platform/poll-admin-sso?return_to=<투표 관리자 URL>`
- 투표 `/admin`에 세션이 없을 때 보내는 셸 진입점.
- `return_to`는 `https://dcc.leessosso.uk/poll/…` 또는 `https://leessosso.github.io/poll…`만(https, 그 외 400).
- 셸 미로그인 → `/login?callbackUrl=…`, 비밀번호 변경 필요 → `/change-password`.
- 현재 Firestore 역할·직책이 ADMIN·PASTOR·임원이 아니면 403, `members.userId`로 연결된 회원(mid)이 정확히 하나가 아니면 403 `member_not_linked`.
- 통과하면 일회용 code를 발급하고 `return_to#code=<code>`로 302.

### 2. `POST /api/poll/firebase-token`
- 요청: `{ "code": "<code>", "audience": "dcc-poll-admin" }`, `credentials: 'include'`.
- 응답 200: `{ "firebaseToken": "<dcc-poll 커스텀 토큰>" }`. uid=`shell_<mid>`, 클레임은 `{ "admin": true, "mid": "<mid>" }`만.
- CORS: `https://dcc.leessosso.uk`, `https://leessosso.github.io`만(Allow-Credentials). 그 외 Origin은 403.
- 오류: 400(audience·code 형식), 401(셸 사용자 없음), 403(관리자 아님·세션 사용자와 code 발급자 불일치), 410(만료·사용됨), 500(서비스 계정·Admin SDK).

## 일회용 code
- 256비트 랜덤, base64url(43자). TTL 60초.
- 저장: 셸 Firestore `pollAdminCodes/{sha256(code)}` = `{mid, userId, audience:"dcc-poll-admin", issuedAt, expiresAt}`. 원문은 저장하지 않음. 클라이언트 규칙상 접근 불가(서버만).
- 교환 요청에서 조회되면 성공·실패와 관계없이 트랜잭션으로 즉시 삭제(재시도해도 두 번 못 씀). 만료된 채 교환되지 않은 문서는 남으므로 Firestore TTL 정책(`expiresAt`는 숫자라 별도 Timestamp 필드 필요) 또는 정리 작업은 후속.

## 관리자 권한
ADMIN·PASTOR·임원(officerTitle 있음). 셸의 앱 관리 권한 `canManageApp`과 같다. officerTitle 없는 LEADER(가장)·ATTENDEE는 제외. 발급·교환 때 모두 Firestore에서 역할·직책을 다시 읽어 강등·임기 종료를 반영한다.

## 세션 쿠키
셸 세션 쿠키(NextAuth, SameSite=Lax)는 투표 오리진에서의 교차 사이트 fetch에 실리지 않는다. 그래서 교환은 code를 1차 자격 증명으로 쓰고(발급 때 셸 세션·관리자 역할 확인, 60초·1회용·사용자 결합), 쿠키가 실려 오면 code 발급 사용자와 같아야 한다. 쿠키가 없다는 이유만으로 401을 주지 않는다.

## 환경 변수 (셸 서버)
- `POLL_FIREBASE_PROJECT_ID` (기본 `dcc-poll`)
- `POLL_FIREBASE_CLIENT_EMAIL`
- `POLL_FIREBASE_PRIVATE_KEY`
