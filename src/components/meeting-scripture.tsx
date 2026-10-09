import { updateMeetingScripture } from "@/app/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { scriptureVerses } from "@/lib/meeting-scripture";
import type { MeetingScripture } from "@/lib/types";

type Props = {
  meetingId: string;
  scripture: MeetingScripture | null;
  canEdit: boolean;
};

export function MeetingScriptureBlock({ meetingId, scripture, canEdit }: Props) {
  const verses = scripture ? scriptureVerses(scripture.body) : [];

  return (
    <div className="space-y-4">
      {scripture ? (
        <figure className="rounded-xl border border-border bg-muted px-4 py-4">
          <figcaption>
            <p className="text-xs font-medium text-primary">이번 주 본문</p>
            {scripture.reference && (
              <p className="mt-1 text-base font-semibold text-foreground">{scripture.reference}</p>
            )}
          </figcaption>
          {verses.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {verses.map((verse, index) => (
                <p key={`${verse.number ?? "line"}-${index}`} className="flex gap-2 text-sm leading-7 text-foreground">
                  {verse.number && (
                    <span className="w-5 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-primary">
                      {verse.number}
                    </span>
                  )}
                  <span>{verse.text}</span>
                </p>
              ))}
            </div>
          )}
        </figure>
      ) : (
        <p className="text-sm text-muted-foreground">이번 주 본문이 아직 없습니다.</p>
      )}

      {canEdit && (
        <form
          action={async (fd) => {
            "use server";
            await updateMeetingScripture(
              meetingId,
              (fd.get("reference") as string) ?? "",
              (fd.get("body") as string) ?? "",
            );
          }}
          className="space-y-3 border-t border-border pt-3"
        >
          <div>
            <Label>구절</Label>
            <Input
              name="reference"
              defaultValue={scripture?.reference ?? ""}
              placeholder="고전 9:19-23"
            />
          </div>
          <div>
            <Label>본문</Label>
            <Textarea
              name="body"
              rows={8}
              defaultValue={scripture?.body ?? ""}
              placeholder={"19 절 내용\n20 절 내용"}
            />
          </div>
          <Button type="submit" variant="secondary">본문 저장</Button>
        </form>
      )}
    </div>
  );
}
