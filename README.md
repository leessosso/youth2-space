# 2청년회 통합 플랫폼

PWA 홈 화면에 표시되는 이름은 **「2청년회」** 입니다 (`public/manifest.webmanifest`).

2청년회 가장·임원·목사를 위한 주간 운영 도구입니다. 학기 가족 구성, 주일 출석, 참여조사, 리더모임(교안·기도회·악보), 배정모자, 돌봄카드, 공지, 가장 인수인계를 한곳에서 처리합니다.

## 메뉴

로그인 후 왼쪽(넓은 화면) 또는 위쪽(좁은 화면)에 나옵니다.

| 메뉴 | 경로 | 누가 |
|------|------|------|
| 대시보드 | `/dashboard` | 모두. 이번 주일 출석이 비어 있으면 바로가기, 알림 켜기, 최근 리더모임 |
| 출석 | `/attendance` | 모두. 가장은 자기 가족, 임원·목사는 전체 |
| 리더모임 | `/meetings` | 모두 |
| 돌봄카드 | 가장은 `/reports/{자기 가족}`, 그 외 `/reports` | 그 가족 가장과 목사·관리자만 방을 봄 |
| 참여조사 | `/surveys` | 모두. 조사 생성은 임원·목사 |
| 공지 | `/announcements` | 모두 열람. 작성·발송은 임원·목사 |
| 배정모자 | `/hat` | 모두 |
| 가족 | `/groups` | 임원·목사 |
| 성도 명단 | `/admin/members` | 임원·목사 |
| 가장·임원 관리 | `/admin/handover` | 임원·목사 |
| 배정 관리 | `/hat/admin` | 임원·목사 |

임원은 회장·부회장·총무·부총무·서기·부서기·회계·부회계입니다. 그해 직책은 목사만 앉히거나 비웁니다. 담당 가족만 있는 일반 가장은 가족·성도 명단·가장 임명·출석 QR·참여조사 생성·공지 발송·배정 관리를 할 수 없습니다. 임원이 가장을 겸임할 수 있습니다.

`/my-group`은 예전 주소입니다. 가장은 자기 가족 돌봄카드로, 그 외에는 대시보드로 이동합니다.

예배 좌석 배치(`/worship`, 인쇄 `/worship/{id}/print`)는 코드와 시드에 남아 있습니다. 메뉴에는 없습니다.

## 하는 일

- **가족·가족원**: 임원은 해마다 상반기에 목사가 정하고 하반기까지 둡니다. 가족과 가장은 상반기·하반기마다 다시 짭니다. 가장과 임원은 성도 명단의 한 사람이고, 앱을 쓰려면 그 성도에게 로그인 계정을 연결합니다. 계정이 없으면 임명하는 자리에서 만들고, 전화번호가 같은 기존 계정은 그 성도와 연결합니다. 가장으로 임명하면 그 성도는 그 가족 가족원이 됩니다. 가족원은 임원·목사가 「성도 명단」에서 가족을 정하지 않고 한 명씩 넣거나, 이름 목록·CSV·엑셀로 한꺼번에 넣습니다. 가족 화면에서 그 사람들을 이번 학기 가족으로 옮깁니다. 다음 해 상반기를 열면 임원 직책은 끝나고, 하반기를 열면 올해 임원은 유지됩니다. 이전 가족원은 `가족`에서 미배정으로 보여 새 가족으로 옮깁니다.
- **리더모임**: 1. 기도회(그 주 가장 인도, 악보는 인도 가장) → 2. 말씀 교안 나눔(배정모자로 조) → 3. 교안 해설 → 4. 그 주 광고. 나눔에는 가장·임원·게스트(부가장·사역팀장)·목사가 옵니다. 교안·해설지는 임원·목사가 올리고, 광고는 목사·임원이 적습니다.
- **돌봄카드**: 가장이 가족원을 태그해 글을 남기면, 목사와 그 가장만 보는 가족 단위 한 방에 쌓입니다. 가족원·돌봄카드는 가장이 바뀌어도 그 학기 가족에 남습니다.
- **출석**: 매주 주일 출석은 일정을 만들지 않아도, 그 주일부터 토요일까지 열려 있습니다. 다음 일요일부터는 전 주 출석을 고칠 수 없고 보기만 됩니다. 가장이 가족원마다 1-3부/4부 출석·온라인과 4부 이후 가족모임 참석을 체크합니다. 둘 다 아니면 결석입니다. QR은 교회 출입 명단(CSV/xlsx, 첫 열 이름)을 임원·목사가 올려 켜지고, 동명이인·미매칭은 임원·목사 가족 화면에서 직접 켭니다. 가장 화면에는 QR이 나오지 않습니다. 수련회처럼 매주가 아닌 날은 **비정기 출석체크**로 참석만 받습니다.
- **참여조사**: 필요할 때만 엽니다. 만들 때 **가족 참여만**(가족원마다 예/아니오)과 **질문 조사**(예/아니오·인원·메모를 조합) 중 하나를 고릅니다. 수요예배에 한정되지 않습니다. 가장이 가족원을 대신해 응답하고, 임원·목사는 가족별 응답률과 합계를 봅니다.
- **공지**: 목사·임원이 제목·본문·대상을 적어 임시저장하거나 바로 보냅니다. 예약 발송은 없습니다. 이미 보낸 공지는 다시 보내지 않습니다.
- **배정모자**: 리더모임 나눔 조를 짜고 자리를 뽑습니다. 로그인한 메뉴와, 로그인 없이 여는 공개 페이지가 있습니다.

## 데이터

로컬·배포 모두 **Firebase**입니다. SQLite/Prisma는 쓰지 않습니다.

| 무엇 | 어디에 |
|------|--------|
| 계정, 가족, 가족원, 가장 임기, 학기, 리더모임, 돌봄카드, 출석, 참여조사, 공지, 예배 좌석 | **Firestore** (`src/lib/firebase-admin.ts`, `src/lib/store/*`) |
| 교안, 교안 해설지, 악보 | **Vercel Blob** (비공개, `src/lib/storage.ts`) |
| 푸시 구독 | Firestore `pushSubscriptions` |
| 배정모자 실시간 상태 | **Realtime Database** (`public/sorting-hat/`). Firestore와 별개 |

클라이언트는 Firestore·Blob을 직접 읽지 않습니다. 서버 액션(`src/app/actions.ts`)과 서버 컴포넌트만 `firebase-admin`으로 접근하고, 권한은 NextAuth 세션으로 검사합니다. **웹 푸시(FCM)만** 브라우저의 Firebase Messaging SDK와 서비스 워커를 쓰고, 토큰은 서버가 저장합니다.

## 웹 푸시

로그인 사용자(목사·관리자·가장·임원)만 받을 수 있습니다. 가족원 계정은 없고, 돌봄카드는 카카오톡과 병행합니다.

같은 계정으로 브라우저와 설치형 PWA에서 각각 알림을 켜도 **사용자당 최신 토큰 하나**만 남습니다. 발송도 그 토큰만 쓰고, 같은 이벤트는 `notification.tag`로 한 번만 보이게 합니다.

| 언제 | 누구에게 | 누르면 |
|------|----------|--------|
| 가장이 돌봄카드를 보냄 | 구독 중인 목사·관리자 | `/reports/{groupId}` |
| 리더모임에서 기도회 인도 가장을 저장 | 그 담당자 | `/meetings/{meetingId}` |
| 매주 일요일 18:00 (서울) | 담당 가족이 있는 가장. 목사·임원은 제외 | `/attendance/{sundayId}` (가장은 자기 가족 화면) |
| 공지를 지금 보냄 | `all` 알림을 켠 로그인 사용자, `leaders` 담당 가족 있는 가장, 또는 `users`로 고른 사람 | `/announcements/{id}` |

기도회 인도 가장은 **리더모임** 상세에서 그 주 가장을 고릅니다. 출석 리마인더는 `vercel.json` Cron `0 9 * * 0`(일요일 09:00 UTC = 18:00 KST)이 `GET /api/cron/attendance-reminder`를 호출합니다. `Authorization: Bearer <CRON_SECRET>`이 필요하고, Firestore `settings/attendanceReminder`의 `lastRemindedSundayId`로 같은 주일 중복 발송을 막습니다. 일요일이 아니거나, 이미 보냈거나, 담당 가족 가장·구독 토큰이 없으면 건너뜁니다.

**Firebase 콘솔**

1. 프로젝트 설정 → 일반 → 웹 앱. `public/sorting-hat/firebase-config.js`와 **같은 프로젝트**면 그 웹 앱 설정을 재사용합니다.
2. Cloud Messaging → Web Push certificates → Key pair → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
3. 서버 서비스 계정은 같은 프로젝트여야 합니다. `FIREBASE_PROJECT_ID`와 `NEXT_PUBLIC_FIREBASE_PROJECT_ID`가 같아야 합니다.

```
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="....firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_VAPID_KEY="..."
```

서비스 계정 키는 git에 넣지 않습니다.

**iPhone에서 홈 화면에 추가**

iOS에는 설치 버튼이 없습니다. Safari에서 직접 홈 화면에 넣어야 하고, 웹 푸시는 **iOS 16.4 이상**에서 그 앱을 열었을 때만 됩니다. Chrome이나 카카오톡 인앱 브라우저에는 이 메뉴가 없습니다.

1. Safari로 사이트를 연다.
2. 공유 버튼을 누른다.
3. **홈 화면에 추가**를 고른다.
4. 이름이 **「2청년회」**인지 확인하고 추가한다.
5. 홈 화면 아이콘으로 연 뒤 알림을 켠다. Safari 탭이 아니라 이 아이콘으로 열어야 합니다.

로컬에서 출석 리마인더만 흉내 낼 때 (일요일, 에뮬레이터·Firebase Admin·`CRON_SECRET` 필요):

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:43123/api/cron/attendance-reminder"
```

`{"status":"sent",...}` 이면 발송된 것이고, 같은 주일에 다시 호출하면 `already_reminded_for_sunday`로 건너뜁니다. 다른 요일은 `not_sunday_...`입니다.

## 요구 사항

- Node.js 20+
- npm
- Firebase 프로젝트 (Firestore) 또는 로컬 Firestore 에뮬레이터
- 리더 모임 파일 업로드: Vercel Blob (`BLOB_READ_WRITE_TOKEN`, Vercel에서 스토어 연결 시 주입)

## 설치 및 실행

`.env.example`을 복사해 `.env`를 만듭니다.

**로컬 (에뮬레이터)**

Firestore만 로컬에서 돌려도 됩니다(Storage 에뮬레이터는 이 앱의 교안·악보에 쓰이지 않습니다). 프로젝트 ID는 `demo-`로 시작해야 실제 Firebase에 붙지 않습니다.

```bash
npm install -g firebase-tools
```

macOS에서 Java가 PATH에 없으면 에뮬레이터가 시작하지 않습니다.

```bash
brew install openjdk
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk"
```

이 터미널은 켜 둡니다.

```bash
firebase emulators:start --only firestore --project demo-mokyang-flow
```

| 서비스 | 주소 |
|--------|------|
| 에뮬레이터 UI | [http://127.0.0.1:4000](http://127.0.0.1:4000) |
| Firestore | `127.0.0.1:8080` |
에뮬레이터를 끄면 데이터가 사라집니다. 다시 켠 뒤 `npm run db:seed`로 데모 데이터를 넣습니다.

```
AUTH_SECRET="로컬 개발용 시크릿"
FIREBASE_PROJECT_ID="demo-mokyang-flow"
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_STORAGE_BUCKET="demo-mokyang-flow.appspot.com"
# 교안·악보 업로드 (Vercel Blob 대시보드에서 발급하거나, 연결된 Vercel 프로젝트에서 vercel env pull)
BLOB_READ_WRITE_TOKEN="..."
```

**실제 Firebase**

콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키:

```
AUTH_SECRET="프로덕션에서 반드시 교체"
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@....iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="....appspot.com"
BLOB_READ_WRITE_TOKEN="..."  # Vercel Blob 스토어 연결 시 프로젝트 env에 자동 등록
```

에뮬레이터가 켜진 뒤(또는 실제 Firebase만 쓸 때) 다른 터미널에서:

```bash
npm install
npm run db:seed
npm run dev
```

[http://localhost:43123](http://localhost:43123)

## 데모 계정

비밀번호는 모두 `demo1234`입니다.

| 역할 | 이메일 |
|------|--------|
| 목사 | `pastor@church.demo` |
| 2026 회장 임범석 | `imbeomseok@test.church` |
| 2026 부회장 김광림 | `kimgwangrim@test.church` |
| 2026 총무 이혜미 | `leehyemi@test.church` |
| 2026 부총무 이승석 | `leeseungseok@test.church` |
| 2026 서기 박기도 | `parkgido@test.church` |
| 2026 부서기 김이레 | `kimire@test.church` |
| 2026 회계 정효정 | `jeonghyojeong@test.church` |
| 2026 부회계 우재황 | `woojaehwang@test.church` |

시드에는 이번 학기 가족 24개, 2026년 임원 8명, 리더모임 1건, 주일 예배 좌석 1건이 들어 있습니다.

## 배정모자

Realtime Database를 그대로 씁니다. `public/sorting-hat/firebase-config.js`의 웹 클라이언트 설정으로 배포 환경에서도 동작합니다. 다른 Firebase 프로젝트로 바꿀 때만 `firebase-config.example.js`를 참고합니다.

| 화면 | URL |
|------|-----|
| 조 배정·자리 뽑기 | [http://localhost:43123/hat](http://localhost:43123/hat) |
| 관리 | [http://localhost:43123/hat/admin](http://localhost:43123/hat/admin) |
| 공개 조 배정 | [http://localhost:43123/sorting-hat/index.html](http://localhost:43123/sorting-hat/index.html) |
| 공개 관리 | [http://localhost:43123/sorting-hat/admin.html](http://localhost:43123/sorting-hat/admin.html) |

관리자 비밀 메뉴 기본 비밀번호는 `7777`입니다.

## 배포 (Vercel)

공개 URL: [https://youth2-space.vercel.app](https://youth2-space.vercel.app)

디스크에 남기는 데이터는 없습니다. Firebase 환경 변수만 있으면 배포할 수 있습니다.

1. `.env.example`의 Firebase 서비스 계정·웹 푸시 변수를 등록합니다. 에뮬레이터 변수는 넣지 않습니다. Vercel Blob 스토어를 프로젝트에 연결하면 `BLOB_READ_WRITE_TOKEN`이 주입됩니다.
2. `AUTH_SECRET`을 새 값으로 바꿉니다.
3. 출석 리마인더용 `CRON_SECRET`을 등록합니다. Vercel Cron이 `Authorization: Bearer`로 넘깁니다.
4. Firestore 규칙은 클라이언트 접근 거부로 둡니다. 이 앱은 서버에서만 접근합니다.

## 기술 스택

- Next.js (App Router), TypeScript, Tailwind CSS
- NextAuth (이메일·비밀번호, Firestore 사용자)
- Firebase Admin (Firestore, Cloud Messaging)
- Vercel Blob (`@vercel/blob`, 리더 모임 자료)
- PWA (`public/manifest.webmanifest`, `public/icons/*`, `/firebase-messaging-sw.js`)
