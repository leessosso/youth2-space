# 플랫폼 앱 요약 API (셸 대시보드 카드용) — v1

셸(youth2-space) 대시보드가 로그인한 사용자의 **훈련(class-management)**·**통독(tongdok)** 참여 요약을 카드로 보여주기 위한 서버 간(server-to-server) 읽기 전용 API다.
앱 DB는 각 앱에 그대로 두고, 각 앱이 이 API를 노출한다. 셸은 서버에서만 호출한다(브라우저 호출 없음, CORS 불필요).

## 1. 엔드포인트

| 앱 | URL (basePath 포함, 앱 upstream origin에 직접) |
|---|---|
| 훈련 | `GET {CLASS_MANAGEMENT_ORIGIN}/training/api/platform/summary` |
| 통독 | `GET {TONGDOK_ORIGIN}/tongdok/api/platform/summary` |

- 쿼리 파라미터 없음. **`sub`는 토큰에서만 읽는다**(쿼리·바디의 sub는 무시).
- 셸은 기존 설정(`TRAINING_ORIGIN`/`CLASS_MANAGEMENT_URL`, `TONGDOK_ORIGIN`, 프로덕션 기본값)으로 origin을 정한다.
- 셸 미들웨어·rewrite를 거치지 않는다(셸 쿠키가 실리지 않음).

## 2. 인증

`Authorization: Bearer <JWT>`

- 알고리즘 **HS256**, 서명 키 **`PLATFORM_SUMMARY_SECRET`** (신규, 셸과 두 앱이 공유).
  - SSO 티켓 키 `PLATFORM_SSO_SECRET`과 **다른 키**를 쓴다. 키가 하나 새도 다른 용도의 토큰을 위조할 수 없게 하려는 것이다.
- 클레임 (모두 필수)

| 클레임 | 값 |
|---|---|
| `iss` | `youth2-space` |
| `aud` | 훈련 `class-management-summary`, 통독 `tongdok-summary` |
| `typ` | `platform-summary` |
| `sub` | 셸 `users.id` (= SSO 티켓의 `sub`와 같은 값) |
| `iat` | 발급 시각(초) |
| `exp` | `iat + 60` 이하 |
| `jti` | 매 요청 새 UUID |

- 검증 규칙 (앱)
  - `jwtVerify(token, PLATFORM_SUMMARY_SECRET, { algorithms: ["HS256"], issuer: "youth2-space", audience: "<자기 aud>" })`
  - 추가로 `typ === "platform-summary"` 확인. 다르면 401.
  - `exp - iat > 60`이면 거부(권장). clock skew 허용은 30초 이내.
  - **용도 분리**: SSO 티켓(`aud=class-management|tongdok`, `typ` 없음)은 aud·typ·키가 모두 달라 요약 API에서 통과하지 못하고, 요약 토큰도 SSO consume에서 통과하지 못한다(두 앱 consume은 `PLATFORM_SSO_SECRET`과 SSO aud로만 검증).
  - `jti` 재사용 거부는 선택(토큰이 60초짜리라 필수 아님). 저장하면 TTL 2분이면 충분.
- 읽기 전용이다. 이 API는 어떤 쓰기도 하지 않는다(로그인 링크 생성·자동 연결 금지).

## 3. sub → 앱 사용자 매핑

- 훈련: `platform_person_links.shell_user_id = sub` → `people_id` (`get_platform_person_link`) → `enrollments.person_id`
- 통독: `platform_profile_links.shell_user_id = sub` → `profile_id` → `enrollments.user_id`
- 매핑이 없으면(셸에서 아직 한 번도 SSO 연결을 안 한 사용자) **200 `{ linked: false, ... 빈 배열 }`**. 404를 쓰지 않는다.

## 4. 응답 공통 봉투

```json
{
  "version": 1,
  "app": "class-management",
  "linked": true,
  "generatedAt": "2026-10-13T01:00:00.000Z"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `version` | `1` | 스키마 버전. 호환 깨지는 변경만 올린다. |
| `app` | `"class-management"` \| `"tongdok"` | |
| `linked` | boolean | sub가 앱 사용자와 연결돼 있는지 |
| `generatedAt` | ISO 8601 (UTC) | 응답 생성 시각 |

- 연결은 됐지만 참여 중인 것이 없으면 `linked: true` + 빈 배열. 셸은 **배열이 비어 있으면 카드를 숨긴다**(참여 여부 = 배열 길이).
- **호환성**: 셸은 모르는 필드를 무시한다. 앱은 필드를 추가해도 되고(버전 유지), 필드 삭제·타입 변경은 `version`을 올린다. 셸은 `version !== 1`이면 카드를 숨긴다.
- 날짜(`YYYY-MM-DD`)는 **Asia/Seoul 기준 달력 날짜**, 시각은 ISO 8601 UTC.

## 5. 훈련 본문 (`app: "class-management"`)

```json
{
  "version": 1, "app": "class-management", "linked": true, "generatedAt": "…",
  "programs": [
    {
      "id": "uuid",
      "name": "제자훈련 2기",
      "startsOn": "2026-09-06",
      "endsOn": "2026-12-20",
      "status": "active",
      "myRole": "trainee",
      "attendance": { "attended": 6, "total": 8, "rate": 0.75, "recentAbsence": false },
      "nextSession": { "date": "2026-10-18", "round": 9 },
      "assignments": { "pendingCount": 1, "thisWeekDone": false },
      "url": "/training/programs/uuid"
    }
  ]
}
```

| 필드 | 원천 | 규칙 |
|---|---|---|
| `id`, `name` | `programs` | |
| `startsOn`, `endsOn` | `programs.starts_on/ends_on` | |
| `status` | | `"active"`(오늘 ≤ ends_on 이고 `archived_at` 없음) \| `"ended"`. 보관(`archived_at`)된 프로그램은 **목록에서 제외** |
| `myRole` | `memberships`(role='secretary')·`enrollments` | `"trainee"` \| `"secretary"`(총무). 둘 다면 `"secretary"` |
| `attendance.attended` | `attendance.status='present'` | 본인 enrollment 기준 |
| `attendance.total` | `sessions` | `meets_on ≤ 오늘` 이고 `skipped_at` 없는 회차 수 |
| `attendance.rate` | | `attended/total`, total=0이면 `null` |
| `attendance.recentAbsence` | | 가장 최근 지난 회차가 `absent`이면 true |
| `nextSession` | `sessions` | `meets_on ≥ 오늘`, skip 제외, 가장 이른 회차. `round` = `week_index`. 없으면 `null` |
| `assignments.pendingCount` | `assignment_items`·`assignment_checks` | 지난 회차 중 본인 `done=false`(또는 체크 없음) 항목 수 |
| `assignments.thisWeekDone` | | 가장 최근 회차의 과제를 모두 마쳤으면 true |
| `url` | | 앱 내부 경로(basePath 포함). 셸은 SSO 진입을 거쳐 연다(§7) |

- 총무(`secretary`)라도 **본인 수치만** 준다. 다른 참여자 명단·출석은 넣지 않는다.
- 셸 카드 예: `제자훈련 2기 · 출석 6/8 · 다음 수업 10/18 · 미제출 과제 1`

## 6. 통독 본문 (`app: "tongdok"`)

```json
{
  "version": 1, "app": "tongdok", "linked": true, "generatedAt": "…",
  "cohorts": [
    {
      "slug": "2026-fall",
      "title": "2026 가을 통독",
      "planKind": "full",
      "role": "member",
      "team": { "name": "3팀", "completionRate": 0.62 },
      "week": { "current": 5, "total": 12, "start": "2026-10-12", "end": "2026-10-18" },
      "today": { "dayId": "w5d2", "date": "2026-10-13", "label": "창세기 12–15장", "done": false, "skipped": false },
      "thisWeek": { "done": 1, "required": 5, "reported": false },
      "progress": { "done": 21, "required": 23, "percent": 91, "behindDays": 2 },
      "lastReadAt": "2026-10-12T13:20:00.000Z",
      "streakDays": 3,
      "url": "/tongdok/c/2026-fall"
    }
  ]
}
```

| 필드 | 원천 | 규칙 |
|---|---|---|
| `slug`, `title` | `cohorts` | `is_active=true` 이고 본인 `enrollments.is_active=true`인 기수만 |
| `planKind` | `reading_plans.kind` | `"full"` \| `"ot"` \| `"nt"` |
| `role` | `profiles.role`·기수 리더 | `"member"` \| `"leader"` \| `"admin"` (참고용) |
| `team` | `groups`/기수 팀 | `{ name, completionRate? }` 또는 `null`. `completionRate`는 **팀 집계값만**(0–1). 팀원 이름·개별 진도 금지 |
| `week` | `start_monday`·`cohort_shifts` | `current`(1부터), `total`(`reading_plans.weeks`+shift), 이번 주 `start`/`end` 날짜 |
| `today` | `plan_days`+`cohort_day_overrides` | 오늘 읽을 날. 읽는 날이 아니면 `null`. `label`은 override 우선, `skipped`는 `is_skipped` |
| `thisWeek` | `day_progress`·`week_reports` | 이번 주 `done`/`required`(skip 제외), `reported` = 주간 보고 여부 |
| `progress` | `day_progress` | 오늘까지 `required`(skip 제외) 대비 `done`, `percent` = 0–100 정수, `behindDays` = `required - done` (0 이상) |
| `lastReadAt` | `day_progress.done_at` 최댓값 | 없으면 `null` |
| `streakDays` | | 오늘(또는 어제)부터 거꾸로 연속 완료한 읽는 날 수 |
| `url` | | 앱 내부 경로(basePath 포함) |

- **넣지 않는 것**: 묵상·기도 노트(`day_notes`), 다른 사람 이름, 관리자 데이터, 전화번호.
- 셸 카드 예: `2026 가을 통독 · 진도 91% · 오늘 창세기 12–15장`

## 7. 딥링크

- `url`은 앱 내부 경로만(절대 URL·토큰 금지).
- 셸은 링크를 **셸 SSO 진입**(`/api/platform/training-sso`, `/api/platform/tongdok-sso`)으로 연다. v1 셸은 진입 경로로만 보내고, 이후 SSO 진입에 `next` 파라미터를 붙여 consume 후 `url`로 보내는 확장을 예정한다(앱 consume에서 `next`는 자기 basePath 하위 경로만 허용해야 한다).

## 8. 상태 코드

| 코드 | 경우 | 바디 |
|---|---|---|
| 200 | 정상 (연결 없음 포함 `linked:false`) | 위 JSON |
| 401 | 토큰 없음·서명 불일치·만료·iss/aud/typ 불일치 | `{ "error": "unauthorized" }` |
| 403 | (예약) 서버가 의도적으로 막은 sub | `{ "error": "forbidden" }` |
| 503 | 앱에 `PLATFORM_SUMMARY_SECRET` 없음 | `{ "error": "not_configured" }` |
| 5xx | 내부 오류 | 임의 |

- 셸은 **200이 아니면 전부 카드 숨김**으로 처리한다(재시도 없음).

## 9. 헤더·성능

- 응답: `Cache-Control: no-store, private`, `Content-Type: application/json; charset=utf-8`.
- 앱 목표 응답 시간 p95 < 500ms. **셸 타임아웃 3초**(앱별, 병렬, 콜드 스타트 감안). 초과·실패 시 10분 안의 마지막 성공 응답을 보여 주고, 없으면 카드 숨김.
- 셸 서버 캐시: **sub별 45초**(메모리, 사용자 간 공유 없음). 실패·타임아웃은 캐시하지 않는다. 앱 쪽 캐시는 하지 않는다(no-store).
- 앱은 응답·로그에 토큰을 남기지 않는다. 로그에는 sub 해시 정도만.

## 10. 셸 동작 요약

- 기능 플래그 `PLATFORM_SUMMARY_ENABLED=true` + `PLATFORM_SUMMARY_SECRET`이 있을 때만 호출한다(기본 꺼짐). 앱이 배포되기 전에 셸이 먼저 배포돼도 무해하다.
- ATTENDEE(리더모임 참석 계정)에게는 호출하지도 보여주지도 않는다(훈련·통독 접근 불가 정책과 동일).
- 대시보드 본문은 기다리지 않는다(Suspense 스트리밍). 카드가 없거나 실패하면 지금처럼 바로가기만 보인다.

## 11. 앱 체크리스트

1. `PLATFORM_SUMMARY_SECRET` 환경변수(프로덕션·프리뷰) 추가 — 셸과 같은 값
2. `GET /api/platform/summary` 라우트: `dynamic = "force-dynamic"`, no-store, Bearer 검증(§2), sub → 링크 테이블(§3)
3. 서비스 롤(서버 전용) 키로 조회하되 본인 데이터만, §5/§6 필드만
4. 401/503/200 계약(§8), `linked:false`는 200
5. 셸 프리뷰에서 플래그를 켜서 연동 확인
