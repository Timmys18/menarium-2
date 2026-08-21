import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    ".next-build-verify/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /*
      Отчёты Playwright. Внутри лежит его собственный просмотрщик трасс —
      минифицированный чужой бандл, который eslint честно разбирает и выдаёт
      на нём три тысячи замечаний. Достаточно один раз прогнать e2e, и вывод
      линтера перестаёт быть читаемым: 184 «ошибки», ни одна из которых не в
      нашем коде.
    */
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
