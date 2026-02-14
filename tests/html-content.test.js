import { describe, it, expect, beforeAll } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { runBuild, loadHTML, SITE_DIR } from "./helpers.js";

beforeAll(() => {
  runBuild();
});

describe("Index page", () => {
  let $;

  beforeAll(() => {
    $ = loadHTML("index.html");
  });

  it("title contains 'Homebrew Den'", () => {
    expect($("title").text()).toContain("Homebrew Den");
  });

  it("has meta description", () => {
    const desc = $('meta[name="description"]').attr("content");
    expect(desc).toBeTruthy();
    expect(desc.length).toBeGreaterThan(0);
  });

  it("references output.css", () => {
    const links = $('link[rel="stylesheet"]')
      .map((_, el) => $(el).attr("href"))
      .get();
    expect(links).toContain("output.css");
  });

  it("references favicon.svg", () => {
    const icon = $('link[rel="icon"]').attr("href");
    expect(icon).toBe("favicon.svg");
  });

  it("has nav element", () => {
    expect($("nav").length).toBeGreaterThanOrEqual(1);
  });

  it("has formulae section", () => {
    expect($("#formulae-section").length).toBe(1);
  });

  it("has casks section", () => {
    expect($("#casks-section").length).toBe(1);
  });

  it("has search overlay", () => {
    expect($("#search-overlay").length).toBe(1);
  });

  it("has theme toggle", () => {
    expect($("#theme-toggle").length).toBe(1);
  });

  it("hero section has tap command 'brew tap mrdemonwolf/den'", () => {
    const tapCmd = $("#tap-command").text();
    expect(tapCmd).toBe("brew tap mrdemonwolf/den");
  });

  it("footer has MIT license", () => {
    const footer = $("footer").text();
    expect(footer).toContain("MIT");
  });

  it("footer has copyright", () => {
    const footer = $("footer").text();
    expect(footer).toContain("2026");
    expect(footer).toContain("MrDemonWolf");
  });

  it("script tag contains injected data", () => {
    const scripts = $("script")
      .map((_, el) => $(el).html())
      .get()
      .join("");
    expect(scripts).toContain("const data =");
  });
});

describe("Formula page (iconwolf)", () => {
  let $;

  beforeAll(() => {
    $ = loadHTML("formulae/iconwolf/index.html");
  });

  it("title contains 'iconwolf' and 'Homebrew Den'", () => {
    const title = $("title").text();
    expect(title).toContain("iconwolf");
    expect(title).toContain("Homebrew Den");
  });

  it("references correct relative CSS path", () => {
    const links = $('link[rel="stylesheet"]')
      .map((_, el) => $(el).attr("href"))
      .get();
    expect(links).toContain("../../output.css");
  });

  it("references correct relative favicon path", () => {
    const icon = $('link[rel="icon"]').attr("href");
    expect(icon).toBe("../../favicon.svg");
  });

  it("has breadcrumb with formula name", () => {
    const breadcrumb = $("#breadcrumb-name").text();
    expect(breadcrumb).toBe("iconwolf");
  });

  it("has install section", () => {
    expect($("#install-section").length).toBe(1);
  });

  it("has details section", () => {
    expect($("#details-section").length).toBe(1);
  });

  it("has caveats section", () => {
    expect($("#caveats-section").length).toBe(1);
  });

  it("has versions section", () => {
    expect($("#versions-section").length).toBe(1);
  });

  it("has desktop sidebar", () => {
    expect($("aside nav").length).toBeGreaterThanOrEqual(1);
  });

  it("has mobile sidebar strip", () => {
    expect($("#sidebar-mobile").length).toBe(1);
  });

  it("script has both formula and data variables", () => {
    const scripts = $("script")
      .map((_, el) => $(el).html())
      .get()
      .join("");
    expect(scripts).toContain("const formula =");
    expect(scripts).toContain("const data =");
  });

  it("breadcrumb links to formulae section", () => {
    const href = $('a[href="../../#formulae-section"]');
    expect(href.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Cross-page: static assets exist on disk", () => {
  it("output.css exists in _site/", () => {
    expect(existsSync(path.join(SITE_DIR, "output.css"))).toBe(true);
  });

  it("favicon.svg exists in _site/", () => {
    expect(existsSync(path.join(SITE_DIR, "favicon.svg"))).toBe(true);
  });
});
