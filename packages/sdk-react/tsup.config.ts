import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ["react", "react/jsx-runtime", "@taurusswap/sdk"],
  outDir: "dist",
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
