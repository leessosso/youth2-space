/**
 * 성도(members) 중 계정이 없는 사람에게 MEMBER 계정을 만든다.
 *
 * 기본은 dry-run(읽기만). `--apply`를 줄 때만 쓴다.
 *
 *   # dry-run: 대상·제외 사유 집계와 CSV(계획)만 만든다
 *   npx tsx scripts/provision-members.ts --out provision-plan.csv
 *
 *   # 실제 생성 (운영자 승인 후에만). 초기 비밀번호는 환경변수로만 받고 출력하지 않는다.
 *   MEMBER_INITIAL_PASSWORD=... npx tsx scripts/provision-members.ts --apply --out provision-rollback.csv
 *
 * 자격 증명: FIREBASE_SERVICE_ACCOUNT_JSON(서비스 계정 JSON 문자열) 또는
 * FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY. 에뮬레이터 변수가 있으면 에뮬레이터를 쓴다.
 * `--expect-project <id>`를 주면 다른 프로젝트일 때 중단한다.
 *
 * 규칙
 * - 대상: members.userId == null 이고 이름이 있는 성도
 * - users 문서 id: `m_{memberId}` (결정적 → 다시 돌려도 중복 생성 없음)
 * - role MEMBER, mustChangePassword true, phone null, email `<userId>@no-email.youth2.local`
 * - 로그인 ID는 이름 그대로라, 기존 계정과 이름이 같거나 대상끼리 이름이 겹치면 만들지 않고 보고한다
 * - 성도 1명당 트랜잭션 1번: member.userId가 여전히 null이고 users 문서가 없을 때만 users 생성 + member.userId 연결
 * - CSV: memberId,userId,name,groupId,status — apply 결과 CSV가 곧 롤백 목록이다
 *   (롤백 = 해당 users 문서 삭제 + members.userId를 null로)
 */
import { writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type Args = { apply: boolean; out: string | null; expectProject: string | null; passwordEnv: string };

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false, out: null, expectProject: null, passwordEnv: "MEMBER_INITIAL_PASSWORD" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--out") args.out = argv[++i] ?? null;
    else if (a === "--expect-project") args.expectProject = argv[++i] ?? null;
    else if (a === "--password-env") args.passwordEnv = argv[++i] ?? args.passwordEnv;
    else throw new Error(`알 수 없는 인자: ${a}`);
  }
  return args;
}

function initDb(expectProject: string | null): { db: Firestore; projectId: string; emulator: boolean } {
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  let app: App;
  let projectId: string;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (emulator) {
    projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-mokyang-flow";
    app = initializeApp({ projectId }, "provision-members");
  } else if (json) {
    const sa = JSON.parse(json) as { project_id: string; client_email: string; private_key: string };
    projectId = sa.project_id;
    app = initializeApp(
      { credential: cert({ projectId, clientEmail: sa.client_email, privateKey: sa.private_key.replace(/\\n/g, "\n") }), projectId },
      "provision-members",
    );
  } else {
    projectId = process.env.FIREBASE_PROJECT_ID ?? "";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase 자격 증명이 없습니다.");
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "provision-members");
  }
  if (expectProject && expectProject !== projectId) {
    throw new Error(`프로젝트 불일치: 기대 ${expectProject}, 실제 ${projectId}`);
  }
  return { db: getFirestore(app), projectId, emulator };
}

type Row = { memberId: string; userId: string; name: string; groupId: string; status: string };

function csv(rows: Row[]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return ["memberId,userId,name,groupId,status", ...rows.map((r) => [r.memberId, r.userId, r.name, r.groupId, r.status].map(esc).join(","))].join("\n") + "\n";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { db, projectId, emulator } = initDb(args.expectProject);
  console.log(`mode=${args.apply ? "APPLY" : "dry-run"} project=${projectId} emulator=${emulator}`);

  const [membersSnap, usersSnap] = await Promise.all([db.collection("members").get(), db.collection("users").get()]);
  const userNames = new Set(usersSnap.docs.map((d) => String(d.get("name") ?? "").trim()));
  const userIds = new Set(usersSnap.docs.map((d) => d.id));

  const unlinked = membersSnap.docs.filter((d) => !d.get("userId"));
  const nameCount = new Map<string, number>();
  for (const d of unlinked) {
    const n = String(d.get("name") ?? "").trim();
    nameCount.set(n, (nameCount.get(n) ?? 0) + 1);
  }

  const rows: Row[] = unlinked.map((d) => {
    const name = String(d.get("name") ?? "").trim();
    const userId = `m_${d.id}`;
    let status = "planned";
    if (!name) status = "skip:empty_name";
    else if (userIds.has(userId)) status = "skip:user_doc_exists";
    else if (userNames.has(name)) status = "skip:name_taken_by_existing_user";
    else if ((nameCount.get(name) ?? 0) > 1) status = "skip:duplicate_name_in_targets";
    return { memberId: d.id, userId, name, groupId: String(d.get("groupId") ?? ""), status };
  });

  const summary = (list: Row[]) =>
    Object.entries(list.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {}));
  console.log(`members=${membersSnap.size} linked=${membersSnap.size - unlinked.length} unlinked=${unlinked.length} users=${usersSnap.size}`);
  for (const [status, count] of summary(rows)) console.log(`  ${status}: ${count}`);

  if (!args.apply) {
    if (args.out) {
      writeFileSync(args.out, csv(rows));
      console.log(`plan csv: ${args.out}`);
    }
    console.log("dry-run: 아무것도 쓰지 않았습니다. 실제 생성은 --apply.");
    return;
  }

  if (!args.out) throw new Error("--apply에는 롤백 CSV 경로(--out)가 필요합니다.");
  const password = process.env[args.passwordEnv] ?? "";
  if (password.length < 8) throw new Error(`${args.passwordEnv}(8자 이상)가 필요합니다. 값은 출력하지 않습니다.`);
  const passwordHash = await bcrypt.hash(password, 10);

  const now = new Date().toISOString();
  for (const row of rows) {
    if (row.status !== "planned") continue;
    const memberRef = db.collection("members").doc(row.memberId);
    const userRef = db.collection("users").doc(row.userId);
    try {
      await db.runTransaction(async (tx) => {
        const [m, u] = await Promise.all([tx.get(memberRef), tx.get(userRef)]);
        if (!m.exists || m.get("userId")) throw new Error("member_already_linked");
        if (u.exists) throw new Error("user_doc_exists");
        tx.create(userRef, {
          email: `${row.userId}@no-email.youth2.local`,
          passwordHash,
          name: row.name,
          phone: null,
          mustChangePassword: true,
          role: "MEMBER",
          attendeeKind: null,
          officerTitle: null,
          createdAt: now,
        });
        tx.update(memberRef, { userId: row.userId });
      });
      row.status = "created";
    } catch (err) {
      row.status = `failed:${err instanceof Error ? err.message : "unknown"}`;
    }
    // 중간에 멈춰도 롤백 목록이 남도록 매번 쓴다.
    writeFileSync(args.out, csv(rows));
  }
  for (const [status, count] of summary(rows)) console.log(`  ${status}: ${count}`);
  console.log(`rollback csv: ${args.out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
