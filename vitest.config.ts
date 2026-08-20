import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The components are driven by real DOM drag events, so they need a DOM.
    // Note jsdom implements the events but NOT DataTransfer -- see
    // test/data-transfer.ts for the stand-in.
    environment: "jsdom",
    globals: true,
    setupFiles: ["test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
  },
});
