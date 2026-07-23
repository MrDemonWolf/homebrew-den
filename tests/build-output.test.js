import { describe, it, expect, beforeAll } from "vitest";
import {
  runBuild,
  readSiteFile,
  extractJSON,
  expectFileExists,
  expectNoPlaceholder,
  expectNoUnresolvedPlaceholders,
  listBuiltHtml,
  listFormulae,
  listCasks,
} from "./helpers.js";

let buildOutput = "";

beforeAll(() => {
  buildOutput = runBuild();
});

const formulae = listFormulae();
const casks = listCasks();

describe("Build execution", () => {
  it("completes without errors", () => {
    expect(buildOutput).toContain("Site built successfully");
  });

  it("reports formula count", () => {
    expect(buildOutput).toMatch(/Formulae:\s*\d+/);
  });

  it("reports cask count", () => {
    expect(buildOutput).toMatch(/Casks:\s*\d+/);
  });
});

describe("File structure", () => {
  it("generates index.html", () => expectFileExists("index.html"));
  it("generates output.css", () => expectFileExists("output.css"));
  it("copies favicon.svg", () => expectFileExists("favicon.svg"));
  it("copies shared.js", () => expectFileExists("shared.js"));

  it.each(formulae)("generates $name formula page", ({ name }) => {
    expectFileExists("formulae", name, "index.html");
  });

  it.each(casks)("generates $name cask page", ({ name }) => {
    expectFileExists("casks", name, "index.html");
  });
});

describe("Template substitution", () => {
  it("no unresolved {{...}} placeholders in ANY generated page", () => {
    for (const rel of listBuiltHtml()) {
      expectNoUnresolvedPlaceholders(readSiteFile(rel));
    }
  });

  it("splices shared partials in index.html", () => {
    const html = readSiteFile("index.html");
    ["NAV", "SEARCH_MODAL", "FOOTER", "ROOT", "PACKAGES_JSON", "FORMULAE_ROWS", "CASKS_ROWS"].forEach(
      (p) => expectNoPlaceholder(html, p),
    );
  });
});

describe("JSON validity", () => {
  it("injected search index in index.html is parseable", () => {
    const parsed = extractJSON(readSiteFile("index.html"), "data");
    expect(Array.isArray(parsed.formulae)).toBe(true);
    expect(Array.isArray(parsed.casks)).toBe(true);
  });

  it.each([...formulae.map((f) => ["formulae", f]), ...casks.map((c) => ["casks", c])])(
    "%s detail page embeds a parseable search index",
    (dir, pkg) => {
      const parsed = extractJSON(readSiteFile(`${dir}/${pkg.name}/index.html`), "data");
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
    expect(html).toContain(`href="formulae/${name}/"`);
    expect(html).toContain(`brew install ${name}`);
  });

  it.each(casks)("index lists cask $name", ({ name }) => {
    const html = readSiteFile("index.html");
    expect(html).toContain(`href="casks/${name}/"`);
    expect(html).toContain(`brew install --cask ${name}`);
  });
});

describe("CSS output", () => {
  it("is non-empty", () => {
    expect(readSiteFile("output.css").length).toBeGreaterThan(0);
  });

  it("contains CSS custom properties", () => {
    expect(readSiteFile("output.css")).toMatch(/--/);
  });
});
