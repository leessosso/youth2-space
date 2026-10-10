import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import designLint from "./eslint.design.config.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 디자인 린트(@shadcn/lint). 단독 실행: npm run lint:design (prebuild 에서 자동 실행)
  ...designLint,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
