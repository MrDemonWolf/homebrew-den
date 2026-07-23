import { describe, it, expect, beforeAll } from "vitest";
import { runBuild, loadHTML, expectFileExists, listFormulae, listCasks } from "./helpers.js";

beforeAll(() => {
  runBuild();
});

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
    const desc = $('meta[name="description"]').attr("content");
    expect(desc).toBeTruthy();
  });

  it("references output.css", () => {
    const links = $('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get();
    expect(links).toContain("output.css");
  });

  it("references favicon.svg", () => {
    expect($('link[rel="icon"]').attr("href")).toBe("favicon.svg");
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

  it("embeds the search index", () => {
    const scripts = $("script").map((_, el) => $(el).html()).get().join("");
    expect(scripts).toContain("const data =");
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

  it("references relative CSS and favicon paths", () => {
    const links = $('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get();
    expect(links).toContain("../../output.css");
    expect($('link[rel="icon"]').attr("href")).toBe("../../favicon.svg");
  });

  it("breadcrumb shows the name and links to the formulae section", () => {
    expect($("#breadcrumb-name").text()).toBe(f.name);
    expect($('a[href="../../#formulae-section"]').length).toBeGreaterThanOrEqual(1);
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

  it("embeds only the search index (no per-item const)", () => {
    const scripts = $("script").map((_, el) => $(el).html()).get().join("");
    expect(scripts).toContain("const data =");
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

  it("references relative CSS path", () => {
    const links = $('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get();
    expect(links).toContain("../../output.css");
  });

  it("breadcrumb shows the name and links to the casks section", () => {
    expect($("#breadcrumb-name").text()).toBe(c.name);
    expect($('a[href="../../#casks-section"]').length).toBeGreaterThanOrEqual(1);
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
  it("output.css / favicon.svg / shared.js exist", () => {
    expectFileExists("output.css");
    expectFileExists("favicon.svg");
    expectFileExists("shared.js");
  });
});
