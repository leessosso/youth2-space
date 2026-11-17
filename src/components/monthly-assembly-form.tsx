import { fillAttendance, saveAssembly, saveTeamSection } from "@/app/assembly-actions";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { agendaPersonLabel, worshipPeopleGroups, type AgendaPerson } from "@/lib/agenda-people";
import {
  MONTHLY_AGENDA,
  MONTHLY_TEAMS,
  WORSHIP_PERSON_FIELDS,
  worshipDateToInput,
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
          <p className="text-sm font-medium">기도회 인원현황</p>
          {team.coramdeoRows.map((row, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <Input name={`coram_${index}_label`} defaultValue={row.label} placeholder="7/1" aria-label="기도회 날짜" />
              <Input name={`coram_${index}_count`} defaultValue={row.count} placeholder="35명" aria-label="기도회 인원" />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function WorshipPersonSelect({
  name,
  label,
  stored,
  heads,
  others,
}: {
  name: string;
  label: string;
  stored: string;
  heads: { userId: string; name: string }[];
  others: { userId: string; name: string }[];
}) {
  const known = heads.some((person) => person.userId === stored) || others.some((person) => person.userId === stored);
  const legacy = stored && !known ? stored : "";
  return (
    <select
      name={name}
      defaultValue={known || legacy ? stored : ""}
      className={selectClass}
      aria-label={label}
    >
      <option value="">미지정</option>
      {legacy ? <option value={legacy}>{legacy}</option> : null}
      {heads.length > 0 && (
        <optgroup label="가장">
          {heads.map((person) => (
            <option key={person.userId} value={person.userId}>
              {person.name}
            </option>
          ))}
        </optgroup>
      )}
      {others.length > 0 && (
        <optgroup label="다른 사람">
          {others.map((person) => (
            <option key={person.userId} value={person.userId}>
              {person.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

export function MonthlyAssemblyForm({
  assembly,
  users,
  teamKeys,
  agendaPeople,
  headIds,
  attendanceNote,
}: {
  assembly: MonthlyAssembly;
  users: User[];
  teamKeys: MonthlyTeamKey[];
  agendaPeople: AgendaPerson[];
  headIds: string[];
  attendanceNote?: string;
}) {
  const full = teamKeys.length === MONTHLY_TEAMS.length;
  const teams = assembly.teams.filter((team) => teamKeys.includes(team.teamKey));
  const worshipPeople = worshipPeopleGroups(
    users.map((user) => ({ userId: user.id, name: user.name })),
    headIds,
  );

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
          {MONTHLY_AGENDA.map((item, index) => {
            const stored = assembly.agendaOwners[index] ?? "";
            const known = agendaPeople.some((person) => person.userId === stored);
            const legacy = stored && stored !== item.role && !known ? stored : "";
            const officers = agendaPeople.filter((person) => person.group === "officer");
            const leaders = agendaPeople.filter((person) => person.group === "leader");
            return (
              <label key={`${item.title}-${index}`} className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr] sm:items-center">
                <span>
                  {index + 1}. {item.title}
                </span>
                <select
                  name={`agenda_${index}`}
                  defaultValue={known || legacy ? stored : ""}
                  className={selectClass}
                  aria-label={`${item.title} 담당`}
                >
                  <option value="">미지정</option>
                  {legacy ? <option value={legacy}>{legacy}</option> : null}
                  {officers.length > 0 && (
                    <optgroup label="임원">
                      {officers.map((person) => (
                        <option key={person.userId} value={person.userId}>
                          {agendaPersonLabel(person)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {leaders.length > 0 && (
                    <optgroup label="가장">
                      {leaders.map((person) => (
                        <option key={person.userId} value={person.userId}>
                          {agendaPersonLabel(person)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
            );
          })}
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
              <Input
                type="date"
                name={`worship_${index}_date`}
                defaultValue={worshipDateToInput(row.date, assembly.year)}
                aria-label="일시"
              />
              {WORSHIP_PERSON_FIELDS.map((field) => (
                <WorshipPersonSelect
                  key={field.key}
                  name={`worship_${index}_${field.key}`}
                  label={field.label}
                  stored={row[field.key]}
                  heads={worshipPeople.heads}
                  others={worshipPeople.others}
                />
              ))}
            </div>
          ))}
        </fieldset>

        {teams.map((team) => (
          <TeamFields key={team.teamKey} team={team} users={users} assignEditor />
        ))}

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">사업보고</legend>
          <div>
            <Label>지난달 사역</Label>
            <Textarea name="businessLast" defaultValue={assembly.business.lastMonth} />
          </div>
          <div>
            <Label>이번달 계획</Label>
            <Textarea name="businessPlan" defaultValue={assembly.business.thisMonth} />
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">회계보고</legend>
          <Textarea name="finance" defaultValue={assembly.finance} />
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">안건토의</legend>
          <Textarea name="safety" defaultValue={assembly.safety} />
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">기타토의</legend>
          <Textarea name="other" defaultValue={assembly.other} />
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">회의록 채택</legend>
          <Textarea name="minutes" defaultValue={assembly.minutes} />
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">광고</legend>
          <Textarea name="announcements" defaultValue={assembly.announcements} />
        </fieldset>

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
