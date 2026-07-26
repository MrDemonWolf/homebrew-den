import { describe, it, expect } from "vitest";
import {
  readSiteFile,
  extractPackageData,
  expectFileExists,
  bundledAssets,
  listFormulae,
  listCasks,
  BASE,
} from "./helpers.js";

const formulae = listFormulae();
const casks = listCasks();

describe("File structure", () => {
  it("generates index.html", () => expectFileExists("index.html"));
  it("emits bundled CSS under _astro/", () => expect(bundledAssets(".css").length).toBeGreaterThan(0));
  it("emits bundled JS under _astro/", () => expect(bundledAssets(".js").length).toBeGreaterThan(0));
  it("copies favicon.svg", () => expectFileExists("favicon.svg"));

  it.each(formulae)("generates $name formula page", ({ name }) => {
    expectFileExists("formulae", name, "index.html");
  });

  it.each(casks)("generates $name cask page", ({ name }) => {
    expectFileExists("casks", name, "index.html");
  });
});

describe("Layout rendering", () => {
  it("index renders nav, search modal and footer", () => {
    const html = readSiteFile("index.html");
    expect(html).toContain('id="search-overlay"');
    expect(html).toContain("<nav");
    expect(html).toContain("<footer");
  });
});

describe("Embedded search index", () => {
  it("index.html embeds parseable package data", () => {
    const parsed = extractPackageData(readSiteFile("index.html"));
    expect(Array.isArray(parsed.formulae)).toBe(true);
    expect(Array.isArray(parsed.casks)).toBe(true);
    expect(parsed.formulae.length).toBe(formulae.length);
    expect(parsed.casks.length).toBe(casks.length);
  });

  it.each([...formulae.map((f) => ["formulae", f]), ...casks.map((c) => ["casks", c])])(
    "%s detail page embeds parseable package data",
    (dir, pkg) => {
      const parsed = extractPackageData(readSiteFile(`${dir}/${pkg.name}/index.html`));
      expect(parsed).toBeDefined();
    },
  );
});

describe("Formula metadata (server-rendered, derived from Formula/*.rb)", () => {
  it.each(formulae)("$name page renders its .rb metadata", (f) => {
    const html = readSiteFile(`formulae/${f.name}/index.html`);
    expect(html).toContain(`>${f.name}</h1>`);
    expect(html).toContain(f.desc);
    expect(html).toContain(`brew install ${f.name}`);
    expect(html).toContain(f.homepage);
    expect(html).toContain(`>${f.license}</dd>`);
  });
});

describe("Cask metadata (server-rendered, derived from Casks/*.rb)", () => {
  it.each(casks)("$name page renders its .rb metadata", (c) => {
    const html = readSiteFile(`casks/${c.name}/index.html`);
    expect(html).toContain(`>${c.name}</h1>`);
    expect(html).toContain(c.desc);
    expect(html).toContain(`brew install --cask ${c.name}`);
    expect(html).toContain(c.appName);
  });
});

describe("Server-rendered package tables (work without JS)", () => {
  it.each(formulae)("index lists formula $name", ({ name }) => {
    const html = readSiteFile("index.html");
    expect(html).toContain(`href="${BASE}/formulae/${name}/"`);
    expect(html).toContain(`brew install ${name}`);
  });

  it.each(casks)("index lists cask $name", ({ name }) => {
    const html = readSiteFile("index.html");
    expect(html).toContain(`href="${BASE}/casks/${name}/"`);
    expect(html).toContain(`brew install --cask ${name}`);
  });
});

describe("CSS output", () => {
  it("is non-empty and contains CSS custom properties", () => {
    const css = readSiteFile(`_astro/${bundledAssets(".css")[0]}`);
    expect(css.length).toBeGreaterThan(0);
    expect(css).toMatch(/--/);
  });
});
