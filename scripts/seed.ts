import "dotenv/config";
import { getDb } from "../src/lib/firebase-admin";
import { hashPassword } from "../src/lib/password";

const COLLECTIONS = [
  "pastoralMessages",
  "pastoralThreads",
  "seatingAssignments",
  "seatingZones",
  "worshipServices",
  "meetingAssets",
  "leaderMeetings",
  "groupLeaderTerms",
  "officerAppointments",
  "members",
  "groups",
  "users",
  "settings",
];

async function clearAll() {
  for (const name of COLLECTIONS) {
    const snap = await getDb().collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

async function main() {
  await clearAll();

  const passwordHash = await hashPassword("demo1234");
  const now = new Date().toISOString();

  async function addUser(data: {
    email: string;
    name: string;
    phone: string;
    role: "PASTOR" | "LEADER" | "ADMIN";
    officerTitle?: string | null;
  }) {
    const ref = getDb().collection("users").doc();
    await ref.set({
      email: data.email,
      passwordHash,
      name: data.name,
      phone: data.phone.replace(/\D/g, ""),
      mustChangePassword: false,
      role: data.role,
      officerTitle: data.officerTitle ?? null,
      createdAt: now,
    });
    return ref.id;
  }

  const pastorId = await addUser({
    email: "pastor@church.demo",
    name: "김목사",
    phone: "01010000001",
    role: "PASTOR",
  });

  await getDb().collection("settings").doc("app").set({ year: 2026, half: "H1" });

  const officerUsers: { userId: string; name: string; phone: string }[] = [];
  const officers = [
    { title: "회장", name: "임범석", email: "imbeomseok@test.church", phone: "01020000001" },
    { title: "부회장", name: "김광림", email: "kimgwangrim@test.church", phone: "01020000002" },
    { title: "총무", name: "이혜미", email: "leehyemi@test.church", phone: "01020000003" },
    { title: "부총무", name: "이승석", email: "leeseungseok@test.church", phone: "01020000004" },
    { title: "서기", name: "박기도", email: "parkgido@test.church", phone: "01020000005" },
    { title: "부서기", name: "김이레", email: "kimire@test.church", phone: "01020000006" },
    { title: "회계", name: "정효정", email: "jeonghyojeong@test.church", phone: "01020000007" },
    { title: "부회계", name: "우재황", email: "woojaehwang@test.church", phone: "01020000008" },
  ] as const;
  for (const officer of officers) {
    const userId = await addUser({
      email: officer.email,
      name: officer.name,
      phone: officer.phone,
      role: "LEADER",
      officerTitle: officer.title,
    });
    await getDb().collection("officerAppointments").doc().set({
      userId,
      year: 2026,
      title: officer.title,
      startedAt: now,
      endedAt: null,
    });
    officerUsers.push({ userId, name: officer.name, phone: officer.phone });
  }

  async function addMember(name: string, phone: string, groupId: string, userId: string) {
    const ref = getDb().collection("members").doc();
    await ref.set({
      groupId,
      name,
      phone: phone.replace(/\D/g, ""),
      userId,
      createdAt: now,
    });
  }

  for (const officer of officerUsers) {
    await addMember(officer.name, officer.phone, "", officer.userId);
  }

  const householdHeads = [
    ["김건우", "kimgeonwoo@test.church", "건우네"],
    ["김시인", "kimsiin@test.church", "시인이네"],
    ["김애선", "kimaeseon@test.church", "애선이네"],
    ["김윤영", "kimyunyeong@test.church", "윤영이네"],
    ["김재원", "kimjaewon@test.church", "재원이네"],
    ["김종인", "kimjongin@test.church", "종인이네"],
    ["김찬욱", "kimchanuk@test.church", "찬욱이네"],
    ["김현중D", "kimhyeonjungd@test.church", "현중이네"],
    ["박희원", "parkheewon@test.church", "희원이네"],
    ["방보윤", "bangboyun@test.church", "보윤이네"],
    ["방연진", "bangyeonjin@test.church", "연진이네"],
    ["백동현", "baekdonghyeon@test.church", "백동현네"],
    ["백에스더", "baekesther@test.church", "에스더네"],
    ["송민석", "songminseok@test.church", "민석이네"],
    ["송혜미", "songhyemi@test.church", "혜미네"],
    ["신상준", "shinsangjun@test.church", "상준이네"],
    ["원유정", "wonyujeong@test.church", "유정이네"],
    ["위성혜", "wiseonghye@test.church", "성혜네"],
    ["윤주앙", "yoonjuang@test.church", "주앙이네"],
    ["이동현c", "leedonghyunc@test.church", "이동현네"],
    ["이슬기", "leeseulgi@test.church", "슬기네"],
    ["이정인", "leejeongin@test.church", "정인이네"],
    ["이필홍", "leephilhong@test.church", "필홍이네"],
    ["한성민", "hanseongmin@test.church", "성민이네"],
  ] as const;
  const householdHeadIds: { userId: string; familyName: string; name: string; phone: string }[] = [];
  let householdPhoneSeq = 30000001;
  for (const [name, email, familyName] of householdHeads) {
    const phone = `010${householdPhoneSeq++}`;
    const userId = await addUser({
      email,
      name,
      phone,
      role: "LEADER",
    });
    householdHeadIds.push({ userId, familyName, name, phone });
  }

  async function addGroup(name: string, description: string, currentLeaderId: string, year: number, half: "H1" | "H2") {
    const ref = getDb().collection("groups").doc();
    await ref.set({ name, description, currentLeaderId, year, half });
    return ref.id;
  }

  const g3PrevId = await addGroup("3가족", "2025 하반기", householdHeadIds[0].userId, 2025, "H2");

  const termStart = "2025-01-01T00:00:00.000Z";

  for (const { userId, familyName, name, phone } of householdHeadIds) {
    const groupId = await addGroup(familyName, "", userId, 2026, "H1");
    await addMember(name, phone, groupId, userId);
    await getDb().collection("groupLeaderTerms").doc().set({
      groupId,
      leaderId: userId,
      year: 2026,
      half: "H1",
      startedAt: termStart,
      endedAt: null,
    });
  }

  // 2025 하반기 3가족 가장 (학기 재구성 데모)
  await getDb().collection("groupLeaderTerms").doc().set({
    groupId: g3PrevId,
    leaderId: householdHeadIds[0].userId,
    year: 2025,
    half: "H2",
    startedAt: "2025-07-01T00:00:00.000Z",
    endedAt: "2025-12-31T00:00:00.000Z",
  });

  const meetingRef = getDb().collection("leaderMeetings").doc();
  await meetingRef.set({
    title: "3월 1주 리더모임",
    date: "2026-03-05T19:30:00.000Z",
    notes: "교안 나눔 및 이번 달 가족 사역 나눔",
    prayerLeaderId: householdHeadIds[0].userId,
    dutyUserIds: { prayer_meeting_lead: householdHeadIds[0].userId },
    createdAt: now,
  });

  // 주일 예배 좌석
  const serviceRef = getDb().collection("worshipServices").doc();
  await serviceRef.set({ date: "2026-03-09T11:00:00.000Z", title: "주일 2부 예배" });

  const zoneNames = ["좌측 A구역", "중앙 B구역", "우측 C구역", "발코니 D구역"];
  const zoneIds: string[] = [];
  for (let i = 0; i < zoneNames.length; i++) {
    const zoneRef = getDb().collection("seatingZones").doc();
    await zoneRef.set({
      serviceId: serviceRef.id,
      name: zoneNames[i],
      sortOrder: i,
      gridRow: Math.floor(i / 2),
      gridCol: i % 2,
    });
    zoneIds.push(zoneRef.id);
  }

  console.log("시드 완료");
  console.log("목사:", "pastor@church.demo", "/ demo1234");
  console.log("2026 임원: imbeomseok@test.church 외 7명 / demo1234");
  void pastorId;
  void zoneIds;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
