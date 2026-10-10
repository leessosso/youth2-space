import Link from "next/link";
import { AnnouncementUserPicker } from "@/components/announcement-user-picker";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { audienceLabel } from "@/lib/store/announcements";
import type { Announcement, AnnouncementAudience, User } from "@/lib/types";

type Props = {
  action: (formData: FormData) => Promise<void>;
  users: User[];
  initial?: Announcement;
  cancelHref?: string;
};

const AUDIENCES: AnnouncementAudience[] = ["all", "leaders", "users"];

export function AnnouncementForm({ action, users, initial, cancelHref = "/announcements" }: Props) {
  return (
    <form action={action} className="grid gap-4">
      <div>
        <Label>제목</Label>
        <Input name="title" required maxLength={120} defaultValue={initial?.title ?? ""} placeholder="공지 제목" />
      </div>
      <div>
        <Label>본문</Label>
        <Textarea
          name="body"
          required
          rows={6}
          defaultValue={initial?.body ?? ""}
          placeholder="공지 내용을 입력해 주세요"
        />
      </div>
      <div>
        <Label>발송 대상</Label>
        <div className="mt-2 space-y-2">
          {AUDIENCES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="audience"
                value={a}
                defaultChecked={(initial?.audience ?? "all") === a}
                className="border-input"
              />
              {audienceLabel(a)}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label>사용자 선택 (대상이 「선택한 사용자」일 때)</Label>
        <p className="mb-2 text-xs text-muted-foreground">알림을 켠 사용자만 푸시를 받습니다.</p>
        <AnnouncementUserPicker users={users} defaultSelectedIds={initial?.selectedUserIds ?? []} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="intent" value="draft" variant="secondary">임시저장</Button>
        <Button type="submit" name="intent" value="send">지금 보내기</Button>
        <Link href={cancelHref} className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-stone-600 underline">
          취소
        </Link>
      </div>
    </form>
  );
}
