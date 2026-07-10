// --- SVG icons ---
const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

// --- HTML escaping (defense-in-depth for any interpolated value) ---
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Stability badge helper ---
const BADGE = 'inline-block font-sans text-[0.7rem] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-xl whitespace-nowrap align-middle';
const BADGE_COLORS = {
  alpha: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]',
  beta: 'bg-[rgba(168,85,247,0.15)] text-[#a855f7]',
  rc: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]',
  'pre-release': 'bg-[rgba(249,115,22,0.15)] text-[#f97316]',
  stable: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]',
  current: 'bg-accent-subtle text-[var(--link)]'
};
const STABILITY_LABELS = { alpha: 'Alpha', beta: 'Beta', rc: 'RC', 'pre-release': 'Pre-release', stable: 'Stable' };

// --- Stability detection (single source of truth, mirrors build-site.sh) ---
function detectStability(version, options) {
  const opts = options || {};
  let stability = 'stable';

  if (opts.isGitHubPrerelease) {
    stability = 'pre-release';
  }

  if (/^0\./.test(version) && stability === 'stable') {
    stability = 'alpha';
  }

  if (/-(alpha|beta|rc|dev|canary|nightly|preview)/i.test(version)) {
    if (/alpha/i.test(version)) {
      stability = 'alpha';
    } else if (/beta/i.test(version)) {
      stability = 'beta';
    } else if (/rc/i.test(version)) {
      stability = 'rc';
    } else {
      stability = 'pre-release';
    }
  }

  return stability;
}

// --- Copy buttons ---
function copyText(elementId, btn) {
  var text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(function() { showCopied(btn); });
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
    navigator.clipboard.writeText(text).then(function() { showCopiedSmall(btn); });
  });
}

// --- Theme toggle ---
function initTheme() {
  var themeToggle = document.getElementById('theme-toggle');
  var html = document.documentElement;

  function setTheme(theme) {
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
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

  var savedTheme = localStorage.getItem('theme');
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

  function openSearch() {
    lastFocused = document.activeElement;
    searchOverlay.classList.remove('hidden');
    searchInput.value = '';
    searchInput.focus();
    activeIndex = -1;
    renderSearchResults('');
    document.body.style.overflow = 'hidden';
  }

  function closeSearch() {
    searchOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function renderSearchResults(query) {
    if (!query.trim()) {
      searchResults.innerHTML = '<div class="py-8 px-4 text-center text-[var(--text-muted)] text-[0.9rem]">Type to search packages...</div>';
      activeIndex = -1;
      return;
    }

    var q = query.toLowerCase();
    var matches = searchIndex.filter(function(item) {
      return item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
    });

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="py-8 px-4 text-center text-[var(--text-muted)] text-[0.9rem]">No packages found.</div>';
      activeIndex = -1;
      return;
    }

    var activeClasses = SEARCH_ACTIVE.join(' ');
    searchResults.innerHTML = matches.map(function(item, i) {
      return '<a href="' + escapeHtml(item.href) + '" class="search-result flex items-center justify-between px-4 py-3 text-[var(--text)] no-underline border-b border-[var(--card-border)] transition-[background] duration-200 ease-in-out cursor-pointer last:border-b-0 hover:bg-accent-subtle' + (i === activeIndex ? ' ' + activeClasses : '') + '" data-index="' + i + '">' +
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
  }

  function navigateResults(direction) {
    var items = searchResults.querySelectorAll('.search-result');
    if (items.length === 0) return;
    activeIndex += direction;
    if (activeIndex < 0) activeIndex = items.length - 1;
    if (activeIndex >= items.length) activeIndex = 0;
    items.forEach(function(el, i) {
      if (i === activeIndex) {
        el.classList.add.apply(el.classList, SEARCH_ACTIVE);
      } else {
        el.classList.remove.apply(el.classList, SEARCH_ACTIVE);
      }
    });
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function selectResult() {
    var items = searchResults.querySelectorAll('.search-result');
    if (activeIndex >= 0 && activeIndex < items.length) items[activeIndex].click();
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

  // Trap Tab focus inside the modal while it is open.
  searchOverlay.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  searchOverlay.addEventListener('click', function(e) { if (e.target === searchOverlay) closeSearch(); });
  searchTrigger.addEventListener('click', openSearch);
}

// --- Detail page (shared by formula + cask pages) ---
// Populates the common markup and wires the version history + sidebar tracking.
// Page-type differences (License vs Application, install command) are passed in.
function stabilityBadge(stability, label) {
  return '<span class="' + BADGE + ' ' + (BADGE_COLORS[stability] || '') + '">' + escapeHtml(label) + '</span>';
}

function initDetailPage(item, installCommand) {
  document.getElementById('detail-name').textContent = item.name;
  document.getElementById('detail-version').textContent = 'v' + item.version;
  document.getElementById('detail-desc').textContent = item.desc;
  document.getElementById('install-command').textContent = installCommand;
  document.getElementById('detail-homepage').textContent = item.homepage;
  document.getElementById('detail-homepage').href = item.homepage;
  document.getElementById('detail-version-detail').textContent = item.version;

  // Stability badge + detail row
  var stability = item.stability || 'stable';
  var label = STABILITY_LABELS[stability] || stability;
  if (stability !== 'stable') {
    document.getElementById('detail-stability-badge').innerHTML = stabilityBadge(stability, label);
    document.getElementById('detail-stability-detail').innerHTML = stabilityBadge(stability, label) +
      '<span class="text-[0.8rem] text-[var(--text-muted)]"> &mdash; This version is not yet considered stable.</span>';
  } else {
    document.getElementById('detail-stability-detail').innerHTML = stabilityBadge('stable', 'Stable');
  }

  // Caveats (optional)
  if (item.caveats) {
    document.getElementById('caveats-section').classList.remove('hidden');
    document.getElementById('detail-caveats').textContent = item.caveats;
    document.getElementById('sidebar-caveats').classList.remove('hidden');
    document.querySelectorAll('#sidebar-mobile .sidebar-link[data-section="caveats-section"]').forEach(function(el) { el.classList.remove('hidden'); });
  }

  // Version history (optional)
  if (item.versions && item.versions.length > 0) {
    document.getElementById('versions-section').classList.remove('hidden');
    document.getElementById('sidebar-versions').classList.remove('hidden');
    document.querySelectorAll('#sidebar-mobile .sidebar-link[data-section="versions-section"]').forEach(function(el) { el.classList.remove('hidden'); });

    document.getElementById('versions-body').innerHTML = item.versions.map(function(v) {
      var isCurrent = v.version === item.version;
      var vStability = detectStability(v.version, { isGitHubPrerelease: v.prerelease });
      var statusBadge = stabilityBadge(vStability, STABILITY_LABELS[vStability] || vStability);
      var currentTag = isCurrent ? ' ' + stabilityBadge('current', 'Current') : '';
      return '<tr' + (isCurrent ? ' class="bg-accent-subtle"' : '') + '>' +
        '<td data-label="Version"><span class="font-mono text-[0.8rem] bg-accent-subtle text-[var(--link)] px-2 py-0.5 rounded-xl whitespace-nowrap">v' + escapeHtml(v.version) + '</span>' + currentTag + '</td>' +
        '<td data-label="Date">' + escapeHtml(v.date) + '</td>' +
        '<td data-label="Status">' + statusBadge + '</td>' +
        '<td data-label=""><a href="' + escapeHtml(v.url) + '" target="_blank" rel="noopener noreferrer" class="text-[var(--link)] no-underline text-[0.85rem] hover:underline">Release notes</a></td>' +
        '</tr>';
    }).join('');
  }

  initSectionTracking();
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

  var sectionObserver = setupObserver();

  // Re-observe when caveats/versions sections un-hide.
  var mutationObserver = new MutationObserver(function() {
    sectionObserver.disconnect();
    sectionObserver = setupObserver();
  });
  document.querySelectorAll('[id$="-section"]').forEach(function(el) {
    mutationObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
}
