import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildFixtureTap } from "./helpers.js";

// A formula whose metadata is packed with hostile values: a <script> breakout,
// ampersands/quotes, a dangerous URL scheme, and a U+2028 line separator.
const BREAKOUT = "</script><script>alert(1)</script>";
const SEP = "\u2028";
const hostileFormula = `class Eviltool < Formula
  desc "Break ${BREAKOUT} & 'quote' out"
  homepage "javascript:alert(document.domain)"
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

  it("blocks a javascript: homepage URL (collapses to #)", () => {
    const hrefMatch = html.match(/id="detail-homepage" href="([^"]*)"/);
    expect(hrefMatch).not.toBeNull();
    expect(hrefMatch[1]).not.toMatch(/^javascript:/i);
    expect(hrefMatch[1]).toBe("#");
  });
});
