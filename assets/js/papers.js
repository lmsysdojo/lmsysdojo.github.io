/* LMSysDojo project page: section 02, the 50-paper library. A button after the lede's "across 50 recent LLM serving
 * papers" opens a dialog listing each paper's headline mechanism as the paper's Appendix G restates it: the gap located
 * in a profile, the trade that relieves it, and the claim. Data: window.LMSD_PAPERS (papers-data.js, generated from the
 * catalog table). Nothing is drawn until the dialog is first opened. Depends on site.js (LMSDUI). */
(function () {
  'use strict';
  var UI = window.LMSDUI, G = window.LMSD_PAPERS, opener = document.querySelector('[data-papers-open]');
  if (!UI || !G || !opener) return;
  var E = UI.el;
  var N = G.reduce(function (n, g) { return n + g.papers.length; }, 0);
  var dlg = null, cards = [], heads = [], chips = [], search, count, group = 'all';

  function plain(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent; }
  function card(p) {
    var el = E('article', { class: 'lib-card' }, [
      E('p', { class: 'lib-head' }, [E('b', { class: 'lib-sys', html: p.sys }), E('span', { class: 'lib-venue', html: p.venue })]),
      E('p', { class: 'lib-title', html: p.title }),
      E('p', { class: 'lib-mech' }, [E('b', { html: p.mech }), E('span', { html: ' · ' + p.desc })]),
      E('dl', { class: 'lib-trade' }, [
        E('dt', { text: 'Gap' }), E('dd', { html: p.gap }),
        E('dt', { text: 'Trade' }), E('dd', { html: p.trade }),
        E('dt', { text: 'Claim' }), E('dd', { html: p.claim })])
    ]);
    el.__text = [p.sys, p.title, p.venue, p.mech, p.desc, p.gap, p.trade, p.claim].map(plain).join(' ').toLowerCase();
    return el;
  }
  function build() {
    var close = E('button', { class: 'lib-close', type: 'button', 'aria-label': 'Close', html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>' });
    search = E('input', { class: 'lib-search', type: 'search', placeholder: 'Search systems and mechanisms', 'aria-label': 'Search the papers' });
    count = E('p', { class: 'lib-count', 'aria-live': 'polite' });
    var bar = E('div', { class: 'lib-chips', role: 'group', 'aria-label': 'Resource traded' },
      [{ key: 'all', name: 'All', n: N }].concat(G.map(function (g, i) { return { key: String(i), name: g.name, n: g.papers.length }; })).map(function (c) {
        var b = E('button', { type: 'button', 'aria-pressed': String(c.key === group), 'data-key': c.key }, [c.name, E('span', { text: ' ' + c.n })]);
        b.addEventListener('click', function () { group = c.key; filter(); });
        chips.push(b);
        return b;
      }));
    var list = E('div', { class: 'lib-list' });
    G.forEach(function (g, i) {
      var h = E('h3', { class: 'lib-group' }, [g.name, E('span', { text: g.papers.length + ' papers' })]);
      h.__g = String(i); heads.push(h); list.appendChild(h);
      var grid = E('div', { class: 'lib-grid' });
      g.papers.forEach(function (p) { var c = card(p); c.__g = String(i); cards.push(c); grid.appendChild(c); });
      h.__grid = grid; list.appendChild(grid);
    });
    dlg = E('dialog', { class: 'lib', 'aria-labelledby': 'lib-title' }, [
      E('div', { class: 'lib-top' }, [
        E('div', { class: 'lib-intro' }, [
          E('p', { class: 'eyebrow', text: 'Literature study' }),
          E('h2', { id: 'lib-title', text: N + ' LLM serving papers, one structure' }),
          E('p', { class: 'lib-lede', html: 'Each paper’s headline mechanism, restated as the <b>gap</b> its authors located in a profile, the <b>trade</b> that relieves it (waste removed, or a resource with headroom spent on the bottleneck), and the <b>claim</b> they report. All ' + N + ' fit this structure, and each trade can be stated without its implementation.' }),
          E('p', { class: 'lib-legend', html: 'Numbers: <span class="pc-C">read from a baseline profile</span> <span class="pc-E">measured by the authors</span> <span class="pc-A">assumed</span>' })
        ]),
        close]),
      E('div', { class: 'lib-controls' }, [bar, E('div', { class: 'lib-find' }, [search, count])]),
      list,
      E('p', { class: 'lib-foot', text: 'From the paper’s Appendix G: recent papers from OSDI, SOSP, NSDI, EuroSys, ASPLOS, FAST and MLSys, grouped by the resource traded. One agent drafted each row from the paper’s PDF and a second checked it. The gap comes from a baseline profile in 44 of the 50; assumptions enter 37; every claim is a measured result. Mechanism names marked * are descriptive labels.' })
    ]);
    close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   /* a click on the backdrop */
    search.addEventListener('input', filter);
    document.body.appendChild(dlg);
    filter();
  }
  function filter() {
    var q = search.value.trim().toLowerCase(), shown = 0, per = {};
    cards.forEach(function (c) {
      var on = (group === 'all' || c.__g === group) && (!q || q.split(/\s+/).every(function (w) { return c.__text.indexOf(w) >= 0; }));
      c.hidden = !on;
      if (on) { shown++; per[c.__g] = 1; }
    });
    heads.forEach(function (h) { h.hidden = h.__grid.hidden = !per[h.__g]; });
    chips.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-key') === group)); });
    count.textContent = shown === N ? N + ' papers' : shown + ' of ' + N + ' papers';
  }

  opener.hidden = false;
  opener.addEventListener('click', function () {
    if (!dlg) build();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
})();
