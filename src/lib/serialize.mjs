// Script-safe JSON for embedding catalog data inside a <script> tag: neutralizes
// </script> breakout and the U+2028/2029 separators that terminate JS strings.
// Astro auto-escapes {expr} in markup, so serializeJson + safeUrl are the
// remaining XSS-critical helpers. Built with split/join over code points so the
// source stays pure ASCII (a raw U+2028 in a regex literal is a line terminator).
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

export function serializeJson(obj) {
  return JSON.stringify(obj)
    .split("<").join("\\u003c")
    .split(">").join("\\u003e")
    .split(LINE_SEP).join("\\u2028")
    .split(PARA_SEP).join("\\u2029");
}

// URL scheme allowlist. Relative/anchor URLs pass; protocol-relative (//) and any
// scheme other than http(s)/mailto collapse to "#".
export function safeUrl(value) {
  const url = String(value == null ? "" : value).trim();
  if (/^\/\//.test(url)) return "#";
  if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) {
    return /^(https?:|mailto:)/i.test(url) ? url : "#";
  }
  return url;
}
