import { AttendanceChart } from "@/components/attendance-chart";
import {
  MONTHLY_AGENDA,
  assemblyTitle,
  previousMonth,
  visiblePoints,
  type MonthlyAssembly,
} from "@/lib/monthly-assembly";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-6 whitespace-pre-wrap">{children}</div>
    </section>
  );
}

export function MonthlyPacket({ assembly }: { assembly: MonthlyAssembly }) {
  const prev = previousMonth(assembly.year, assembly.month);
  const weeks = visiblePoints(assembly.previousWeeks);
  const worship = assembly.worship.filter((row) =>
    Object.values(row).some((value) => value.trim()),
  );
  const calendar = assembly.calendar.filter((row) =>
    Object.values(row).some((value) => value.trim()),
  );

  return (
    <article className="mx-auto max-w-3xl bg-surface px-4 py-6 text-foreground print:max-w-none print:px-0">
      <header className="border border-border">
        <div className="grid grid-cols-3 border-b border-border text-center text-sm">
          <p className="border-r border-border px-2 py-2">등촌교회 제2청년회</p>
          <p className="border-r border-border px-2 py-2">{assembly.verse}</p>
          <p className="px-2 py-2">
            {assembly.year}.{String(assembly.month).padStart(2, "0")}
          </p>
        </div>
        <h1 className="py-4 text-center text-2xl font-semibold">{assemblyTitle(assembly)}</h1>
        <ol className="grid gap-x-4 px-4 pb-4 text-sm sm:grid-cols-3">
          {MONTHLY_AGENDA.map((item, index) => (
            <li key={`${item.title}-${index}`}>
              {index + 1}. {item.title} – {assembly.agendaOwners[index] || item.role}
            </li>
          ))}
        </ol>
        <p className="border-t border-border px-4 py-2 text-center text-sm">
          {[assembly.heldAt, assembly.place].filter(Boolean).join(" ")}
        </p>
      </header>

      <p className="mt-4 text-sm">
        평균 출석 목표 / 제2청년회 : {assembly.goalYouth}명 / 코람데오 : {assembly.goalCoramdeo}명
      </p>

      <div className="mt-6 space-y-8">
        <AttendanceChart title="연간출석통계" points={assembly.annual} />
        <AttendanceChart title={`${prev.month}월 출석통계`} points={weeks.length ? assembly.previousWeeks : []} />
      </div>

      {worship.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr className="border-y border-border">
                {["날짜", "설교", "예배안내/윗정리", "예배를 위한 기도회", "대표기도", "헌금기도", "헌금위원", "식당봉사"].map(
                  (label) => (
                    <th key={label} className="px-1 py-2 font-medium">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {worship.map((row) => (
                <tr key={row.date + row.sermon} className="border-b border-border">
                  <td className="py-1">{row.date}</td>
                  <td>{row.sermon}</td>
                  <td>{row.liturgy}</td>
                  <td>{row.worshipPrayer}</td>
                  <td>{row.repPrayer}</td>
                  <td>{row.offeringPrayer}</td>
                  <td>{row.offeringCommittee}</td>
                  <td>{row.mealService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Block title="1. 기도">{""}</Block>
      <Block title="2. 회원호명">{""}</Block>
      <Block title="3. 전월 회의록">리더밴드에 게시</Block>

      <section className="mt-8">
        <h2 className="text-base font-semibold">4. 팀 사역보고</h2>
        <div className="mt-3 space-y-6">
          {assembly.teams.map((team, index) => (
            <div key={team.teamKey}>
              <h3 className="text-sm font-semibold">
                ({index + 1}) {team.teamName}
              </h3>
              {team.newFamily && (
                <ul className="mt-2 list-disc pl-5 text-sm leading-6">
                  <li>등록: {team.newFamily.registered || "—"}</li>
                  <li>출석: {team.newFamily.attended || "—"}</li>
                  <li>등반: {team.newFamily.promoted || "—"}</li>
                  <li>수료: {team.newFamily.completed || "—"}</li>
                  {team.newFamily.quarter && <li>분기 평균: {team.newFamily.quarter}</li>}
                  {team.newFamily.monthNote && <li>{team.newFamily.monthNote}</li>}
                </ul>
              )}
              <p className="mt-2 text-sm font-medium">지난달 사역</p>
              <p className="text-sm leading-6 whitespace-pre-wrap">{team.lastMonth || "—"}</p>
              <p className="mt-2 text-sm font-medium">이번달 계획</p>
              <p className="text-sm leading-6 whitespace-pre-wrap">{team.thisMonth || "—"}</p>
              {team.coramdeoRows && team.coramdeoRows.some((row) => row.label || row.count) && (
                <table className="mt-2 w-full border-collapse text-center text-sm">
                  <tbody>
                    {team.coramdeoRows
                      .filter((row) => row.label || row.count)
                      .map((row) => (
                        <tr key={row.label + row.count} className="border-b border-border">
                          <td className="py-1">{row.label}</td>
                          <td>{row.count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">5. 사업보고</h2>
        {assembly.business.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">등록된 사업이 없습니다.</p>
        ) : (
          <ol className="mt-2 space-y-3 text-sm">
            {assembly.business.map((item, index) => (
              <li key={`${item.title}-${index}`}>
                <p className="font-medium">
                  {index + 1}. {item.title}
                </p>
                <p>{[item.date && `일시: ${item.date}`, item.place && `장소: ${item.place}`].filter(Boolean).join(" · ")}</p>
                {item.people && <p>인원: {item.people}</p>}
                {item.note && <p className="whitespace-pre-wrap">{item.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <Block title="6. 회계보고(별첨자료)">{assembly.finance || "—"}</Block>
      <Block title="7. 안건토의">{assembly.safety || "—"}</Block>
      <Block title="8. 기타토의">{assembly.other || "—"}</Block>
      <Block title="9. 회의록 채택">{assembly.minutes || "—"}</Block>
      <Block title="10. 광고">{assembly.announcements || "—"}</Block>

      {calendar.length > 0 && (
        <table className="mt-4 w-full border-collapse text-center text-sm">
          <caption className="mb-2 text-left font-medium">{assembly.month}월 행사 일정</caption>
          <thead>
            <tr className="border-y border-border">
              <th className="py-1 font-medium">토요일</th>
              <th className="font-medium">행사</th>
              <th className="font-medium">주일</th>
              <th className="font-medium">행사</th>
            </tr>
          </thead>
          <tbody>
            {calendar.map((row, index) => (
              <tr key={index} className="border-b border-border">
                <td className="py-1">{row.saturday}</td>
                <td>{row.saturdayEvent}</td>
                <td>{row.sunday}</td>
                <td>{row.sundayEvent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {assembly.calendarNote && <p className="mt-2 text-center text-sm">{assembly.calendarNote}</p>}

      <Block title="11. 기도">{""}</Block>
    </article>
  );
}
