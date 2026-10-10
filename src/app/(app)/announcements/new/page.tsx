import { redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/announcement-form";
import { Card } from "@/components/ui";
import { getUserById, listLoginUsersForServing } from "@/lib/store/users";
import { createAnnouncement } from "@/app/actions";
import { auth } from "@/auth";
import { canManageAnnouncements } from "@/lib/types";

export default async function NewAnnouncementPage() {
  const session = await auth();
  const fullUser = await getUserById(session!.user.id);
  if (!fullUser || !canManageAnnouncements(fullUser)) {
    redirect("/announcements");
  }

  const users = await listLoginUsersForServing();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">새 공지</h2>
        <p className="text-sm text-stone-600">임시저장하거나 지금 바로 푸시를 보낼 수 있습니다.</p>
      </div>
      <Card className="max-w-2xl" padding="md">
        <AnnouncementForm
          users={users}
          action={async (formData) => {
            "use server";
            await createAnnouncement(formData);
          }}
        />
      </Card>
    </div>
  );
}
