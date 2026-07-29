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

// Drop C0 controls and DEL. The WHATWG URL parser removes ASCII tab/LF/CR while
// resolving a scheme, so "java<TAB>script:alert(1)" must not be allowed to slip
// past the scheme test in safeUrl and still execute when the browser follows it.
// Filtered by code point so this source file stays pure ASCII.
function stripControls(s) {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c > 0x1f && c !== 0x7f) out += ch;
  }
  return out;
}

// URL scheme allowlist. Relative/anchor URLs pass; protocol-relative (//) and any
// scheme other than http(s)/mailto collapse to "#".
export function safeUrl(value) {
  const url = stripControls(String(value == null ? "" : value)).trim();
  if (/^\/\//.test(url)) return "#";
  if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) {
    return /^(https?:|mailto:)/i.test(url) ? url : "#";
  }
  return url;
}
