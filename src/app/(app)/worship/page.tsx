import Link from "next/link";
import { createWorshipService } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import { listAssignmentsByService, listWorshipServices } from "@/lib/store/worship";

export default async function WorshipListPage() {
  const canAdmin = await currentUserCanManageApp();

  const services = await listWorshipServices();
  const assignmentCounts = await Promise.all(
    services.map((s) => listAssignmentsByService(s.id).then((a) => a.length)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">예배 좌석 배치</h2>
        <p className="text-sm text-stone-600">가족별 구역 배치 및 인도용 화면</p>
      </div>

      <div
        className={
          canAdmin
            ? "grid items-start gap-6 lg:grid-cols-[minmax(20rem,24rem)_1fr]"
            : undefined
        }
      >
      {canAdmin && (
        <Card className="lg:sticky lg:top-8" padding="md">
          <h3 className="font-medium">새 예배 일정</h3>
          <form
            action={async (fd) => {
              "use server";
              await createWorshipService(
                fd.get("date") as string,
                (fd.get("title") as string) || "주일예배",
              );
            }}
            className="mt-3 grid gap-3"
          >
            <div>
              <Label>날짜</Label>
              <Input name="date" type="date" required />
            </div>
            <div>
              <Label>제목</Label>
              <Input name="title" placeholder="주일 2부 예배" />
            </div>
            <Button type="submit">생성</Button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="예배 목록" />
        <ul className="divide-y divide-muted">
          {services.map((s, i) => (
            <li key={s.id}>
              <Link
                href={`/worship/${s.id}`}
                className="block px-4 py-3 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
              >
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateKo(s.date)} · {assignmentCounts[i]}가족
                </p>
              </Link>
            </li>
          ))}
          {services.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">등록된 예배가 없습니다.</li>
          )}
        </ul>
      </Card>
      </div>
    </div>
  );
}
