/**
 * 대시보드 홈 카드 정렬 (오늘 = Asia/Seoul 날짜 키 `YYYY-MM-DD`).
 * 1) 오늘 이후(오늘 포함) 날짜: 가까운 순
 * 2) 지난 날짜: 최근 순 (미래 일정 뒤)
 * 3) 날짜 없는 카드: 원래 순서 유지
 * 같은 날짜끼리는 원래 순서를 지킨다(안정 정렬).
 */
export type Dated<T> = { item: T; date: string | null };

export function orderByNearestDate<T>(items: Dated<T>[], today: string): T[] {
  const rank = ({ date }: Dated<T>) => (date == null ? 2 : date >= today ? 0 : 1);
  return items
    .map((d, index) => ({ ...d, index }))
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (ra === 0 && a.date !== b.date) return a.date! < b.date! ? -1 : 1;
      if (ra === 1 && a.date !== b.date) return a.date! > b.date! ? -1 : 1;
      return a.index - b.index;
    })
    .map((d) => d.item);
}

/** 훈련 요약: 진행 중 프로그램의 가장 이른 다음 수업일. */
export function earliestDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return valid[0] ?? null;
}
