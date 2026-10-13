import { redirect } from "next/navigation";
import { SortingHatFrame } from "@/components/sorting-hat-frame";
import { currentUserCanManageApp, requireLeaderTier } from "@/lib/auth";
import {
  SORTING_HAT_ADMIN_EMBED,
  meetingIdFromReturnParam,
  sortingHatEmbedSrc,
} from "@/lib/sorting-hat";

export default async function HatAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  await requireLeaderTier();
  if (!(await currentUserCanManageApp())) redirect("/dashboard");

  const { return: returnTo } = await searchParams;
  const meetingId = meetingIdFromReturnParam(returnTo);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SortingHatFrame
        src={sortingHatEmbedSrc(SORTING_HAT_ADMIN_EMBED, meetingId)}
        title="배정 관리"
      />
    </div>
  );
}
