import { updateMeetingScripture } from "@/app/actions";
import { Button, Textarea } from "@/components/ui";
import { scriptureLines } from "@/lib/meeting-scripture";

type Props = {
  meetingId: string;
  scripture: string | null;
  canEdit: boolean;
};

export function MeetingScriptureBlock({ meetingId, scripture, canEdit }: Props) {
  const lines = scripture ? scriptureLines(scripture) : [];

  return (
    <div className="space-y-4">
      {lines.length > 0 ? (
        <div className="space-y-2.5 rounded-xl border border-border bg-muted px-4 py-4">
          {lines.map((line, index) => (
            <p
              key={`${line.number ?? "line"}-${index}`}
              className={
                line.number
                  ? "flex gap-2 text-sm leading-7 text-foreground"
                  : "text-base font-semibold text-foreground"
              }
            >
              {line.number && (
                <span className="w-5 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-primary">
                  {line.number}
                </span>
              )}
              <span>{line.text}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">이번 주 본문이 아직 없습니다.</p>
      )}

      {canEdit && (
        <form
          action={async (fd) => {
            "use server";
            await updateMeetingScripture(meetingId, (fd.get("scripture") as string) ?? "");
          }}
          className="space-y-3 border-t border-border pt-3"
        >
          <Textarea
            name="scripture"
            rows={8}
            defaultValue={scripture ?? ""}
            placeholder={"고전 9:19-23\n19 절 내용\n20 절 내용"}
          />
          <Button type="submit" variant="secondary">본문 저장</Button>
        </form>
      )}
    </div>
  );
}
