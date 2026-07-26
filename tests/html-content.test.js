import { describe, it, expect, beforeAll } from "vitest";
import { loadHTML, expectFileExists, bundledAssets, listFormulae, listCasks, BASE } from "./helpers.js";

const formulae = listFormulae();
const casks = listCasks();

describe("Index page", () => {
  let $;
  beforeAll(() => {
    $ = loadHTML("index.html");
  });

  it("title contains 'Homebrew Den'", () => {
    expect($("title").text()).toContain("Homebrew Den");
  });

  it("has meta description", () => {
    expect($('meta[name="description"]').attr("content")).toBeTruthy();
  });

  it("references a bundled stylesheet", () => {
    const links = $('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get();
    expect(links.some((h) => /\/_astro\/.*\.css$/.test(h))).toBe(true);
  });

  it("references favicon.svg", () => {
    expect($('link[rel="icon"]').attr("href")).toBe(`${BASE}/favicon.svg`);
  });

  it("has nav element", () => {
    expect($("nav").length).toBeGreaterThanOrEqual(1);
  });

  it("has formulae and casks sections", () => {
    expect($("#formulae-section").length).toBe(1);
    expect($("#casks-section").length).toBe(1);
  });

  it("has search overlay and theme toggle", () => {
    expect($("#search-overlay").length).toBe(1);
    expect($("#theme-toggle").length).toBe(1);
  });

  it("hero section has tap command", () => {
    expect($("#tap-command").text()).toBe("brew tap mrdemonwolf/den");
  });

  it("footer has MIT license and copyright", () => {
    const footer = $("footer").text();
    expect(footer).toContain("MIT");
    expect(footer).toContain("2026");
    expect(footer).toContain("MrDemonWolf");
  });

  it("embeds the search index as JSON", () => {
    expect($("#package-data").attr("type")).toBe("application/json");
    expect($("#package-data").length).toBe(1);
  });
});

describe("Search dialog accessibility", () => {
  let $;
  beforeAll(() => {
    $ = loadHTML("index.html");
  });

  it("input has combobox semantics", () => {
    const input = $("#search-input");
    expect(input.attr("role")).toBe("combobox");
    expect(input.attr("aria-expanded")).toBe("false");
    expect(input.attr("aria-controls")).toBe("search-results");
  });

  it("results container is a listbox", () => {
    expect($("#search-results").attr("role")).toBe("listbox");
  });

  it("has a labelled close button", () => {
    const btn = $("#search-close");
    expect(btn.length).toBe(1);
    expect(btn.attr("aria-label")).toBeTruthy();
  });

  it("has a live-region status announcer", () => {
    const status = $("#search-status");
    expect(status.length).toBe(1);
    expect(status.attr("aria-live")).toBe("polite");
  });
});

describe.each(formulae)("Formula page ($name)", (f) => {
  let $;
  beforeAll(() => {
    $ = loadHTML(`formulae/${f.name}/index.html`);
  });

  it("title contains the name and 'Homebrew Den'", () => {
    const title = $("title").text();
    expect(title).toContain(f.name);
    expect(title).toContain("Homebrew Den");
  });

  it("references bundled CSS and the base-prefixed favicon", () => {
    const links = $('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get();
    expect(links.some((h) => /\/_astro\/.*\.css$/.test(h))).toBe(true);
    expect($('link[rel="icon"]').attr("href")).toBe(`${BASE}/favicon.svg`);
  });

  it("breadcrumb shows the name and links to the formulae section", () => {
    expect($("#breadcrumb-name").text()).toBe(f.name);
    expect($(`a[href="${BASE}/#formulae-section"]`).length).toBeGreaterThanOrEqual(1);
  });

  it("server-renders essential content (works without JS)", () => {
    expect($("#detail-name").text()).toBe(f.name);
    expect($("#install-command").text()).toBe(`brew install ${f.name}`);
    expect($("#detail-desc").text()).toContain(f.desc);
  });

  it("has install, details, caveats, versions sections", () => {
    ["#install-section", "#details-section", "#caveats-section", "#versions-section"].forEach(
      (id) => expect($(id).length).toBe(1),
    );
  });

  it("has desktop sidebar and mobile strip", () => {
    expect($("aside nav").length).toBeGreaterThanOrEqual(1);
    expect($("#sidebar-mobile").length).toBe(1);
  });

  it("embeds the search index as JSON", () => {
    expect($("#package-data").length).toBe(1);
  });
});

describe.each(casks)("Cask page ($name)", (c) => {
  let $;
  beforeAll(() => {
    $ = loadHTML(`casks/${c.name}/index.html`);
  });

  it("title contains the name and 'Homebrew Den'", () => {
    const title = $("title").text();
    expect(title).toContain(c.name);
    expect(title).toContain("Homebrew Den");
  });

  it("references bundled CSS", () => {
    const links = $('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get();
    expect(links.some((h) => /\/_astro\/.*\.css$/.test(h))).toBe(true);
  });

  it("breadcrumb shows the name and links to the casks section", () => {
    expect($("#breadcrumb-name").text()).toBe(c.name);
    expect($(`a[href="${BASE}/#casks-section"]`).length).toBeGreaterThanOrEqual(1);
  });

  it("server-renders essential content (works without JS)", () => {
    expect($("#detail-name").text()).toBe(c.name);
    expect($("#install-command").text()).toBe(`brew install --cask ${c.name}`);
  });

  it("has install and details sections", () => {
    expect($("#install-section").length).toBe(1);
    expect($("#details-section").length).toBe(1);
  });
});

describe("Cross-page: static assets exist on disk", () => {
  it("bundled CSS + JS and favicon exist", () => {
    expect(bundledAssets(".css").length).toBeGreaterThan(0);
    expect(bundledAssets(".js").length).toBeGreaterThan(0);
    expectFileExists("favicon.svg");
  });
});
