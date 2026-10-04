/** 로그인 후 통독 진입 — SSO 티켓 발급 API (클라이언트·서버 공용). */
export const TONGDOK_SSO_ENTRY_PATH = "/api/platform/tongdok-sso";

/** 발급 후 같은 호스트 핸드오프. `/tongdok/*` rewrite가 tongdok 앱으로 전달한다. */
export const TONGDOK_SSO_CONSUME_PATH = "/tongdok/sso/consume";

/** 훈련 티켓(`class-management`)과 구분. issuer는 TRAINING_SSO_ISSUER. */
export const TONGDOK_SSO_AUDIENCE = "tongdok";

export const TONGDOK_SSO_TTL_SECONDS = 120;
