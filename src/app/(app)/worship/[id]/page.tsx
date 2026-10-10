import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { assignGroupSeating } from "@/app/actions";
import { Button, Card, CardHeader } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import { listGroups } from "@/lib/store/groups";
import {
  getWorshipServiceById,
  listAssignmentsByService,
  listZonesByService,
} from "@/lib/store/worship";

export default async function WorshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canEdit = (await currentUserCanManageApp()) || session!.user.role === "LEADER";

  const service = await getWorshipServiceById(id);
  if (!service) notFound();

  const [zones, assignments, groups] = await Promise.all([
    listZonesByService(id),
    listAssignmentsByService(id),
    listGroups(),
  ]);

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const assignmentMap = new Map(assignments.map((a) => [a.groupId, a.zoneId]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/worship" className="text-sm text-stone-600 underline">← 예배 목록</Link>
          <h2 className="mt-2 text-xl font-semibold">{service.title}</h2>
          <p className="text-sm text-stone-600">{formatDateKo(service.date)}</p>
        </div>
        <Link
          href={`/worship/${id}/print`}
          className="rounded-lg border border-input px-3 py-2 text-sm hover:bg-background"
        >
          인쇄용 보기
        </Link>
      </div>

      <Card>
        <CardHeader title="구역 배치도" subtitle="가족별 좌석 블록" />
        <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-5 xl:grid-cols-4">
          {zones.map((zone) => {
            const assigned = assignments.filter((a) => a.zoneId === zone.id);
            return (
              <div
                key={zone.id}
                className="min-h-[100px] rounded-xl border-2 border-dashed border-border bg-background p-3"
              >
                <p className="text-sm font-semibold text-stone-800">{zone.name}</p>
                <ul className="mt-2 space-y-1">
                  {assigned.map((a) => (
                    <li key={a.id} className="text-sm text-stone-700">
                      {groupMap.get(a.groupId)?.name ?? "알 수 없음"}
                    </li>
                  ))}
                  {assigned.length === 0 && (
                    <li className="text-xs text-stone-400">배정 없음</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader title="가족별 구역 지정" />
          <ul className="divide-y divide-muted">
            {groups.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="w-16 font-medium">{g.name}</span>
                <form
                  action={async (fd) => {
                    "use server";
                    await assignGroupSeating(
                      id,
                      g.id,
                      fd.get("zoneId") as string,
                    );
                  }}
                  className="flex flex-1 flex-wrap items-center gap-2"
                >
                  <select
                    name="zoneId"
                    defaultValue={assignmentMap.get(g.id) ?? ""}
                    className="rounded-lg border border-input px-2 py-1.5 text-sm"
                    required
                  >
                    <option value="" disabled>구역 선택</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary">저장</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
