import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(new URL(import.meta.url)));

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/components/ui/DepositDrawer.tsx",
        "src/components/ui/deposit/**/*.ts",
        "src/components/ui/deposit/**/*.tsx",
      ],
      exclude: [
        "**/*.d.ts",
        "**/types/**",
        "**/constants.ts",
        "src/app/layout.tsx",
        "src/app/globals.css",
        "next-env.d.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
