import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, listFormulae, listCasks } from "./helpers.js";

// The README package tables are hand-maintained but must not drift from the
// .rb files (the single source of truth). These tests fail if a package is
// missing from its table or its version/description is stale.
const readme = readFileSync(path.join(ROOT, "README.md"), "utf-8");

function tableRowFor(token) {
  return readme
    .split("\n")
    .find((line) => line.includes(`\`${token}\``) && line.trim().startsWith("|"));
}

describe("README formula table matches Formula/*.rb", () => {
  it.each(listFormulae())("lists $name with its version and description", (f) => {
    const row = tableRowFor(f.name);
    expect(row, `no README row for formula ${f.name}`).toBeTruthy();
    expect(row).toContain(f.version);
    expect(row).toContain(f.desc);
  });
});

describe("README cask table matches Casks/*.rb", () => {
  it.each(listCasks())("lists $name with its description", (c) => {
    const row = tableRowFor(c.name);
    expect(row, `no README row for cask ${c.name}`).toBeTruthy();
    expect(row).toContain(c.desc);
  });
});
