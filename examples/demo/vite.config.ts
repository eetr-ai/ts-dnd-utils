import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The library is installed from `file:../..`, which npm links rather than
  // copies. Without deduping, React would resolve once from here and once from
  // the library's own devDependencies, and two copies of React break hooks.
  resolve: { dedupe: ["react", "react-dom"] },
  // Relative, so the built demo works from a project subpath on GitHub Pages
  // as readily as from a domain root.
  base: "./",
});
