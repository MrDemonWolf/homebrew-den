// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Static tap catalog deployed to GitHub Pages project site
// (https://mrdemonwolf.github.io/homebrew-den/). `outDir: _site` keeps the CI
// Pages-artifact contract the workflow already uploads.
export default defineConfig({
  site: "https://mrdemonwolf.github.io",
  base: "/homebrew-den",
  // Tests build once into an isolated temp dir (SITE_OUT_DIR); prod uses _site.
  outDir: process.env.SITE_OUT_DIR || "./_site",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
