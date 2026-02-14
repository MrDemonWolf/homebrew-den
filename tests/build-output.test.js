import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { runBuild, SITE_DIR, readSiteFile } from "./helpers.js";

let buildOutput = "";

beforeAll(() => {
  buildOutput = runBuild();
});

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
  it("generates index.html", () => {
    expect(existsSync(path.join(SITE_DIR, "index.html"))).toBe(true);
  });

  it("generates output.css", () => {
    expect(existsSync(path.join(SITE_DIR, "output.css"))).toBe(true);
  });

  it("copies favicon.svg", () => {
    expect(existsSync(path.join(SITE_DIR, "favicon.svg"))).toBe(true);
  });

  it("generates iconwolf formula page", () => {
    expect(
      existsSync(path.join(SITE_DIR, "formulae/iconwolf/index.html")),
    ).toBe(true);
  });
});

describe("Template substitution", () => {
  it("no leftover {{PACKAGES_JSON}} in index.html", () => {
    const html = readSiteFile("index.html");
    expect(html).not.toContain("{{PACKAGES_JSON}}");
  });

  it("no leftover {{FORMULA_JSON}} in formula page", () => {
    const html = readSiteFile("formulae/iconwolf/index.html");
    expect(html).not.toContain("{{FORMULA_JSON}}");
  });

  it("no leftover {{FORMULA_NAME}} in formula page", () => {
    const html = readSiteFile("formulae/iconwolf/index.html");
    expect(html).not.toContain("{{FORMULA_NAME}}");
  });

  it("no leftover {{PACKAGES_JSON}} in formula page", () => {
    const html = readSiteFile("formulae/iconwolf/index.html");
    expect(html).not.toContain("{{PACKAGES_JSON}}");
  });
});

describe("JSON validity", () => {
  it("injected packages JSON in index.html is parseable", () => {
    const html = readSiteFile("index.html");
    const match = html.match(/const data = ({.*?});/s);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match[1]);
    expect(parsed).toBeDefined();
  });

  it("packages data has formulae and casks arrays", () => {
    const html = readSiteFile("index.html");
    const match = html.match(/const data = ({.*?});/s);
    const parsed = JSON.parse(match[1]);
    expect(Array.isArray(parsed.formulae)).toBe(true);
    expect(Array.isArray(parsed.casks)).toBe(true);
  });

  it("injected formula JSON in formula page is parseable", () => {
    const html = readSiteFile("formulae/iconwolf/index.html");
    const match = html.match(/const formula = ({.*?});/s);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match[1]);
    expect(parsed).toBeDefined();
  });
});

describe("Iconwolf metadata", () => {
  let formula;

  beforeAll(() => {
    const html = readSiteFile("formulae/iconwolf/index.html");
    const match = html.match(/const formula = ({.*?});/s);
    formula = JSON.parse(match[1]);
  });

  it("has correct name", () => {
    expect(formula.name).toBe("iconwolf");
  });

  it("has correct version", () => {
    expect(formula.version).toBe("0.0.6");
  });

  it("has correct description", () => {
    expect(formula.desc).toBe(
      "Cross-platform app icon generator for Expo/React Native projects",
    );
  });

  it("has correct homepage", () => {
    expect(formula.homepage).toBe("https://github.com/MrDemonWolf/iconwolf");
  });

  it("has correct license", () => {
    expect(formula.license).toBe("MIT");
  });

  it("has alpha stability (0.x.x)", () => {
    expect(formula.stability).toBe("alpha");
  });

  it("has caveats content", () => {
    expect(formula.caveats).toBeTruthy();
    expect(formula.caveats).toContain("iconwolf --help");
  });

  it("formula page JSON has versions array (when API available)", () => {
    // versions may be empty if API was rate-limited
    expect(Array.isArray(formula.versions)).toBe(true);
    if (formula.versions.length > 0) {
      const v = formula.versions[0];
      expect(v).toHaveProperty("version");
      expect(v).toHaveProperty("tag");
      expect(v).toHaveProperty("date");
      expect(v).toHaveProperty("url");
    }
  });
});

describe("CSS output", () => {
  it("is non-empty", () => {
    const css = readSiteFile("output.css");
    expect(css.length).toBeGreaterThan(0);
  });

  it("contains CSS custom properties", () => {
    const css = readSiteFile("output.css");
    expect(css).toMatch(/--/);
  });
});
