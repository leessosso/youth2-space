import { notFound } from "next/navigation";
import { formatDateKo } from "@/lib/format";
import { listGroups } from "@/lib/store/groups";
import {
  getWorshipServiceById,
  listAssignmentsByService,
  listZonesByService,
} from "@/lib/store/worship";

export default async function WorshipPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getWorshipServiceById(id);
  if (!service) notFound();

  const [zones, assignments, groups] = await Promise.all([
    listZonesByService(id),
    listAssignmentsByService(id),
    listGroups(),
  ]);
  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-foreground print:p-4">
      <h1 className="text-2xl font-bold">2청년회 예배 좌석 안내</h1>
      <p className="mt-1 text-stone-600">
        {service.title} · {formatDateKo(service.date)}
      </p>
      <div className="mt-8 grid grid-cols-2 gap-6">
        {zones.map((zone) => {
          const names = assignments
            .filter((a) => a.zoneId === zone.id)
            .map((a) => groupMap.get(a.groupId) ?? "알 수 없음");
          return (
            <div key={zone.id} className="border border-input p-4">
              <h2 className="text-lg font-semibold">{zone.name}</h2>
              <p className="mt-2 text-base">
                {names.length ? names.join(", ") : "—"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">인도자·가장 배포용</p>
    </div>
  );
}
