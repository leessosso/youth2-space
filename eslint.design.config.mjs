/**
 * Design lint (공통 룩앤필 가드) — @shadcn/lint 기반.
 *
 * 규칙 요약 (자세한 내용: docs/design-lint.md)
 *  (a) 테마 토큰 외 색상 금지
 *      - shadcn/no-raw-colors      : red-*, blue-*, slate-* 등 Tailwind 팔레트 색, 선언되지 않은 토큰
 *      - shadcn/no-arbitrary-values: bg-[#...], text-[rgb(...)] 등 임의 "색상" 값 (색 외 임의값은 허용)
 *      - shadcn/no-inline-styles   : style={{ color: "#..." }} 등 인라인 색상 속성
 *  (b) 공통 컴포넌트 call-site 재스타일 금지
 *      - shadcn/no-restyle         : @/components/ui, @/components/ui/* 컴포넌트에
 *                                    레이아웃 외 className(색·테두리·radius·그림자·타이포·패딩·높이) 금지
 *
 * 의도적 예외는 해당 줄에 사유와 함께 표시:
 *   // eslint-disable-next-line shadcn/<rule> -- design-lint-allow: <사유>
 *
 * `npm run lint:design` (prebuild) 와 `npm run lint` 양쪽에서 실행된다.
 */
import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";

/** 색과 무관한 임의값 카테고리 — no-arbitrary-values 는 "색"만 잡는다. */
const NON_COLOR_CATEGORIES = [
  "layout",
  "typography",
  "spacing",
  "shape",
  "effects",
  "motion",
];

/** 인라인 style 중 색을 지정하는 속성만 금지 (레이아웃용 동적 값은 허용). */
const INLINE_COLOR_PROPERTIES = [
  "color",
  "background",
  "background-color",
  "background-image",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
  "accent-color",
  "fill",
  "stroke",
  "box-shadow",
  "text-shadow",
];

const designLintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    name: "design-lint/shell",
    // 셸 소스만 대상. public/** (특히 public/sorting-hat/** 레거시 임베드 앱: 정적 HTML/JS,
    // Tailwind·셸 테마 밖의 별도 앱) 은 검사하지 않는다.
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { shadcn },
    settings: {
      shadcn: {
        // `@/components/ui` (호환 브리지 src/components/ui.tsx) 와 `@/components/ui/*` 모두 공통 컴포넌트.
        ui: "@/components/ui",
        note: "See docs/design-lint.md for design tokens and approved exceptions.",
      },
    },
    rules: {
      // scanAllStrings: cva/tone 맵 같은 문자열 상수 안의 팔레트 색까지 검사.
      "shadcn/no-raw-colors": ["error", { scanAllStrings: true }],
      "shadcn/no-arbitrary-values": ["error", { allow: NON_COLOR_CATEGORIES }],
      "shadcn/no-inline-styles": ["error", { deny: INLINE_COLOR_PROPERTIES }],
      // allowlist: 레이아웃(margin, width/height 외 배치, flex/grid 배치, display, position, order, self-*, col-span 등)만 허용.
      "shadcn/no-restyle": ["error", { allow: ["layout"] }],
    },
  },
  {
    // 공통 컴포넌트 내부 구현 + 호환 브리지는 스스로를 스타일링하는 곳이므로 restyle/임의값 검사 제외.
    // 팔레트 색(no-raw-colors)은 여기서도 계속 검사한다.
    name: "design-lint/ui-internals",
    files: ["src/components/ui/**", "src/components/ui.tsx"],
    rules: {
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off",
    },
  },
]);

export default designLintConfig;
