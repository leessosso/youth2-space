/** 로그인·조회용 전화번호 정규화 (숫자만, 국가번호 82 → 0). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return left.length > 0 && left === right;
}

export function isPhoneLike(input: string): boolean {
  const normalized = normalizePhone(input.trim());
  return normalized.length >= 9 && normalized.length <= 11 && /^\d+$/.test(normalized);
}
