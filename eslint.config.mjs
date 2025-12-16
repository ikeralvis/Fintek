import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Allow explicit `any` during incremental migration: warn instead of error.
  {
    rules: {
      // Temporarily allow `any` (project is migrating to stricter types incrementally).
      '@typescript-eslint/no-explicit-any': 'off',
      // Warn on unused vars instead of erroring in CI.
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific ignores
    "coverage/**",
    "lcov-report/**",
    "node_modules/**",
    "public/**",
  ]),
]);

export default eslintConfig;
