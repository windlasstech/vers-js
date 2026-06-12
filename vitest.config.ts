import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/types.ts", "tests/**", "**/*.{test,spec}.ts", "dist/**"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    environment: "node",
    exclude: [...configDefaults.exclude, "dist/**", "coverage/**"],
    include: ["tests/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
    outputFile: "./test-report.junit.xml",
    reporters:
      process.env.GITHUB_ACTIONS === "true" ? ["default", "junit", "github-actions"] : ["default"],
  },
});
