// Client behavior for the tap site. Ported from the old site/shared.js; bundled
// by Astro. Progressive enhancement only — every page is server-rendered and
// works with JS disabled. The dead detectStability copy was dropped (stability
// is computed at build time in src/lib/stability.mjs).

// --- SVG icons ---
const copyIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const checkIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

// --- HTML escaping (defense-in-depth for any interpolated value) ---
// Also neutralizes the U+2028/U+2029 line separators that can terminate a JS
// string literal when interpolated content is later re-embedded in a script.
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\u2028/g, "&#8232;")
    .replace(/\u2029/g, "&#8233;");
}

// --- URL scheme allowlist (blocks javascript:/data: and other schemes) ---
// Relative/anchor URLs (no scheme) are allowed; protocol-relative and any
// scheme other than http(s)/mailto collapse to "#".
function safeUrl(value) {
  // Drop C0 controls/DEL first — the WHATWG URL parser strips ASCII tab/LF/CR
  // while resolving a scheme, so "java<TAB>script:..." would otherwise slip past
  // the scheme test below and still execute. Mirrors src/lib/serialize.mjs.
  var raw = String(value == null ? '' : value);
  var url = '';
  for (var i = 0; i < raw.length; i++) {
    var c = raw.charCodeAt(i);
    if (c > 0x1f && c !== 0x7f) url += raw.charAt(i);
  }
  url = url.trim();
  if (/^\/\//.test(url)) return '#';
  if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) {
    return /^(https?:|mailto:)/i.test(url) ? url : '#';
  }
  return url;
}

// --- Copy buttons ---
// Clipboard access can be undefined (insecure context) or reject (denied
// permission); fall back to a legacy execCommand copy and never throw.
function writeClipboard(text, onOk) {
  function legacyCopy() {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok && onOk) onOk();
    } catch (err) {
      /* clipboard unavailable — nothing more we can do */
    }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() { if (onOk) onOk(); }, legacyCopy);
  } else {
    legacyCopy();
  }
}

function copyText(elementId, btn) {
  var el = document.getElementById(elementId);
  if (!el) return;
  writeClipboard(el.textContent, function() { showCopied(btn); });
}

function showCopied(btn) {
  btn.classList.add('!bg-[#22c55e]');
  btn.querySelector('.icon-copy').style.display = 'none';
  btn.querySelector('.icon-check').style.display = 'block';
  setTimeout(function() {
    btn.classList.remove('!bg-[#22c55e]');
    btn.querySelector('.icon-copy').style.display = '';
    btn.querySelector('.icon-check').style.display = 'none';
  }, 2000);
}

function showCopiedSmall(btn) {
  btn.classList.add('!text-[#22c55e]');
  btn.innerHTML = checkIcon;
  setTimeout(function() {
    btn.classList.remove('!text-[#22c55e]');
    btn.innerHTML = copyIcon;
  }, 2000);
}

// Delegated handler for static "copy install command" buttons.
function initCopyButtons() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest && e.target.closest('.copy-sm');
    if (!btn) return;
    var text = btn.getAttribute('data-copy') || '';
    writeClipboard(text, function() { showCopiedSmall(btn); });
  });
}

// --- Theme toggle ---
// localStorage throws in private-mode / disabled-storage contexts; degrade to
// an in-memory preference instead of breaking theme init.
function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
}

function initTheme() {
  var themeToggle = document.getElementById('theme-toggle');
  var html = document.documentElement;

  function setTheme(theme) {
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    storageSet('theme', theme);
    var sun = themeToggle.querySelector('.icon-sun');
    var moon = themeToggle.querySelector('.icon-moon');
    if (theme === 'dark') {
      sun.style.display = 'block';
      moon.style.display = 'none';
    } else {
      sun.style.display = 'none';
      moon.style.display = 'block';
    }
  }

  var savedTheme = storageGet('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark');
  } else {
    // Default to light to match the mrdemonwolf.com brand.
    setTheme('light');
  }

  themeToggle.addEventListener('click', function() {
    var current = html.classList.contains('dark') ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// --- Cmd+K Search ---
function initSearch(data, opts) {
  var basePath = (opts && opts.basePath) || '';
  var searchOverlay = document.getElementById('search-overlay');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  var searchTrigger = document.getElementById('search-trigger');
  var activeIndex = -1;
  var lastFocused = null;

  var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  document.getElementById('search-kbd').textContent = isMac ? '⌘K' : 'Ctrl+K';

  function buildSearchIndex() {
    var items = [];
    (data.formulae || []).forEach(function(f) {
      items.push({ name: f.name, desc: f.desc, version: f.version, type: 'Formula', href: basePath + 'formulae/' + f.name + '/' });
    });
    (data.casks || []).forEach(function(c) {
      items.push({ name: c.name, desc: c.desc, version: c.version, type: 'Cask', href: basePath + 'casks/' + c.name + '/' });
    });
    return items;
  }

  var searchIndex = buildSearchIndex();
  var SEARCH_ACTIVE = ['bg-accent-subtle', 'border-l-[3px]', 'border-l-accent', '!pl-[13px]'];
  var searchPanel = document.getElementById('search-panel');
  var searchClose = document.getElementById('search-close');
  var searchStatus = document.getElementById('search-status');

  function announce(msg) { if (searchStatus) searchStatus.textContent = msg; }

  function syncActive() {
    var items = searchResults.querySelectorAll('.search-result');
    items.forEach(function(el, i) {
      var on = i === activeIndex;
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      el.classList[on ? 'add' : 'remove'].apply(el.classList, SEARCH_ACTIVE);
    });
    var current = activeIndex >= 0 && items[activeIndex] ? items[activeIndex].id : '';
    searchInput.setAttribute('aria-activedescendant', current);
  }

  function openSearch() {
    lastFocused = document.activeElement;
    searchOverlay.classList.remove('hidden');
    searchInput.setAttribute('aria-expanded', 'true');
    searchInput.value = '';
    activeIndex = -1;
    renderSearchResults('');
    document.body.style.overflow = 'hidden';
    searchInput.focus();
  }

  function closeSearch() {
    searchOverlay.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.setAttribute('aria-activedescendant', '');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function renderSearchResults(query) {
    if (!query.trim()) {
      searchResults.innerHTML = '<div class="py-8 px-4 text-center text-[var(--text-muted)] text-[0.9rem]" role="presentation">Type to search packages...</div>';
      activeIndex = -1;
      searchInput.setAttribute('aria-activedescendant', '');
      announce('');
      return;
    }

    var q = query.toLowerCase();
    var matches = searchIndex.filter(function(item) {
      return item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
    });

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="py-8 px-4 text-center text-[var(--text-muted)] text-[0.9rem]" role="presentation">No packages found.</div>';
      activeIndex = -1;
      searchInput.setAttribute('aria-activedescendant', '');
      announce('No packages found.');
      return;
    }

    // Rendering always resets activeIndex to -1, so no row starts active;
    // syncActive() applies SEARCH_ACTIVE on arrow-key navigation.
    searchResults.innerHTML = matches.map(function(item, i) {
      return '<a id="search-option-' + i + '" role="option" aria-selected="false" href="' + escapeHtml(safeUrl(item.href)) + '" class="search-result flex items-center justify-between px-4 py-3 text-[var(--text)] no-underline border-b border-[var(--card-border)] transition-[background] duration-200 ease-in-out cursor-pointer last:border-b-0 hover:bg-accent-subtle">' +
        '<div class="flex flex-col gap-0.5 min-w-0">' +
          '<span class="font-semibold text-[var(--link)] text-[0.95rem]">' + escapeHtml(item.name) + '</span>' +
          '<span class="text-[var(--text-muted)] text-[0.8rem] whitespace-nowrap overflow-hidden text-ellipsis">' + escapeHtml(item.desc) + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2 shrink-0 ml-4">' +
          '<span class="text-[0.7rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-xl bg-accent-subtle text-[var(--link)]">' + escapeHtml(item.type) + '</span>' +
          '<span class="font-mono text-[0.75rem] text-[var(--text-muted)]">v' + escapeHtml(item.version) + '</span>' +
        '</div>' +
      '</a>';
    }).join('');
    announce(matches.length + (matches.length === 1 ? ' result' : ' results') + ' available.');
  }

  function navigateResults(direction) {
    var items = searchResults.querySelectorAll('.search-result');
    if (items.length === 0) return;
    activeIndex += direction;
    if (activeIndex < 0) activeIndex = items.length - 1;
    if (activeIndex >= items.length) activeIndex = 0;
    syncActive();
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function selectResult() {
    var items = searchResults.querySelectorAll('.search-result');
    if (activeIndex >= 0 && activeIndex < items.length) items[activeIndex].click();
  }

  // Focusable controls inside the panel, in DOM order (input, close, results).
  function focusables() {
    return Array.prototype.slice.call(
      searchPanel.querySelectorAll('input, button, a[href]')
    ).filter(function(el) { return !el.disabled && el.offsetParent !== null; });
  }

  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchOverlay.classList.contains('hidden') ? openSearch() : closeSearch();
    }
    if (e.key === 'Escape' && !searchOverlay.classList.contains('hidden')) closeSearch();
  });

  searchInput.addEventListener('input', function() { activeIndex = -1; renderSearchResults(searchInput.value); });
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateResults(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); navigateResults(-1); }
    if (e.key === 'Enter') { e.preventDefault(); selectResult(); }
  });

  // Real focus trap: cycle through every control instead of forcing the input.
  searchOverlay.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (f.length === 0) return;
    var first = f[0];
    var last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  searchOverlay.addEventListener('click', function(e) { if (e.target === searchOverlay) closeSearch(); });
  searchClose.addEventListener('click', closeSearch);
  searchTrigger.addEventListener('click', openSearch);
}

// --- Detail page sidebar: active-section tracking via IntersectionObserver ---
function initSectionTracking() {
  var DESKTOP_ACTIVE = ['!text-[var(--link)]', '!border-l-accent', 'bg-accent-subtle'];
  var DESKTOP_INACTIVE = ['text-[var(--text-muted)]', 'border-transparent'];
  var MOBILE_ACTIVE = ['!text-[var(--link)]', 'bg-accent-subtle'];
  var MOBILE_INACTIVE = ['text-[var(--text-muted)]'];

  function setActiveSection(sectionId) {
    document.querySelectorAll('aside .sidebar-link').forEach(function(link) {
      var on = link.dataset.section === sectionId;
      link.classList[on ? 'add' : 'remove'].apply(link.classList, DESKTOP_ACTIVE);
      link.classList[on ? 'remove' : 'add'].apply(link.classList, DESKTOP_INACTIVE);
    });
    var mobileNav = document.getElementById('sidebar-mobile');
    mobileNav.querySelectorAll('.sidebar-link').forEach(function(link) {
      var on = link.dataset.section === sectionId;
      link.classList[on ? 'add' : 'remove'].apply(link.classList, MOBILE_ACTIVE);
      link.classList[on ? 'remove' : 'add'].apply(link.classList, MOBILE_INACTIVE);
      if (on) link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }

  function setupObserver() {
    var sections = document.querySelectorAll('[id$="-section"]:not(.hidden)');
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-80px 0px -35% 0px', threshold: 0 });
    sections.forEach(function(section) { observer.observe(section); });
    return observer;
  }

  // Section visibility is decided at build time, so the observed set never changes.
  setupObserver();
}

// --- Bootstrap (module script runs after the DOM is parsed) ---
var dataEl = document.getElementById('package-data');
var data = dataEl ? JSON.parse(dataEl.textContent) : { formulae: [], casks: [] };

// Exposed for the inline onclick="copyText(...)" on the large copy buttons.
window.copyText = copyText;

initTheme();
// BASE_URL has no trailing slash; add one so hrefs join as /base/formulae/name/.
initSearch(data, { basePath: import.meta.env.BASE_URL.replace(/\/$/, "") + "/" });
initCopyButtons();
if (document.getElementById('sidebar-mobile')) initSectionTracking();
