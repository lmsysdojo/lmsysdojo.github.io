/* LMSysDojo project page: the Playgrounds tab (playgrounds.html). Every corpus playground with its measurements: one filter
 * bar (pg-filters) scopes a strip of the expert's speedup on each playground (pg-chart) and the list under it (pg-list); a
 * dialog shows one playground's setup and both measurements, opened from either and addressable as
 * playgrounds.html#<engine>/<item>.
 * Data: assets/data/playgrounds.json (the list) and assets/data/pg/<engine>--<item>.json (one playground), generated from the
 * sysdojo corpus by asset/source/site-playgrounds.py; neither holds anything sealed (the PR's problem, fix or diff).
 * Depends on site.js (LMSDUI). */
(function () {
  'use strict';
  var UI = window.LMSDUI;
  var M = {};
  ['pg-stats', 'pg-filters', 'pg-chart', 'pg-list'].forEach(function (k) { M[k] = document.querySelector('[data-mount="' + k + '"]'); });
  if (!UI || !M['pg-filters'] || !M['pg-chart'] || !M['pg-list']) return;
  var E = UI.el, S = UI.svg;

  /* ---------------------------------------------------------------- words for the data's codes */
  var ENGINE = { vllm: 'vLLM', sgl: 'SGLang' };
  var REPO = { vllm: 'vllm-project/vllm', sgl: 'sgl-project/sglang' };
  var SPLIT = { dev: 'development split', 'pre-cutoff': 'held-out split, merged before the cutoff', 'post-cutoff': 'held-out split, merged after the cutoff' };
  /* statuses (build_track.py's ladder on the latest measurement): [chip, chip class, sentence for the dialog]; a plain gain
     needs no chip. Every playground was measured: "error" is a run that left no valid result, and carries its reason */
  var STATUS = {
    done: [null, '', 'The expert’s patch is faster on the metric this setup declares.'],
    negative: ['no gain', 'neg', 'The expert’s patch is not faster on the metric this setup declares.'],
    'high-diff': ['far from the claim', 'claim', 'Measured, but the gain is far from what the PR claimed.'],
    'moderate-diff': ['off the claim', 'claim', 'Measured, but the gain differs from what the PR claimed.'],
    error: ['run errored', 'none', 'Measured, but the run errored, so it has no result.']
  };
  /* why a run left no numbers (asset/source/site-playgrounds-errors.json): [chip, the cause in a sentence] */
  var CAUSE = {
    commit: ['commit error', 'an error in the commits this playground is built from'],
    design: ['item design', 'the design of this playground'],
    harness: ['harness limit', 'a limit of our measurement harness']
  };
  var NOISE = 1.075;                 /* the selection noise floor (paper, Sec. 3 and App. B) */
  var LO = 0.4, HI = 12;             /* the strip's range; ratios beyond it sit at the edges */

  function fmtX(x) { return x == null ? '—' : (x >= 10 ? UI.fmt(x) : x >= 2 ? x.toFixed(1) : x.toFixed(2)) + '×'; }
  function fmtV(v, unit) {
    if (v == null) return '—';
    var a = Math.abs(v), s = a >= 100 ? UI.fmt(v) : a >= 10 ? v.toFixed(1) : v.toFixed(2);
    return unit ? s + ' ' + unit : s;
  }
  function gpus(n) { return n + ' GPU' + (n > 1 ? 's' : ''); }
  /* metric codes such as ITL_p95, OUTPUT_TPS_mean, TPOT_MS: a readable name, its unit and which way is better */
  var NAMES = { OUTPUT_TPS: 'output tokens/s', TOKEN_TPS: 'tokens/s', PROMPT_TPS: 'prompt tokens/s', RPS: 'requests/s', TPOT_MS: 'TPOT', 'goodput@slo': 'goodput at the SLO' };
  function metric(k) {
    var m = /^(.+?)(?:_(mean|median|p\d+))?$/.exec(k || '') || [k, k, ''];
    var base = m[1], stat = m[2] === 'median' ? 'p50' : m[2] || '', higher = /TPS|RPS|goodput/i.test(base), name = NAMES[base] || base;
    return { name: name + (stat ? (higher ? ' (' + stat + ')' : ' ' + stat) : ''), unit: higher ? '' : base === 'E2E' ? 's' : 'ms', higher: higher };
  }
  /* where a ratio sits on the strip's log scale, 0..1 */
  function pos(x) { return (Math.log(UI.clamp(x, LO, HI)) - Math.log(LO)) / (Math.log(HI) - Math.log(LO)); }
  function chip(text, cls, title) { return E('span', { class: 'pg-chip' + (cls ? ' ' + cls : ''), text: text, title: title || null }); }

  /* ---------------------------------------------------------------- state */
  var ALL = [], BY = {};
  var F = { q: '', engine: 'all', split: 'all', result: 'all', gpus: 'all' }, SORT = 'x-desc', STEP = 40, SHOWN = STEP;
  var RESULT = {
    gain: function (it) { return it.ratio != null && it.ratio >= 1; },
    nogain: function (it) { return it.ratio != null && it.ratio < 1; },
    claim: function (it) { return /-diff$/.test(it.status); },
    none: function (it) { return it.ratio == null; }
  };
  function matches(it) {
    if (F.engine !== 'all' && it.engine !== F.engine) return false;
    if (F.split === 'bench' ? !it.split : F.split !== 'all' && it.split !== F.split) return false;
    if (F.result !== 'all' && !RESULT[F.result](it)) return false;
    if (F.gpus !== 'all' && String(it.gpus) !== F.gpus) return false;
    return !F.q || F.q.split(/\s+/).every(function (w) { return it.hay.indexOf(w) >= 0; });
  }
  function filtered() { return F.q || F.engine !== 'all' || F.split !== 'all' || F.result !== 'all' || F.gpus !== 'all'; }
  /* by speedup, a run that errored sorts last */
  var SORTS = {
    'x-desc': function (a, b) { var x = a.ratio, y = b.ratio; return (x == null) - (y == null) || (y - x) || a.pr - b.pr; },
    'x-asc': function (a, b) { var x = a.ratio, y = b.ratio; return (x == null) - (y == null) || (x - y) || a.pr - b.pr; },
    gpus: function (a, b) { return b.gpus - a.gpus || SORTS['x-desc'](a, b); },
    pr: function (a, b) { return (a.engine === b.engine ? 0 : a.engine === 'vllm' ? -1 : 1) || a.pr - b.pr || (a.id < b.id ? -1 : 1); }
  };

  /* ---------------------------------------------------------------- the stats under the title */
  function stats() {
    var host = M['pg-stats'];
    if (!host) return;
    var xs = [], bench = 0;
    ALL.forEach(function (it) { if (it.ratio != null) xs.push(it.ratio); if (it.split) bench++; });
    xs.sort(function (a, b) { return a - b; });
    var h = xs.length >> 1, med = xs.length % 2 ? xs[h] : (xs[h - 1] + xs[h]) / 2;
    function stat(n, unit, l) { return E('div', { class: 'stat' }, [E('div', { class: 'n' }, [n, unit ? E('small', { text: unit }) : null]), E('div', { class: 'l', text: l })]); }
    host.textContent = '';
    [stat(UI.fmt(ALL.length), '', 'playgrounds, all measured before and after the expert’s patch'),
      stat(UI.fmt(xs.length), '', 'with results; the other ' + UI.fmt(ALL.length - xs.length) + ' runs errored'),
      stat(med.toFixed(2), '×', 'median expert speedup on the declared metric'),
      stat(UI.fmt(bench), '', 'in LMSysDojo-100, selected on clean runs and E2E gain')
    ].forEach(function (s) { host.appendChild(s); });
  }

  /* ---------------------------------------------------------------- the filter bar: scopes the strip and the list */
  var countEl, clearBtn, searchEl, groups = [];
  function group(label, key, opts) {
    var wrap = E('div', { class: 'pg-group', role: 'group', 'aria-label': label }, [E('span', { class: 'pg-group-k', text: label })]);
    var row = E('div', { class: 'pg-chips' });
    opts.forEach(function (o) {
      var b = E('button', { type: 'button', 'aria-pressed': String(F[key] === o[0]) }, [o[1], o[2] != null ? E('span', { text: ' ' + UI.fmt(o[2]) }) : null]);
      b.addEventListener('click', function () { F[key] = o[0]; SHOWN = STEP; update(); });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    groups.push({ key: key, wrap: wrap, opts: opts });
    return wrap;
  }
  function filters() {
    function n(fn) { return ALL.filter(fn).length; }
    function by(k, v) { return function (it) { return it[k] === v; }; }
    searchEl = E('input', { class: 'pg-search', type: 'search', placeholder: 'Search a PR number, model or workload', 'aria-label': 'Search the playgrounds', autocomplete: 'off', spellcheck: 'false' });
    var sortEl = E('select', { class: 'pg-sort', 'aria-label': 'Sort the list' }, [
      ['x-desc', 'Largest speedup first'], ['x-asc', 'Smallest speedup first'], ['gpus', 'Most GPUs first'], ['pr', 'By PR number']
    ].map(function (o) { return E('option', { value: o[0], text: o[1] }); }));
    countEl = E('p', { class: 'pg-count', 'aria-live': 'polite' });
    clearBtn = E('button', { class: 'pg-clear', type: 'button', text: 'Clear filters' });
    var host = M['pg-filters'];
    host.textContent = '';
    host.appendChild(E('div', { class: 'pg-find' }, [
      E('label', { class: 'pg-search-wrap' }, [E('span', { class: 'pg-search-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.6"/><path d="M10.4 10.4l3.6 3.6"/></svg>' }), searchEl]),
      E('label', { class: 'pg-sort-wrap' }, [E('span', { text: 'Sort' }), sortEl]),
      E('div', { class: 'pg-count-wrap' }, [countEl, clearBtn])
    ]));
    host.appendChild(E('div', { class: 'pg-groups' }, [
      group('Engine', 'engine', [['all', 'All'], ['vllm', 'vLLM', n(by('engine', 'vllm'))], ['sgl', 'SGLang', n(by('engine', 'sgl'))]]),
      group('LMSysDojo-100', 'split', [['all', 'All'], ['bench', 'In the benchmark', n(function (it) { return !!it.split; })],
        ['dev', 'dev', n(by('split', 'dev'))], ['pre-cutoff', 'pre-cutoff', n(by('split', 'pre-cutoff'))], ['post-cutoff', 'post-cutoff', n(by('split', 'post-cutoff'))]]),
      group('Result', 'result', [['all', 'All'], ['gain', 'faster', n(RESULT.gain)], ['nogain', 'no gain', n(RESULT.nogain)],
        ['claim', 'off the PR’s claim', n(RESULT.claim)], ['none', 'run errored', n(RESULT.none)]]),
      group('GPUs', 'gpus', [['all', 'All'], ['1', '1', n(by('gpus', 1))], ['2', '2', n(by('gpus', 2))], ['4', '4', n(by('gpus', 4))], ['8', '8', n(by('gpus', 8))]])
    ]));
    var tq = 0;
    searchEl.addEventListener('input', function () {
      clearTimeout(tq);
      tq = setTimeout(function () { F.q = searchEl.value.trim().toLowerCase(); SHOWN = STEP; update(); }, 120);
    });
    sortEl.addEventListener('change', function () { SORT = sortEl.value; SHOWN = STEP; list(); });
    clearBtn.addEventListener('click', function () {
      F.q = ''; F.engine = F.split = F.result = F.gpus = 'all'; searchEl.value = ''; SHOWN = STEP; update();
    });
  }
  function update() {
    groups.forEach(function (g) {
      g.wrap.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(F[g.key] === g.opts[i][0])); });
    });
    dim();
    list();
  }

  /* ---------------------------------------------------------------- the strip: one dot per measured playground */
  var frame, tip, svg = null, dots = [], order = [], geom = null, hot = null, played = false;
  function dotClass(it) {
    return 'pg-d ' + (it.ratio < 1 ? 'neg' : 'ok') + (it.split ? ' bench' : '');
  }
  function chart() {
    var drawn = ALL.filter(function (it) { return it.ratio != null; });
    var below = drawn.filter(function (it) { return it.ratio < LO; }).length, above = drawn.filter(function (it) { return it.ratio > HI; }).length;
    var host = M['pg-chart'];
    host.textContent = '';
    frame = E('div', { class: 'pg-plot' });
    tip = E('div', { class: 'pg-tip', 'aria-hidden': 'true' });
    frame.appendChild(tip);
    host.appendChild(frame);
    host.appendChild(E('figcaption', { class: 'pg-cap' }, [
      E('ul', { class: 'pg-legend', 'aria-label': 'Legend' }, [
        E('li', null, [E('i', { class: 'pg-key ok' }), 'expert’s patch faster']),
        E('li', null, [E('i', { class: 'pg-key neg' }), 'no gain']),
        E('li', null, [E('i', { class: 'pg-key ok bench' }), 'in LMSysDojo-100']),
        E('li', null, [E('i', { class: 'pg-key band' }), 'within the ' + NOISE + '× noise floor'])
      ]),
      E('p', { class: 'cap', text: 'One dot per playground with results (' + UI.fmt(drawn.length) + '); the ' + UI.fmt(ALL.length - drawn.length) +
        ' whose run errored are in the list, each with what went wrong. ' + below + ' ratios below ' + LO + '× and ' + above + ' above ' + HI +
        '× sit at the edges. Hover a dot to read it, click to open its playground; the list below holds every value.' })
    ]));
    function draw() {
      var W = frame.clientWidth;
      if (!W) return;
      var mob = W < 560, L = mob ? 60 : 74, R = mob ? 12 : 18, T = 24, lane = mob ? 96 : 120, H = T + lane * 2 + 44;
      var lx = function (x) { return L + pos(x) * (W - L - R); };
      geom = { W: W, mob: mob };
      hot = null;
      if (svg) svg.remove();
      svg = S('svg', { class: 'pg-svg', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
      var ax = S('g', { class: 'pg-axis' });
      function text(cls, x, y, s, anchor) { var t = S('text', { class: cls, x: x, y: y, 'text-anchor': anchor || 'start' }); t.textContent = s; ax.appendChild(t); return t; }
      var y1 = T + lane * 2;
      ['vllm', 'sgl'].forEach(function (e, i) {
        ax.appendChild(S('rect', { class: 'pg-lane', x: L, y: T + i * lane + 3, width: W - L - R, height: lane - 6, rx: 10 }));
        var n = drawn.filter(function (it) { return it.engine === e; }).length;
        text('pg-lane-l', L - 12, T + i * lane + lane / 2 - 2, ENGINE[e], 'end');
        text('pg-lane-n', L - 12, T + i * lane + lane / 2 + 14, UI.fmt(n), 'end');
      });
      /* the noise floor: a band either side of 1x, as in the paper's headroom figure */
      var b0 = lx(1 / NOISE), b1 = lx(NOISE);
      ax.appendChild(S('rect', { class: 'pg-band', x: b0, y: T, width: b1 - b0, height: lane * 2 }));
      text('pg-band-l', (b0 + b1) / 2, T - 8, 'noise floor', 'middle');
      var ticks = mob ? [1, 2, 5] : W - L - R < 800 ? [0.75, 1, 1.5, 2, 3, 5] : [0.5, 0.75, 1, 1.5, 2, 3, 5, 10];
      ticks.forEach(function (x) {
        var X = Math.round(lx(x)) + .5;
        ax.appendChild(S('line', { class: 'pg-grid' + (x === 1 ? ' one' : ''), x1: X, x2: X, y1: T, y2: y1 }));
        text('pg-tick', X, y1 + 18, x + '×', 'middle');
      });
      text('pg-tick', L, y1 + 18, '≤' + LO + '×', 'start');
      text('pg-tick', W - R, y1 + 18, '≥' + HI + '×', 'end');
      text('pg-axis-t', L + (W - L - R) / 2, H - 4, mob ? 'expert’s speedup (log scale)' : 'expert’s speedup on the declared metric (log scale)', 'middle');
      svg.appendChild(ax);
      /* a stable jitter per playground, so the strip never reshuffles; benchmark items on top. Before the
         first view every dot waits at 1x, invisible (spread, below) */
      var still = played || UI.reduced() || UI.revealAll, x1 = lx(1);
      var g = S('g', { class: 'pg-dots' });
      dots = drawn.map(function (it) {
        var h = 2166136261;
        for (var k = 0; k < it.id.length; k++) h = Math.imul(h ^ it.id.charCodeAt(k), 16777619) >>> 0;
        var i = it.engine === 'vllm' ? 0 : 1, x = lx(it.ratio), y = T + i * lane + 12 + (h % 997) / 997 * (lane - 24);
        var r = (mob ? 2.7 : 3.3) + (it.split ? 1 : 0);
        var c = S('circle', { class: dotClass(it), cx: x.toFixed(1), cy: y.toFixed(1), r: r });
        if (!still) { c.style.transform = 'translateX(' + (x1 - x).toFixed(1) + 'px)'; c.style.opacity = '0'; }
        return { it: it, x: x, y: y, el: c };
      });
      order = dots.slice().sort(function (a, b) { return !!a.it.split - !!b.it.split; });
      order.forEach(function (d) { g.appendChild(d.el); });
      svg.appendChild(g);
      frame.insertBefore(svg, tip);
      dim();
      if (!still) UI.onVisible(frame, spread, '0px 0px -15% 0px');
    }
    /* first view: every dot starts at 1x, no change, and spreads to its measured speedup, the far ones last */
    function spread() {
      if (played) return;
      played = true;
      frame.getBoundingClientRect();
      requestAnimationFrame(function () {
        dots.forEach(function (d) {
          var far = Math.min(1, Math.abs(Math.log(d.it.ratio)) / Math.log(4));
          d.el.style.transition = 'transform 1.1s var(--ease-out) ' + (far * .5).toFixed(2) + 's, opacity .35s linear ' + (far * .4).toFixed(2) + 's';
          d.el.style.transform = '';
          d.el.style.opacity = '';
        });
        setTimeout(function () { dots.forEach(function (d) { d.el.style.transition = ''; }); }, 1900);
      });
    }
    window.addEventListener('beforeprint', function () {
      if (played) return;
      played = true;
      dots.forEach(function (d) { d.el.style.transform = d.el.style.opacity = ''; });
    });
    function nearest(ev) {
      var r = svg.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, best = null, bd = 14 * 14;
      dots.forEach(function (d) {
        if (d.el.classList.contains('off')) return;
        var dd = (d.x - mx) * (d.x - mx) + (d.y - my) * (d.y - my);
        if (dd < bd) { bd = dd; best = d; }
      });
      return best;
    }
    frame.addEventListener('pointermove', function (ev) {
      if (!svg) return;
      var d = nearest(ev);
      if (d === hot) return;
      if (hot) hot.el.classList.remove('hot');
      hot = d;
      frame.classList.toggle('pointing', !!d);
      if (!d) { tip.classList.remove('on'); return; }
      d.el.classList.add('hot');
      d.el.parentNode.appendChild(d.el);
      showTip(d);
    });
    frame.addEventListener('pointerleave', function () {
      if (hot) hot.el.classList.remove('hot');
      hot = null;
      frame.classList.remove('pointing');
      tip.classList.remove('on');
    });
    frame.addEventListener('click', function (ev) { var d = svg && nearest(ev); if (d) open(d.it.id); });
    var lastW = -1;
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (frame.clientWidth !== lastW) { lastW = frame.clientWidth; draw(); } }).observe(frame);
    else draw();
  }
  /* the readout leads with the value; labels come from the data, so they go in as text */
  function showTip(d) {
    var it = d.it, m = metric(it.scored);
    tip.textContent = '';
    tip.appendChild(E('p', { class: 'pg-tip-x' }, [E('b', { text: fmtX(it.ratio) }), E('span', { text: ' on ' + m.name })]));
    tip.appendChild(E('p', { class: 'pg-tip-t', text: ENGINE[it.engine] + ' #' + it.pr + ' · ' + it.workload_tag }));
    tip.appendChild(E('p', { class: 'pg-tip-s', text: it.model_name + ' · ' + gpus(it.gpus) }));
    if (it.split) tip.appendChild(E('p', { class: 'pg-tip-s', text: 'LMSysDojo-100, ' + it.split }));
    tip.classList.add('on');
    var tw = tip.offsetWidth, th = tip.offsetHeight, X = UI.clamp(d.x - tw / 2, 0, geom.W - tw), Y = d.y - th - 14;
    if (Y < 0) Y = d.y + 14;
    tip.style.transform = 'translate(' + Math.round(X) + 'px,' + Math.round(Y) + 'px)';
  }
  /* dots outside the filters fade back and the rest come to the front; unfiltered, the benchmark is on top */
  function dim() {
    var on = [];
    dots.forEach(function (d) { var m = matches(d.it); d.el.classList.toggle('off', !m); if (m) on.push(d); });
    (on.length < dots.length ? on : order).forEach(function (d) { d.el.parentNode.appendChild(d.el); });
  }
  function hilite(id, on) {
    for (var i = 0; i < dots.length; i++) if (dots[i].it.id === id) {
      dots[i].el.classList.toggle('hot', on);
      if (on) dots[i].el.parentNode.appendChild(dots[i].el);
      return;
    }
  }

  /* ---------------------------------------------------------------- the list */
  var listEl, moreBtn;
  function listInit() {
    var host = M['pg-list'];
    listEl = E('ol', { class: 'pg-list' });
    moreBtn = E('button', { class: 'btn btn-sm pg-more', type: 'button' });
    host.textContent = '';
    host.appendChild(listEl);
    host.appendChild(E('div', { class: 'pg-more-row' }, [moreBtn]));
    moreBtn.addEventListener('click', function () { SHOWN += STEP * 2; list(); });
    listEl.addEventListener('pointerover', function (e) { var a = e.target.closest('.pg-row'); if (a) hilite(a.getAttribute('data-id'), true); });
    listEl.addEventListener('pointerout', function (e) { var a = e.target.closest('.pg-row'); if (a && !a.contains(e.relatedTarget)) hilite(a.getAttribute('data-id'), false); });
  }
  function row(it) {
    var st = STATUS[it.status] || [null, ''], m = it.scored ? metric(it.scored) : null;
    var bar = null;
    if (it.ratio != null) {
      var p = pos(it.ratio), one = pos(1);
      bar = E('span', { class: 'pg-mini', 'aria-hidden': 'true', style: { '--a': Math.min(p, one).toFixed(3), '--b': Math.abs(p - one).toFixed(3), '--one': one.toFixed(3) } },
        [E('i', { class: (it.ratio < 1 ? 'neg' : 'ok') + (it.split ? ' bench' : '') })]);
    }
    var a = E('a', { class: 'pg-row', href: '#' + it.id, 'data-id': it.id }, [
      E('span', { class: 'pg-r-eng ' + it.engine, text: ENGINE[it.engine] }),
      E('span', { class: 'pg-r-main' }, [
        E('span', { class: 'pg-r-t' }, [E('b', { text: '#' + it.pr }), ' ' + it.workload_tag + ' · ' + it.model_name + ' · ' + gpus(it.gpus)]),
        E('span', { class: 'pg-r-p', text: it.purpose }),
        it.split || (st[0] && it.ratio != null) || CAUSE[it.err] ? E('span', { class: 'pg-r-tags' }, [
          it.split ? chip('LMSysDojo-100 · ' + it.split, 'bench', SPLIT[it.split]) : null,
          st[0] && it.ratio != null ? chip(st[0], st[1]) : null,
          CAUSE[it.err] ? chip(CAUSE[it.err][0], 'none', 'The run errored: ' + CAUSE[it.err][1]) : null]) : null
      ]),
      E('span', { class: 'pg-r-x' }, [
        E('span', { class: 'pg-r-v' }, [E('b', { text: fmtX(it.ratio) }), E('small', { text: it.ratio != null && m ? m.name : st[0] || '' })]),
        bar])
    ]);
    a.addEventListener('click', function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
      ev.preventDefault();
      open(it.id);
    });
    return E('li', null, [a]);
  }
  function list() {
    var rows = ALL.filter(matches).sort(SORTS[SORT]);
    listEl.textContent = '';
    rows.slice(0, SHOWN).forEach(function (it) { listEl.appendChild(row(it)); });
    if (!rows.length) listEl.appendChild(E('li', { class: 'pg-empty', text: 'No playground matches these filters.' }));
    countEl.textContent = rows.length === ALL.length ? UI.fmt(ALL.length) + ' playgrounds' : UI.fmt(rows.length) + ' of ' + UI.fmt(ALL.length) + ' playgrounds';
    clearBtn.hidden = !filtered();
    moreBtn.hidden = rows.length <= SHOWN;
    moreBtn.textContent = 'Show ' + UI.fmt(Math.min(STEP * 2, rows.length - SHOWN)) + ' more (' + UI.fmt(rows.length - SHOWN) + ' left)';
  }

  /* ---------------------------------------------------------------- one playground, in a dialog */
  var dlg = null, body = null, current = null;
  function makeDialog() {
    var close = E('button', { class: 'pgd-close', type: 'button', 'aria-label': 'Close', html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>' });
    body = E('div', { class: 'pgd-body' });
    dlg = E('dialog', { class: 'pgd', 'aria-labelledby': 'pgd-title' }, [close, body]);
    close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      current = null;
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    });
    document.body.appendChild(dlg);
  }
  function open(id) {
    var it = BY[id];
    if (!it) return;
    if (!dlg) makeDialog();
    current = id;
    if (decodeURIComponent(location.hash.slice(1)) !== id) history.replaceState(null, '', '#' + id);
    body.textContent = '';
    body.appendChild(head(it));
    var wait = E('p', { class: 'cap pgd-wait', text: 'Loading the measurements…' });
    body.appendChild(wait);
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    dlg.scrollTop = 0;
    fetch('assets/data/pg/' + encodeURIComponent(id.replace('/', '--')) + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) {
      if (current !== id) return;
      body.textContent = '';
      detail(d, it).forEach(function (n) { if (n) body.appendChild(n); });
    }).catch(function () {
      if (current === id) wait.textContent = 'This playground’s details could not be loaded.';
    });
  }
  function head(it) {
    var st = STATUS[it.status] || [null, ''];
    return E('header', { class: 'pgd-head' }, [
      E('p', { class: 'eyebrow', text: ENGINE[it.engine] + ' · PR #' + it.pr }),
      E('h2', { id: 'pgd-title', text: it.workload_tag + ' · ' + it.model_name + ' · ' + gpus(it.gpus) }),
      E('p', { class: 'pgd-tags' }, [
        it.split ? chip('LMSysDojo-100 · ' + SPLIT[it.split], 'bench') : chip('corpus only, not in LMSysDojo-100', ''),
        st[0] ? chip(st[0], st[1]) : null,
        CAUSE[it.err] ? chip(CAUSE[it.err][0], 'none') : null])
    ]);
  }
  function detail(d, it) {
    var st = STATUS[d.status] || [null, '', ''], sm = d.scored ? metric(d.scored) : null, out = [head(it)];
    if (d.purpose) out.push(E('p', { class: 'pgd-purpose', text: d.purpose }));
    /* the headline: the expert's speedup on the declared metric */
    out.push(E('div', { class: 'pgd-hero' }, [
      E('p', { class: 'pgd-x' }, [E('b', { text: fmtX(d.ratio) }),
        E('span', { text: d.ratio != null && sm ? 'expert’s speedup on ' + sm.name + (sm.higher ? ' (higher is better)' : ' (lower is better)') : 'the run errored' })]),
      E('p', { class: 'pgd-st', text: d.error ? 'Measured, but ' + d.error.text + ', so this playground has no result.' +
        (CAUSE[d.error.kind] ? ' Cause: ' + CAUSE[d.error.kind][1] + '.' : '') :
        st[2] + (d.claim && d.ratio != null ? ' The PR claimed ' + fmtX(d.claim) + '.' : '') })
    ]));
    /* the accepted measurement, metric by metric, the declared one first */
    if (d.ratio != null && d.metrics.length) {
      var ms = d.metrics.slice().sort(function (a, b) { return (b.k === d.scored) - (a.k === d.scored) || (a.k < b.k ? -1 : 1); });
      var many = d.runs.pre > 1;
      out.push(E('h3', { class: 'pgd-k', text: 'Measurement' }));
      out.push(E('div', { class: 'tbl-scroll pgd-tbl' }, [E('table', { class: 'tbl' }, [
        E('thead', null, [E('tr', null, [E('th', { text: 'Metric' }), E('th', { class: 'n', text: 'Before the PR' }), E('th', { class: 'n', text: 'Expert’s patch' }), E('th', { class: 'n', text: 'Speedup' })])]),
        E('tbody', null, ms.map(function (m) {
          var mm = metric(m.k), x = m.x[0];
          function vals(a, arm) { return (m.bad || []).indexOf(arm) >= 0 ? (mm.unit ? 'not recorded' : 'invalid') : a.map(function (v) { return fmtV(v, mm.unit); }).join(' / '); }
          return E('tr', { class: m.k === d.scored ? 'hl' : null }, [
            E('td', null, [mm.name, m.k === d.scored ? E('small', { class: 'pgd-dec', text: 'declared' }) : null]),
            E('td', { class: 'n' + ((m.bad || []).indexOf('pre') >= 0 ? ' bad' : ''), 'data-k': 'Before the PR', text: vals(m.pre, 'pre') }),
            E('td', { class: 'n' + ((m.bad || []).indexOf('post') >= 0 ? ' bad' : ''), 'data-k': 'Expert’s patch', text: vals(m.post, 'post') }),
            E('td', { class: 'n' }, [E('span', { class: 'pgd-sx' + (x == null ? '' : x >= 1 ? ' up' : ' down'), text: m.x.map(fmtX).join(' / ') })])
          ]);
        }))
      ])]));
      var from = { seal: '', attempt: 'From the latest run of each version on file. ', reports: 'From each version’s latest benchmark report on file. ' }[d.source] || '';
      var sv = d.served && d.served.pre != null && d.served.post != null ?
        (d.served.pre === d.served.post ? 'Each version served ' + UI.fmt(d.served.pre) + ' requests. ' :
          'The version before the PR served ' + UI.fmt(d.served.pre) + ' requests, the patch ' + UI.fmt(d.served.post) + '. ') : '';
      out.push(E('p', { class: 'cap pgd-note', text: from + (many ? d.runs.pre + ' runs of each version, values listed per run. ' : 'One run of each version. ') + sv +
        'Latencies in milliseconds (E2E in seconds); the speedup is old over new for a latency and new over old for a throughput.' }));
    }
    /* the setup, as its card states it */
    var facts = [['Model', d.model], ['Architecture', d.architecture], ['Hardware', d.hardware], ['Parallelism', d.parallelism],
      ['Engine', d.version ? ENGINE[d.engine] + ' ' + d.version : ''], ['Load', d.load_profile], ['Workload', d.workload], ['SLO', d.slo],
      ['Declared metrics', d.metric ? d.metric.split(/,\s*/).map(function (k) { return metric(k).name; }).join(', ') : ''], ['Difficulty tier', d.tier]];
    out.push(E('h3', { class: 'pgd-k', text: 'Setup' }));
    out.push(E('dl', { class: 'pgd-facts' }, facts.filter(function (f) { return f[1]; }).reduce(function (a, f) {
      return a.concat([E('dt', { text: f[0] }), E('dd', { text: f[1] })]);
    }, [])));
    if (d.launch) {
      out.push(E('h3', { class: 'pgd-k' }, ['Launch config ', E('code', { text: d.engine === 'vllm' ? 'vllm-config.yaml' : 'sglang-config.yaml' })]));
      out.push(E('pre', { class: 'pgd-code', tabindex: '0', text: d.launch }));
    }
    out.push(E('footer', { class: 'pgd-foot' }, [
      E('a', { class: 'btn btn-sm', href: 'https://github.com/' + REPO[d.engine] + '/pull/' + d.pr, target: '_blank', rel: 'noopener', text: 'PR #' + d.pr + ' on GitHub ↗' }),
      E('span', { text: 'The PR’s text and the expert’s patch stay sealed from agents inside the playground.' })]));
    return out;
  }
  function route() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (BY[id]) { if (id !== current) open(id); }
    else if (dlg && dlg.open) dlg.close();
  }

  /* ---------------------------------------------------------------- go */
  fetch('assets/data/playgrounds.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (items) {
    ALL = items;
    ALL.forEach(function (it) {
      BY[it.id] = it;
      it.hay = [it.id, '#' + it.pr, ENGINE[it.engine], it.model_name, it.workload_tag, it.purpose, it.scored ? metric(it.scored).name : '', gpus(it.gpus),
        it.split ? 'lmsysdojo-100 benchmark ' + it.split : ''].join(' ').toLowerCase();
    });
    stats();
    filters();
    chart();
    listInit();
    list();
    route();
    window.addEventListener('hashchange', route);
  }).catch(function (err) {
    if (window.console) console.warn('playgrounds:', err);
    M['pg-chart'].innerHTML = '<p class="cap">The playground data could not be loaded. Serve this folder over HTTP (for example <code>python3 -m http.server</code>) rather than opening the file directly.</p>';
  });
})();
