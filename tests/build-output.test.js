import { describe, it, expect, beforeAll } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  runBuild,
  SITE_DIR,
  readSiteFile,
  extractJSON,
  expectFileExists,
  expectNoPlaceholder,
} from "./helpers.js";

let buildOutput = "";

beforeAll(() => {
  buildOutput = runBuild();
});

describe("Build execution", () => {
  // When _site/ is pre-built (e.g. CI), runBuild() skips and returns "".
  // These tests only assert on build output when the build actually ran.
  it("completes without errors", () => {
    if (buildOutput) {
      expect(buildOutput).toContain("Site built successfully");
    } else {
      expect(existsSync(path.join(SITE_DIR, "index.html"))).toBe(true);
    }
  });

  it("reports formula count", () => {
    if (buildOutput) {
      expect(buildOutput).toMatch(/Formulae:\s*\d+/);
    }
  });

  it("reports cask count", () => {
    if (buildOutput) {
      expect(buildOutput).toMatch(/Casks:\s*\d+/);
    }
  });
});

describe("File structure", () => {
  it("generates index.html", () => {
    expectFileExists("index.html");
  });

  it("generates output.css", () => {
    expectFileExists("output.css");
  });

  it("copies favicon.svg", () => {
    expectFileExists("favicon.svg");
  });

  it("copies shared.js", () => {
    expectFileExists("shared.js");
  });

  it("generates iconwolf formula page", () => {
    expectFileExists("formulae", "iconwolf", "index.html");
  });
});

describe("Template substitution", () => {
  it("no leftover {{PACKAGES_JSON}} in index.html", () => {
    expectNoPlaceholder(readSiteFile("index.html"), "PACKAGES_JSON");
  });

  it("no leftover {{FORMULA_JSON}} in formula page", () => {
    expectNoPlaceholder(readSiteFile("formulae/iconwolf/index.html"), "FORMULA_JSON");
  });

  it("no leftover {{FORMULA_NAME}} in formula page", () => {
    expectNoPlaceholder(readSiteFile("formulae/iconwolf/index.html"), "FORMULA_NAME");
  });

  it("no leftover {{PACKAGES_JSON}} in formula page", () => {
    expectNoPlaceholder(readSiteFile("formulae/iconwolf/index.html"), "PACKAGES_JSON");
  });
});

describe("JSON validity", () => {
  it("injected packages JSON in index.html is parseable", () => {
    const parsed = extractJSON(readSiteFile("index.html"), "data");
    expect(parsed).toBeDefined();
  });

  it("packages data has formulae and casks arrays", () => {
    const parsed = extractJSON(readSiteFile("index.html"), "data");
    expect(Array.isArray(parsed.formulae)).toBe(true);
    expect(Array.isArray(parsed.casks)).toBe(true);
  });

  it("injected formula JSON in formula page is parseable", () => {
    const parsed = extractJSON(readSiteFile("formulae/iconwolf/index.html"), "formula");
    expect(parsed).toBeDefined();
  });
});

describe("Iconwolf metadata", () => {
  let formula;

  beforeAll(() => {
    formula = extractJSON(readSiteFile("formulae/iconwolf/index.html"), "formula");
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
