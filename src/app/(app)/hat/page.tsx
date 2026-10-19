import { GuestAccessClosed } from "@/components/guest-access-closed";
import { SortingHatFrame } from "@/components/sorting-hat-frame";
import { getCurrentUser } from "@/lib/auth";
import { kstDateKeyNow } from "@/lib/kst-date";
import { guestHasOpenMeeting, isScopedMeetingGuest } from "@/lib/meeting-guest";
import { listMeetings } from "@/lib/store/meetings";
import {
  SORTING_HAT_USER_EMBED,
  meetingIdFromReturnParam,
  sortingHatEmbedSrc,
} from "@/lib/sorting-hat";

export default async function HatPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const { return: returnTo } = await searchParams;
  const meetingId = meetingIdFromReturnParam(returnTo);
  const currentUser = await getCurrentUser();
  if (currentUser && isScopedMeetingGuest(currentUser)) {
    const meetings = await listMeetings();
    if (!guestHasOpenMeeting(meetings, currentUser.id, kstDateKeyNow())) {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">배정모자</h2>
          <GuestAccessClosed />
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SortingHatFrame
        src={sortingHatEmbedSrc(SORTING_HAT_USER_EMBED, meetingId)}
        title="배정모자"
      />
    </div>
  );
}
