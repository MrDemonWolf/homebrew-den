import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import { buildFixtureTap } from "./helpers.js";

// A formula whose metadata is packed with hostile values: a <script> breakout,
// ampersands/quotes, a dangerous URL scheme, and a U+2028 line separator.
const BREAKOUT = "</script><script>alert(1)</script>";
const SEP = "\u2028";
// Tab-obfuscated scheme: browsers strip ASCII tab/LF/CR before resolving the
// scheme, so this must be blocked exactly like a plain `javascript:` URL.
const OBFUSCATED_JS_URL = "java\tscript:alert(document.domain)";
const hostileFormula = `class Eviltool < Formula
  desc "Break ${BREAKOUT} & 'quote' out"
  homepage "${OBFUSCATED_JS_URL}"
  version "1.0.0"
  license "MIT ${BREAKOUT}"

  depends_on :macos

  on_macos do
    on_arm do
      url "https://github.com/x/eviltool/releases/download/v#{version}/e.tar.gz"
      sha256 "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    end
  end

  def caveats
    <<~EOS
      caveat ${BREAKOUT}${SEP}with separators & <angles>
    EOS
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/eviltool --version")
  end
end
`;

describe("Hostile metadata is safely escaped in generated HTML", () => {
  let html;

  beforeAll(() => {
    const out = buildFixtureTap({ formulae: { "eviltool.rb": hostileFormula } });
    html = readFileSync(path.join(out, "formulae", "eviltool", "index.html"), "utf-8");
  });

  it("does not let the payload break out of any script context", () => {
    // The literal executable breakout must never appear unescaped.
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("keeps the embedded search index parseable as JSON", () => {
    const match = html.match(/id="package-data"[^>]*>([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const data = JSON.parse(match[1]);
    expect(Array.isArray(data.formulae)).toBe(true);
    // The hostile desc survives as data (escaped), not as markup.
    expect(data.formulae[0].desc).toContain("alert(1)");
  });

  it("neutralizes the U+2028/U+2029 separators in embedded JSON", () => {
    const match = html.match(/id="package-data"[^>]*>([\s\S]*?)<\/script>/);
    expect(match[1]).not.toContain("\u2028");
    expect(match[1]).not.toContain("\u2029");
  });

  it("blocks a control-char-obfuscated javascript: homepage URL (collapses to #)", () => {
    const href = load(html)("#detail-homepage").attr("href");
    // The payload must not survive in the href. It may still appear as inert,
    // escaped link *text* — that is display, not a navigable target.
    expect(href).toBe("#");
    expect(href).not.toMatch(/script:/i);
  });
});
