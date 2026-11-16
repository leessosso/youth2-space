import { fillAttendance, saveAssembly, saveTeamSection } from "@/app/assembly-actions";
import { Button, Input, Label, Textarea } from "@/components/ui";
import {
  MONTHLY_AGENDA,
  MONTHLY_TEAMS,
  type MonthlyAssembly,
  type MonthlyTeamKey,
  type TeamSection,
} from "@/lib/monthly-assembly";
import type { User } from "@/lib/types";

const selectClass = "h-9 w-full rounded-lg border border-input bg-surface px-2 text-sm";

function PointFields({
  prefix,
  points,
}: {
  prefix: string;
  points: MonthlyAssembly["annual"];
}) {
  return (
    <div className="mt-2 grid gap-2">
      {points.map((point, index) => (
        <div key={`${prefix}-${index}`} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <Input name={`${prefix}_${index}_label`} defaultValue={point.label} placeholder="25년 8월" aria-label="기간" />
          <Input name={`${prefix}_${index}_dept4`} defaultValue={point.dept4 ?? ""} inputMode="numeric" placeholder="4부" aria-label="4부" />
          <Input name={`${prefix}_${index}_dept13`} defaultValue={point.dept13 ?? ""} inputMode="numeric" placeholder="1–3부" aria-label="1–3부" />
        </div>
      ))}
    </div>
  );
}

function TeamFields({
  team,
  users,
  assignEditor,
}: {
  team: TeamSection;
  users: User[];
  assignEditor: boolean;
}) {
  return (
    <fieldset className="grid gap-3 border-t border-border pt-4">
      <legend className="text-sm font-semibold">{team.teamName}</legend>
      {assignEditor && (
        <div>
          <Label>이 팀을 입력할 사람</Label>
          <select name={`editor_${team.teamKey}`} defaultValue={team.editorUserId ?? ""} className={selectClass}>
            <option value="">지정 안 함</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
                {user.officerTitle ? ` · ${user.officerTitle}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {team.newFamily && (
        <div className="grid gap-2">
          <div>
            <Label>등록</Label>
            <Textarea name="nf_registered" defaultValue={team.newFamily.registered} rows={2} />
          </div>
          <div>
            <Label>출석</Label>
            <Textarea name="nf_attended" defaultValue={team.newFamily.attended} rows={2} />
          </div>
          <div>
            <Label>등반</Label>
            <Textarea name="nf_promoted" defaultValue={team.newFamily.promoted} rows={2} />
          </div>
          <div>
            <Label>수료</Label>
            <Textarea name="nf_completed" defaultValue={team.newFamily.completed} rows={2} />
          </div>
          <div>
            <Label>분기 평균</Label>
            <Textarea name="nf_quarter" defaultValue={team.newFamily.quarter} rows={2} />
          </div>
          <div>
            <Label>이번 달 메모</Label>
            <Textarea name="nf_monthNote" defaultValue={team.newFamily.monthNote} rows={2} />
          </div>
        </div>
      )}
      <div>
        <Label>지난달 사역</Label>
        <Textarea name={`last_${team.teamKey}`} defaultValue={team.lastMonth} />
      </div>
      <div>
        <Label>이번달 계획</Label>
        <Textarea name={`plan_${team.teamKey}`} defaultValue={team.thisMonth} />
      </div>
      {team.coramdeoRows && (
        <div className="grid gap-2">
          <p className="text-sm text-stone-700">기도회 인원</p>
          {team.coramdeoRows.map((row, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <Input name={`coram_${index}_label`} defaultValue={row.label} placeholder="35명 (7/1)" aria-label="기도회" />
              <Input name={`coram_${index}_count`} defaultValue={row.count} placeholder="인원 또는 메모" aria-label="인원" />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}

export function MonthlyAssemblyForm({
  assembly,
  users,
  teamKeys,
  attendanceNote,
}: {
  assembly: MonthlyAssembly;
  users: User[];
  teamKeys: MonthlyTeamKey[];
  attendanceNote?: string;
}) {
  const full = teamKeys.length === MONTHLY_TEAMS.length;
  const teams = assembly.teams.filter((team) => teamKeys.includes(team.teamKey));
  const business = Array.from({ length: 8 }, (_, index) => assembly.business[index] ?? {
    title: "",
    date: "",
    place: "",
    people: "",
    note: "",
  });

  if (!full) {
    return (
      <div className="grid gap-8">
        {teams.map((team) => (
          <form
            key={team.teamKey}
            action={async (fd) => {
              "use server";
              await saveTeamSection(assembly.id, team.teamKey, fd);
            }}
            className="grid gap-3"
          >
            <TeamFields team={team} users={users} assignEditor={false} />
            <Button type="submit">{team.teamName} 저장</Button>
          </form>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <form
        action={async (fd) => {
          "use server";
          await fillAttendance(assembly.id);
        }}
      >
        <Button type="submit" variant="secondary">
          출석 기록으로 그래프 채우기
        </Button>
        <p className="mt-2 text-sm text-stone-600">
          앱에 입력된 주일 출석(출석·온라인)으로 지난달 주별 인원과 최근 12달 평균을 넣습니다. 기록이 없으면 지금 숫자를 유지합니다.
          {attendanceNote ? ` ${attendanceNote}` : ""}
        </p>
      </form>

      <form
        action={async (fd) => {
          "use server";
          await saveAssembly(assembly.id, fd);
        }}
        className="grid gap-6"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>표어 구절</Label>
            <Input name="verse" defaultValue={assembly.verse} />
          </div>
          <div>
            <Label>일시</Label>
            <Input name="heldAt" defaultValue={assembly.heldAt} placeholder="2026년 8월 14일 오후 9시 40분" />
          </div>
          <div>
            <Label>장소</Label>
            <Input name="place" defaultValue={assembly.place} placeholder="디사이플홀" />
          </div>
          <div>
            <Label>2청년회 출석 목표</Label>
            <Input name="goalYouth" defaultValue={assembly.goalYouth} inputMode="numeric" />
          </div>
          <div>
            <Label>코람데오 출석 목표</Label>
            <Input name="goalCoramdeo" defaultValue={assembly.goalCoramdeo} inputMode="numeric" />
          </div>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">순서 담당</legend>
          {MONTHLY_AGENDA.map((item, index) => (
            <label key={`${item.title}-${index}`} className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr] sm:items-center">
              <span>
                {index + 1}. {item.title}
              </span>
              <Input name={`agenda_${index}`} defaultValue={assembly.agendaOwners[index] ?? ""} placeholder={item.role} />
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">연간 출석</legend>
          <p className="text-xs text-muted-foreground">기간, 4부, 1–3부. 빈 줄은 자료에 나오지 않습니다.</p>
          <PointFields prefix="annual" points={assembly.annual} />
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">지난달 주별 출석</legend>
          <PointFields prefix="week" points={assembly.previousWeeks} />
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">예배 순서</legend>
          {assembly.worship.map((row, index) => (
            <div key={index} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
              <Input name={`worship_${index}_date`} defaultValue={row.date} placeholder="8/2" aria-label="날짜" />
              <Input name={`worship_${index}_sermon`} defaultValue={row.sermon} placeholder="설교" aria-label="설교" />
              <Input name={`worship_${index}_liturgy`} defaultValue={row.liturgy} placeholder="예배안내/윗정리" aria-label="예배안내" />
              <Input name={`worship_${index}_worshipPrayer`} defaultValue={row.worshipPrayer} placeholder="예배를 위한 기도회" aria-label="기도회" />
              <Input name={`worship_${index}_repPrayer`} defaultValue={row.repPrayer} placeholder="대표기도" aria-label="대표기도" />
              <Input name={`worship_${index}_offeringPrayer`} defaultValue={row.offeringPrayer} placeholder="헌금기도" aria-label="헌금기도" />
              <Input name={`worship_${index}_offeringCommittee`} defaultValue={row.offeringCommittee} placeholder="헌금위원" aria-label="헌금위원" />
              <Input name={`worship_${index}_mealService`} defaultValue={row.mealService} placeholder="식당봉사" aria-label="식당봉사" />
            </div>
          ))}
        </fieldset>

        {teams.map((team) => (
          <TeamFields key={team.teamKey} team={team} users={users} assignEditor />
        ))}

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">사업보고</legend>
          {business.map((item, index) => (
            <div key={index} className="grid gap-2 border-t border-border pt-3">
              <Input name={`biz_${index}_title`} defaultValue={item.title} placeholder="사업 이름" aria-label="사업 이름" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input name={`biz_${index}_date`} defaultValue={item.date} placeholder="일시" aria-label="일시" />
                <Input name={`biz_${index}_place`} defaultValue={item.place} placeholder="장소" aria-label="장소" />
              </div>
              <Input name={`biz_${index}_people`} defaultValue={item.people} placeholder="인원" aria-label="인원" />
              <Textarea name={`biz_${index}_note`} defaultValue={item.note} rows={2} placeholder="메모" />
            </div>
          ))}
        </fieldset>

        <div>
          <Label>회계보고</Label>
          <Textarea name="finance" defaultValue={assembly.finance} />
        </div>
        <div>
          <Label>안건토의</Label>
          <Textarea name="safety" defaultValue={assembly.safety} />
        </div>
        <div>
          <Label>기타토의</Label>
          <Textarea name="other" defaultValue={assembly.other} />
        </div>
        <div>
          <Label>회의록 채택</Label>
          <Textarea name="minutes" defaultValue={assembly.minutes} />
        </div>
        <div>
          <Label>광고</Label>
          <Textarea name="announcements" defaultValue={assembly.announcements} />
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">행사 일정</legend>
          {assembly.calendar.map((row, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-4">
              <Input name={`cal_${index}_saturday`} defaultValue={row.saturday} placeholder="토요일" aria-label="토요일" />
              <Input name={`cal_${index}_saturdayEvent`} defaultValue={row.saturdayEvent} placeholder="토요일 행사" aria-label="토요일 행사" />
              <Input name={`cal_${index}_sunday`} defaultValue={row.sunday} placeholder="주일" aria-label="주일" />
              <Input name={`cal_${index}_sundayEvent`} defaultValue={row.sundayEvent} placeholder="주일 행사" aria-label="주일 행사" />
            </div>
          ))}
          <div>
            <Label>일정 하단 메모</Label>
            <Input name="calendarNote" defaultValue={assembly.calendarNote} />
          </div>
        </fieldset>

        <Button type="submit">저장하고 자료 보기</Button>
      </form>
    </div>
  );
}
