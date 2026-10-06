import { cache } from "react";
import { settingsCol } from "@/lib/store/collections";
import { termFromDate, type Term } from "@/lib/term";

const APP_ID = "app";

export const getCurrentTerm = cache(async (): Promise<Term> => {
  const doc = await settingsCol.doc(APP_ID).get();
  if (doc.exists) {
    const data = doc.data();
    if (data?.year && (data.half === "H1" || data.half === "H2")) {
      return { year: data.year, half: data.half };
    }
  }
  const fallback = termFromDate();
  await settingsCol.doc(APP_ID).set(fallback);
  return fallback;
});

export async function setCurrentTerm(term: Term) {
  await settingsCol.doc(APP_ID).set(term);
}
