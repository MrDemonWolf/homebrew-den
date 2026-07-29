import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { safeUrl } from "../src/lib/serialize.mjs";
import { ROOT } from "./helpers.js";

// Build control characters by code point so this source stays pure ASCII.
const C = (n) => String.fromCharCode(n);

const BLOCKED = [
  ["plain javascript:", "javascript:alert(1)"],
  ["mixed-case javascript:", "JaVaScRiPt:alert(1)"],
  ["leading whitespace", "   javascript:alert(1)"],
  ["data:", "data:text/html,<script>alert(1)</script>"],
  ["vbscript:", "vbscript:msgbox(1)"],
  ["file:", "file:///etc/passwd"],
  ["protocol-relative", "//evil.example"],
  // Browsers strip ASCII tab/LF/CR before resolving a scheme, so these all
  // execute as javascript: unless the sanitizer strips them first.
  ["TAB inside scheme", "java" + C(9) + "script:alert(1)"],
  ["LF inside scheme", "java" + C(10) + "script:alert(1)"],
  ["CR inside scheme", "java" + C(13) + "script:alert(1)"],
  ["NUL inside scheme", "java" + C(0) + "script:alert(1)"],
  ["DEL inside scheme", "java" + C(127) + "script:alert(1)"],
];

const ALLOWED = [
  ["https", "https://github.com/MrDemonWolf/iconwolf"],
  ["http", "http://example.com/x"],
  ["mailto", "mailto:someone@example.com"],
  ["site-absolute path", "/homebrew-den/formulae/iconwolf/"],
  ["relative path", "formulae/iconwolf/"],
  ["anchor", "#versions-section"],
];

describe("safeUrl blocks dangerous schemes", () => {
  it.each(BLOCKED)("blocks %s", (_label, input) => {
    expect(safeUrl(input)).toBe("#");
  });

  it("handles null/undefined without throwing", () => {
    expect(safeUrl(null)).toBe("");
    expect(safeUrl(undefined)).toBe("");
  });
});

describe("safeUrl preserves legitimate URLs", () => {
  it.each(ALLOWED)("allows %s", (_label, input) => {
    expect(safeUrl(input)).toBe(input);
  });
});

describe("client and build-time safeUrl stay in sync", () => {
  // The allowlist is intentionally duplicated (build-time ESM + bundled client
  // script). Guard the property that actually matters in both: a control char
  // hidden inside a scheme must never survive sanitization.
  const clientSrc = readFileSync(path.join(ROOT, "src", "scripts", "site.js"), "utf-8");
  const match = clientSrc.match(/function safeUrl\s*\([\s\S]*?\n\}/);
  const clientSafeUrl = new Function(`${match[0]}\nreturn safeUrl;`)();

  it.each(BLOCKED)("client copy blocks %s", (_label, input) => {
    expect(clientSafeUrl(input)).toBe("#");
  });

  it.each(ALLOWED)("client copy allows %s", (_label, input) => {
    expect(clientSafeUrl(input)).toBe(input);
  });
});
