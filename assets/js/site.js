/* LMSysDojo project page: the shared runtime. Theme, nav, section rail and scroll-spy, reveal-on-scroll, count-ups,
 * figure lightbox, BibTeX copy, and window.LMSDUI, the small helper API that every component script uses.
 * Loaded first (defer); component scripts may call LMSDUI at any time after it. No libraries. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------------- helper API */
  var UI = window.LMSDUI = {
    /* true when the reader asked for reduced motion; components should render their final state instead */
    reduced: function () { return motionQuery.matches; },
    theme: function () { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; },
    /* the current value of a CSS custom property, e.g. UI.css('--blue') */
    css: function (name, el) { return getComputedStyle(el || root).getPropertyValue(name).trim(); },
    /* create an HTML element: UI.el('div', {class: 'x', text: 'hi'}, [children]) */
    el: function (tag, attrs, kids) { return build(document.createElement(tag), attrs, kids); },
    /* create an SVG element: UI.svg('path', {d: 'M0 0H10'}) */
    svg: function (tag, attrs, kids) { return build(document.createElementNS(NS, tag), attrs, kids); },
    /* run cb once, the first time el comes within `margin` of the viewport */
    onVisible: function (el, cb, margin) {
      if (!el) return;
      if (!('IntersectionObserver' in window)) { cb(el); return; }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(el); } });
      }, { rootMargin: margin || '0px 0px -12% 0px' });
      io.observe(el);
    },
    /* call cb(true|false) whenever el enters or leaves the viewport; use it to pause animation loops off-screen */
    watch: function (el, cb, margin) {
      if (!el) return;
      if (!('IntersectionObserver' in window)) { cb(true); return; }
      /* entries can arrive batched: the newest one is the current state */
      new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }, { rootMargin: margin || '120px 0px' }).observe(el);
    },
    /* scroll progress of a tall track through the viewport: 0 when its top reaches the pin line, 1 when its bottom
       reaches the bottom of the viewport. Pass the track element; pin line defaults to just below the nav. */
    trackProgress: function (track, pinTop) {
      var r = track.getBoundingClientRect();
      var top = pinTop == null ? 0 : pinTop;
      var span = r.height - (window.innerHeight - top);
      if (span <= 0) return r.top <= top ? 1 : 0;
      return Math.min(1, Math.max(0, (top - r.top) / span));
    },
    clamp: function (x, a, b) { return Math.min(b == null ? 1 : b, Math.max(a == null ? 0 : a, x)); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    /* the local progress of t inside [a, b], clamped to 0..1 */
    seg: function (t, a, b) { return Math.min(1, Math.max(0, (t - a) / (b - a))); },
    easeOut: function (x) { return 1 - Math.pow(1 - x, 3); },
    easeInOut: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    fmt: function (n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); },
    /* subscribe to theme changes: cb('light'|'dark') */
    onTheme: function (cb) { document.addEventListener('lmsd:theme', function (e) { cb(e.detail); }); },
    onReducedChange: function (cb) { motionQuery.addEventListener('change', function (e) { cb(e.matches); }); },
    /* animate a number inside el from 0 to its data-count value (keeps data-decimals, data-prefix, data-suffix) */
    countUp: countUp
  };

  function build(node, attrs, kids) {
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { node.style.setProperty(p, v[p]); });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }

  /* ---------------------------------------------------------------- theme */
  function syncThemeUI(t) {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(t === 'dark')); });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0B0D11' : '#FFFFFF');
  }
  function setTheme(t, persist) {
    root.setAttribute('data-theme', t);
    syncThemeUI(t);
    if (persist) { try { localStorage.setItem('lmsd-theme', t); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('lmsd:theme', { detail: t }));
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { setTheme(UI.theme() === 'dark' ? 'light' : 'dark', true); });
  });
  syncThemeUI(UI.theme());

  /* ---------------------------------------------------------------- nav state, rail, scroll-spy
     The scroll path only toggles the nav's backdrop. The current section comes from an observer on a thin band at
     34% of the viewport, so scrolling never forces a layout read; the rail shows while a spied section holds the band
     (from the overview to the citation, so never beside the hero or the story's own step list). */
  var nav = document.querySelector('nav.top');
  var rail = document.querySelector('.rail');
  var queued = false;
  function onScroll() { queued = false; if (nav) nav.classList.toggle('scrolled', window.pageYOffset > 8); }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('nav.top .nav-links a[href^="#"], .rail a[href^="#"]'));
  var spyIds = [];
  spyLinks.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (id && spyIds.indexOf(id) < 0) spyIds.push(id); });
  var spyTargets = spyIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  function mark(current) {
    spyLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + current); });
    if (rail) rail.classList.toggle('show', !!current);
    /* on phones the link strip scrolls sideways: keep the current section's link in view */
    var on = document.querySelector('nav.top .nav-links a.on');
    if (on) {
      var strip = on.closest('.nav-links'), sr = strip.getBoundingClientRect(), ar = on.getBoundingClientRect();
      if (strip.scrollWidth > strip.clientWidth + 1 && (ar.left < sr.left || ar.right > sr.right - 40))
        strip.scrollBy({ left: ar.left + ar.width / 2 - (sr.left + sr.width / 2), behavior: UI.reduced() ? 'auto' : 'smooth' });
    }
  }
  if ('IntersectionObserver' in window && spyTargets.length) {
    var crossing = {};
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { crossing[e.target.id] = e.isIntersecting; });
      var current = null;
      spyTargets.forEach(function (t) { if (crossing[t.id]) current = t.id; });
      mark(current);
    }, { rootMargin: '-34% 0px -65% 0px' });
    spyTargets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------------------------------------------------------------- in-page links
     Clicked #links scroll smoothly; deep links and reloads jump straight to their target (no smooth scroll-behavior on
     the root, which would sweep through the whole page on load). Focus follows the jump for keyboard readers. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || a.hasAttribute('data-soon') || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var id = a.getAttribute('href').slice(1), t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: UI.reduced() ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', '#' + id);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!t.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(t.tagName)) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });
  /* a reload of a #section URL: the browser's restored offset belongs to a different layout, so land on the section
     once the page and fonts settle, unless the reader has already started scrolling */
  if (location.hash) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var moved = false;
    var toHash = function () {
      if (moved) return;
      var id = decodeURIComponent(location.hash.slice(1)), t = id && document.getElementById(id);
      if (t) t.scrollIntoView({ block: 'start', behavior: 'auto' });
    };
    ['wheel', 'touchmove', 'keydown'].forEach(function (n) { window.addEventListener(n, function () { moved = true; }, { once: true, passive: true }); });
    window.addEventListener('load', toHash);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(toHash);
  }

  /* ---------------------------------------------------------------- reveal + count-up */
  function countUp(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    if (isNaN(end)) return;
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    var render = function (v) { el.textContent = pre + UI.fmt(v, dec) + suf; };
    if (UI.reduced()) { render(end); return; }
    var t0 = null, dur = 1400;
    (function step(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      render(end * UI.easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  /* ?reveal=all shows every reveal block at once (full-page screenshots, print) */
  var revealAll = /[?&]reveal=all\b/.test(location.search);
  UI.revealAll = revealAll;
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    if (revealAll) { el.classList.add('in'); return; }
    UI.onVisible(el, function () { el.classList.add('in'); }, '0px 0px -8% 0px');
  });
  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
  });
  document.querySelectorAll('[data-count]').forEach(function (el) {
    UI.onVisible(el, countUp, '0px 0px -10% 0px');
  });

  /* ---------------------------------------------------------------- lightbox: any img[data-zoom] or [data-zoom-src] */
  var dlg = null;
  function openLightbox(src, alt) {
    if (!dlg) {
      dlg = UI.el('dialog', { class: 'lightbox', 'aria-label': 'Figure' });
      dlg.innerHTML = '<div class="lb-bar"><span class="lb-cap"></span><button type="button" aria-label="Close">×</button></div><img alt="">';
      dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.querySelector('img').src = src;
    dlg.querySelector('img').alt = alt || '';
    dlg.querySelector('.lb-cap').textContent = alt || '';
    if (dlg.showModal) dlg.showModal(); else window.open(src, '_blank');
  }
  UI.openLightbox = openLightbox;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-zoom-src], img[data-zoom]');
    if (!t) return;
    e.preventDefault();
    openLightbox(t.getAttribute('data-zoom-src') || t.currentSrc || t.src, t.getAttribute('data-zoom-alt') || t.getAttribute('alt'));
  });

  /* ---------------------------------------------------------------- copy buttons: [data-copy="#id"] */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var src = document.querySelector(b.getAttribute('data-copy'));
      if (!src) return;
      var label = b.querySelector('span') || b, old = label.textContent;
      var done = function () { label.textContent = 'Copied'; setTimeout(function () { label.textContent = old; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(src.textContent.trim()).then(done, function () {});
      else {
        var r = document.createRange(); r.selectNodeContents(src);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        try { document.execCommand('copy'); done(); } catch (err) {}
      }
    });
  });

  /* ---------------------------------------------------------------- inert links still to be filled in */
  document.querySelectorAll('a[data-soon]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });
})();
