import { kstDateKeyFromIso } from "@/lib/kst-date";
import type { LeaderMeeting, MeetingScripture } from "@/lib/types";

/** 2026-09-28~10-04 모임에 본문이 아직 저장되지 않았을 때 보여 준다. */
const WEEK_OF_2026_10_02: MeetingScripture = {
  reference: "고전 9:19-23",
  body: [
    "19 내가 모든 사람에게서 자유로우나 스스로 모든 사람에게 종이 된 것은 더 많은 사람을 얻고자 함이라",
    "20 유대인들에게 내가 유대인과 같이 된 것은 유대인들을 얻고자 함이요 율법 아래에 있는 자들에게는 내가 율법 아래에 있지 아니하나 율법 아래에 있는 자 같이 된 것은 율법 아래에 있는 자들을 얻고자 함이요",
    "21 율법 없는 자에게는 내가 하나님께는 율법 없는 자가 아니요 도리어 그리스도의 율법 아래에 있는 자이나 율법 없는 자와 같이 된 것은 율법 없는 자들을 얻고자 함이라",
    "22 약한 자들에게 내가 약한 자와 같이 된 것은 약한 자들을 얻고자 함이요 내가 여러 사람에게 여러 모습이 된 것은 아무쪼록 몇 사람이라도 구원하고자 함이니",
    "23 내가 복음을 위하여 모든 것을 행함은 복음에 참여하고자 함이라",
  ].join("\n"),
};

const WEEK_OF_2026_10_02_START = "2026-09-28";
const WEEK_OF_2026_10_02_END = "2026-10-04";

export function resolveMeetingScripture(meeting: LeaderMeeting): MeetingScripture | null {
  if (meeting.scripture) {
    const reference = meeting.scripture.reference.trim();
    const body = meeting.scripture.body.trim();
    if (!reference && !body) return null;
    return { reference, body };
  }

  if (Number.isNaN(Date.parse(meeting.date))) return null;
  const dateKey = kstDateKeyFromIso(meeting.date);
  if (dateKey < WEEK_OF_2026_10_02_START || dateKey > WEEK_OF_2026_10_02_END) return null;
  return WEEK_OF_2026_10_02;
}

export function scriptureVerses(body: string): { number: string | null; text: string }[] {
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) return { number: null, text: line };
      return { number: match[1], text: match[2] };
    });
}
