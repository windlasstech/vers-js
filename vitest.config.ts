import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["tests/**", "**/*.{test,spec}.ts", "dist/**"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "html", "lcov"],
    },
    environment: "node",
    exclude: [...configDefaults.exclude, "dist/**", "coverage/**"],
    include: ["tests/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
  },
});
