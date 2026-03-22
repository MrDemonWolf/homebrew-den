// --- SVG icons ---
const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

// --- Stability badge helper ---
const BADGE = 'inline-block font-sans text-[0.7rem] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-xl whitespace-nowrap align-middle';
const BADGE_COLORS = {
  alpha: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]',
  beta: 'bg-[rgba(168,85,247,0.15)] text-[#a855f7]',
  rc: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]',
  'pre-release': 'bg-[rgba(249,115,22,0.15)] text-[#f97316]',
  stable: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]',
  current: 'bg-accent-subtle text-accent'
};

function stabilityBadge(stability) {
  if (!stability || stability === 'stable') return '';
  const labels = { alpha: 'Alpha', beta: 'Beta', rc: 'RC', 'pre-release': 'Pre-release' };
  const label = labels[stability] || stability;
  return ' <span class="' + BADGE + ' ' + (BADGE_COLORS[stability] || '') + '">' + label + '</span>';
}

// --- Copy functions ---
function copyText(elementId, btn) {
  var text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(function() { showCopied(btn); });
}

function copyCommand(text, btn) {
  navigator.clipboard.writeText(text).then(function() { showCopiedSmall(btn); });
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
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    setTheme('light');
  } else {
    setTheme('dark');
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

  var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  document.getElementById('search-kbd').textContent = isMac ? '\u2318K' : 'Ctrl+K';

  function buildSearchIndex() {
    var items = [];
    (data.formulae || []).forEach(function(f) {
      items.push({ name: f.name, desc: f.desc, version: f.version, type: 'Formula', href: basePath + 'formulae/' + f.name + '/' });
    });
    (data.casks || []).forEach(function(c) {
      items.push({ name: c.name, desc: c.desc, version: c.version, type: 'Cask', href: c.homepage });
    });
    return items;
  }

  var searchIndex = buildSearchIndex();
  var SEARCH_ACTIVE = ['bg-accent-subtle', 'border-l-[3px]', 'border-l-accent', '!pl-[13px]'];

  function openSearch() {
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
      return '<a href="' + item.href + '" class="search-result flex items-center justify-between px-4 py-3 text-[var(--text)] no-underline border-b border-[var(--card-border)] transition-[background] duration-200 ease-in-out cursor-pointer last:border-b-0 hover:bg-accent-subtle' + (i === activeIndex ? ' ' + activeClasses : '') + '" data-index="' + i + '">' +
        '<div class="flex flex-col gap-0.5 min-w-0">' +
          '<span class="font-semibold text-accent text-[0.95rem]">' + item.name + '</span>' +
          '<span class="text-[var(--text-muted)] text-[0.8rem] whitespace-nowrap overflow-hidden text-ellipsis">' + item.desc + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2 shrink-0 ml-4">' +
          '<span class="text-[0.7rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-xl bg-accent-subtle text-accent">' + item.type + '</span>' +
          '<span class="font-mono text-[0.75rem] text-[var(--text-muted)]">v' + item.version + '</span>' +
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

  searchOverlay.addEventListener('click', function(e) { if (e.target === searchOverlay) closeSearch(); });
  searchTrigger.addEventListener('click', openSearch);
}
