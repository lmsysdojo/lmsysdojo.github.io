/* LMSysDojo project page: the interactive pieces of section 02, gap analysis. The variance study, the parallel
 * K demo with the K-curve and headroom, the provenance viewer for analysis.py, the iterative-check flow, the main
 * results table and the K = 50 scaling chart. Numbers come from window.LMSD and window.LMSD_CASES only; anything
 * schematic is tagged "illustrative". Each piece builds off-DOM and swaps in, so a failure keeps its fallback. */
(function () {
  'use strict';
  var UI = window.LMSDUI, D = window.LMSD, CASES = window.LMSD_CASES || {};
  var sec = document.getElementById('gap');
  if (!sec || !UI || !D) return;
  var E = UI.el, S = UI.svg;

  function mount(name) { return sec.querySelector('[data-mount="' + name + '"]'); }
  function run(name, fn) {
    var m = mount(name);
    if (!m) return;
    try { fn(m); } catch (err) { if (window.console) console.warn('gap.js [' + name + ']', err); }
  }
  function swap(m, node) { m.textContent = ''; m.appendChild(node); m.classList.add('g-on'); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function signed(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + f1(Math.abs(v)); }
  /* segmented control with a sliding thumb: opts {label, items:[{key,text}], value, onChange} */
  function segmented(o) {
    var box = E('div', { class: 'g-seg', role: 'group', 'aria-label': o.label });
    var thumb = E('span', { class: 'g-seg-thumb', 'aria-hidden': 'true' });
    box.appendChild(thumb);
    var btns = o.items.map(function (it) {
      var b = E('button', { type: 'button', 'aria-pressed': String(it.key === o.value), 'data-k': it.key }, [it.text]);
      b.addEventListener('click', function () { set(it.key, true); });
      box.appendChild(b);
      return b;
    });
    function place() {
      var on = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
      if (!on || !on.offsetWidth) return;
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }
    function set(k, user) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === k)); });
      place();
      if (user && o.onChange) o.onChange(k);
    }
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(box);
    requestAnimationFrame(place);
    return { el: box, set: set, place: place };
  }
  /* ease a number shown in el toward `to` */
  function tweenText(el, to, dur, fmt) {
    fmt = fmt || f1;
    var from = parseFloat(el.textContent.replace('−', '-'));
    if (el.__tw) cancelAnimationFrame(el.__tw);
    if (UI.reduced() || isNaN(from) || from === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(UI.lerp(from, to, UI.easeOut(p)));
      el.__tw = p < 1 ? requestAnimationFrame(step) : null;
    })(t0);
  }
  /* grow-in for elements carrying .g-grow once the host is on screen (CSS does the easing) */
  function growIn(host) {
    if (UI.reduced()) { host.classList.add('g-grown'); return; }
    UI.onVisible(host, function () { requestAnimationFrame(function () { host.classList.add('g-grown'); }); }, '0px 0px -10% 0px');
  }

  /* ------------------------------------------------------------------ 1. variance: where the outcome spread lives */
  run('variance', function (m) {
    var V = D.variance || { gap: { full: 0.067, fix: 0.010 }, structured: { full: 0.072, fix: 0.012 }, reduction: '97–98%' };
    var groups = [
      { key: 'gap', name: 'Gap analysis', sub: 'free-form analyses', full: V.gap.full, fix: V.gap.fix },
      { key: 'structured', name: 'Structured gap analysis', sub: 'analyze(C, E, A)', full: V.structured.full, fix: V.structured.fix }
    ];
    var MAX = 0.08, ticks = [0, 0.02, 0.04, 0.06, 0.08];
    var root = E('div', { class: 'gv' });
    root.appendChild(E('p', { class: 'gv-k' }, ['Median within-item std. of log E2E speedup, three runs per item']));
    var body = E('div', { class: 'gv-body' });
    var grid = E('div', { class: 'gv-grid', 'aria-hidden': 'true' });
    ticks.forEach(function (t) {
      grid.appendChild(E('span', { style: { left: (t / MAX * 100) + '%' } }, [E('em', { text: t ? String(t).replace(/^0/, '') : '0' })]));
    });
    body.appendChild(grid);
    groups.forEach(function (g, gi) {
      var grp = E('div', { class: 'gv-group', 'data-k': g.key });
      grp.appendChild(E('div', { class: 'gv-name' }, [E('b', { text: g.name }), E('span', { text: g.sub })]));
      [['whole pipeline', 'fresh analysis each run', g.full, 'full'], ['implementer only', 'one fixed analysis', g.fix, 'fix']].forEach(function (r, ri) {
        var w = (r[2] / MAX * 100).toFixed(2) + '%';
        grp.appendChild(E('div', { class: 'gv-row gv-' + r[3] }, [
          E('span', { class: 'gv-lab' }, [r[0], E('small', { text: r[1] })]),
          E('span', { class: 'gv-track' }, [
            E('i', { class: 'gv-bar g-grow', style: { '--w': w, '--d': (gi * 0.14 + ri * 0.08) + 's' } }),
            E('b', { class: 'gv-val', style: { left: w }, text: r[2].toFixed(3) })
          ])
        ]));
      });
      body.appendChild(grp);
    });
    root.appendChild(body);
    root.appendChild(E('div', { class: 'gv-foot' }, [
      E('span', { class: 'gv-big', text: V.reduction }),
      E('span', { class: 'gv-note' }, ['less squared median spread when only the implementer is re-run on a fixed analysis: outcome variance concentrates in the analysis.'])
    ]));
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', 'Median within-item standard deviation of log speedup. ' + groups.map(function (g) {
      return g.name + ': ' + g.full.toFixed(3) + ' for the whole pipeline versus ' + g.fix.toFixed(3) + ' for the implementer only.';
    }).join(' ') + ' Fixing the analysis reduces squared median spread by ' + V.reduction.replace('–', ' to ').replace('%', ' percent') + '.');
    swap(m, root);
    growIn(root);
  });

  /* ------------------------------------------------------------------ 2. parallel: K analyzers, implement the top prediction */
  run('parallel', function (m) {
    var KC = D.kcurve, HR = D.headroom;
    if (!KC) return;
    /* illustrative predicted gains: a fixed pseudo-random draw, so adding analyzers never reshuffles earlier ones */
    var PRED = [];
    for (var i = 0; i < 10; i++) { var x = Math.sin((i + 1) * 12.9898 + 18 * 78.233) * 43758.5453; PRED.push(0.3 + 0.62 * (x - Math.floor(x))); }
    var st = { K: 5, win: -1, wx: null };
    var root = E('div', { class: 'gp' });
    var gridEl = E('div', { class: 'gp-grid' });
    root.appendChild(gridEl);

    /* left: the pool */
    var pool = E('div', { class: 'gp-pool' });
    var kOut = E('output', { class: 'gp-kval', 'aria-live': 'polite' });
    var minus = E('button', { type: 'button', class: 'gp-step', 'aria-label': 'Fewer analyzers' }, ['−']);
    var plusB = E('button', { type: 'button', class: 'gp-step', 'aria-label': 'More analyzers' }, ['+']);
    pool.appendChild(E('div', { class: 'gp-top' }, [
      E('div', {}, [E('span', { class: 'gp-k' }, ['Analyzers per item']), E('div', { class: 'gp-kline' }, [E('i', { text: 'K' }), ' = ', kOut])]),
      E('div', { class: 'gp-steps' }, [minus, plusB])
    ]));
    var range = E('input', { type: 'range', min: 1, max: 10, step: 1, value: st.K, class: 'gp-range', 'aria-label': 'Number of analyzers K' });
    pool.appendChild(E('div', { class: 'gp-range-wrap' }, [range]));
    var box = E('div', { class: 'gp-box' });
    box.appendChild(E('div', { class: 'gp-box-k' }, [E('span', { text: 'pred. gain' }), E('span', { class: 'tag-note', text: 'illustrative' })]));
    var strip = E('div', { class: 'gp-strip' });
    var cells = PRED.map(function (v, j) {
      var c = E('div', { class: 'gp-cell', 'data-j': j, style: { '--h': v.toFixed(3) } }, [
        E('span', { class: 'gp-bar' }),
        E('span', { class: 'gp-pick', text: 'pick' }),
        E('span', { class: 'gp-idx', text: String(j + 1) })
      ]);
      c.addEventListener('click', function () { setK(j + 1); });
      strip.appendChild(c);
      return c;
    });
    var level = E('span', { class: 'gp-level', 'aria-hidden': 'true' });
    strip.appendChild(level);
    box.appendChild(strip);
    pool.appendChild(box);
    var wire = S('svg', { class: 'gp-wire', 'aria-hidden': 'true' });
    var wpath = S('path', { class: 'gp-wire-path' });
    var wdot = S('circle', { class: 'gp-wire-dot', r: 4.5, cx: -20, cy: -20 });
    wire.appendChild(wpath); wire.appendChild(wdot);
    pool.appendChild(wire);
    var impl = E('span', { class: 'gp-impl' }, [E('b', { text: '</> Implement' }), E('small', { text: 'only the pick' })]);
    var meas = E('span', { class: 'gp-meas' }, [E('b', { text: 'measure once' }), E('small', { text: 'one deployment' })]);
    pool.appendChild(E('div', { class: 'gp-flow' }, [impl, E('span', { class: 'gp-arrow', 'aria-hidden': 'true' }), meas]));
    pool.appendChild(E('p', { class: 'gp-pool-cap' }, ['Bars are illustrative predictions. Only the highest predicted gain is built and measured; the method never implements the others.']));
    gridEl.appendChild(pool);

    function winner(K) { var w = 0; for (var j = 1; j < K; j++) if (PRED[j] > PRED[w]) w = j; return w; }
    function wireGeom() {
      var pr = pool.getBoundingClientRect(), sr = strip.getBoundingClientRect(), ir = impl.getBoundingClientRect();
      var c = cells[st.win].getBoundingClientRect();
      var top = sr.bottom - pr.top, bottom = ir.top - pr.top;
      return { x: c.left + c.width / 2 - pr.left, x1: ir.left + ir.width / 2 - pr.left, top: top, bottom: bottom, w: pr.width };
    }
    function wireD(g, x) {
      var mid = g.top + (g.bottom - g.top) * 0.5, dx = g.x1 - x, r = Math.min(10, Math.abs(dx) / 2, (g.bottom - g.top) / 4), s = dx > 0 ? 1 : -1;
      if (Math.abs(dx) < 1) return 'M' + x + ' ' + g.top + 'V' + g.bottom;
      return 'M' + x + ' ' + g.top + 'V' + (mid - r) + 'Q' + x + ' ' + mid + ' ' + (x + s * r) + ' ' + mid +
        'H' + (g.x1 - s * r) + 'Q' + g.x1 + ' ' + mid + ' ' + g.x1 + ' ' + (mid + r) + 'V' + g.bottom;
    }
    var tween = null;
    function drawWire(animate) {
      if (st.win < 0 || !pool.offsetWidth) return;
      var g = wireGeom();
      wire.setAttribute('viewBox', '0 0 ' + g.w + ' ' + pool.offsetHeight);
      wire.setAttribute('width', g.w); wire.setAttribute('height', pool.offsetHeight);
      var from = st.wx == null ? g.x : st.wx, to = g.x;
      if (tween) cancelAnimationFrame(tween);
      if (!animate || UI.reduced() || Math.abs(from - to) < 1) { st.wx = to; wpath.setAttribute('d', wireD(g, to)); return; }
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / 560), x = UI.lerp(from, to, UI.easeInOut(p));
        st.wx = x; wpath.setAttribute('d', wireD(g, x));
        tween = p < 1 ? requestAnimationFrame(step) : null;
        if (p >= 1) pulse();
      })(t0);
    }
    var pulseRaf = null;
    function pulse() {
      if (UI.reduced() || document.hidden) return;
      var L = wpath.getTotalLength(), t0 = performance.now();
      if (pulseRaf) cancelAnimationFrame(pulseRaf);
      impl.classList.remove('hit'); meas.classList.remove('hit');
      (function step(now) {
        var p = Math.min(1, (now - t0) / 520), pt = wpath.getPointAtLength(L * UI.easeInOut(p));
        wdot.setAttribute('cx', pt.x); wdot.setAttribute('cy', pt.y); wdot.style.opacity = p < 0.92 ? 1 : (1 - p) / 0.08;
        if (p < 1) { pulseRaf = requestAnimationFrame(step); return; }
        pulseRaf = null;
        impl.classList.add('hit');
        setTimeout(function () { meas.classList.add('hit'); }, 260);
      })(t0);
    }
    var onK = [];
    function setK(K, quiet) {
      K = Math.max(1, Math.min(10, Math.round(K)));
      var changed = K !== st.K || st.win < 0;
      st.K = K; range.value = K; kOut.textContent = K;
      range.style.setProperty('--p', ((K - 1) / 9 * 100).toFixed(2) + '%');
      minus.setAttribute('aria-disabled', String(K <= 1)); plusB.setAttribute('aria-disabled', String(K >= 10));
      var w = winner(K), moved = w !== st.win;
      st.win = w;
      cells.forEach(function (c, j) { c.classList.toggle('on', j < K); c.classList.toggle('win', j === w); });
      strip.style.setProperty('--hw', PRED[w].toFixed(3));
      if (changed) onK.forEach(function (f) { f(K, quiet); });
      if (moved || changed) drawWire(!quiet && moved);
      if (!quiet && !moved && changed) pulse();
    }
    minus.addEventListener('click', function () { setK(st.K - 1); });
    plusB.addEventListener('click', function () { setK(st.K + 1); });
    range.addEventListener('input', function () { setK(+range.value); });

    /* right: the K-curve, with a marker at the chosen K */
    var card = E('div', { class: 'gp-chart' });
    card.appendChild(E('div', { class: 'gp-chart-head' }, [
      E('h4', { text: 'Normalized gain of the pick' }),
      E('p', { class: 'cap', text: '70 held-out items, E2E. Every K still implements and measures one winner per item. Vanilla has no selection signal and stays at its K = 1 mean.' })
    ]));
    var chost = E('div', { class: 'gp-chost' });
    card.appendChild(chost);
    var read = E('div', { class: 'gp-read' });
    card.appendChild(read);
    gridEl.appendChild(card);
    var SER = [
      { key: 'vanilla', label: 'Vanilla', tip: 'Vanilla (K = 1 mean)', note: 'K = 1 mean', color: 'var(--s-vanilla)', dash: '6 5', marker: false },
      { key: 'ranker', label: '+ ranker', color: 'var(--s-ranker)', r: 3 },
      { key: 'gap', label: 'Gap analysis', color: 'var(--s-gap)' },
      { key: 'structured', label: 'Structured', color: 'var(--s-structured)' },
      { key: 'iterative', label: 'Iterative', color: 'var(--s-iterative)' }
    ];
    var Y0 = 56, Y1 = 80;
    /* no chart legend: the readout under the chart names the series and toggles them */
    var chart = window.LMSDCharts ? LMSDCharts.line(chost, {
      x: KC.K, xDomain: [1, 10], xTicks: KC.K, yDomain: [Y0, Y1], yTicks: [60, 65, 70, 75, 80], height: 330, legend: false,
      xTitle: 'analyses per item, K', yTitle: 'normalized gain (%)', margin: { r: 50 },
      ariaLabel: 'Normalized gain of the selected candidate against K from 1 to 10 for five methods',
      tipTitle: function (x) { return 'K = ' + x; },
      series: SER.map(function (s) { return { key: s.key, label: s.tip || s.label, color: s.color, dash: s.dash, marker: s.marker, r: s.r, values: KC[s.key] }; })
    }) : null;
    var holder = chost.lastElementChild;
    var ov = S('svg', { class: 'gp-ov', 'aria-hidden': 'true' });
    var ovG = S('g', { class: 'gp-ov-g' });
    var ovLine = S('line', { class: 'gp-ov-line', x1: 0, x2: 0 });
    var ovTagBg = S('rect', { class: 'gp-ov-tagbg', rx: 9, height: 18, width: 46, x: -23 });
    var ovTag = S('text', { class: 'gp-ov-tag', 'text-anchor': 'middle' });
    ovG.appendChild(ovLine); ovG.appendChild(ovTagBg); ovG.appendChild(ovTag); ov.appendChild(ovG);
    var dots = {};
    SER.forEach(function (s) { dots[s.key] = S('circle', { class: 'gp-ov-dot', r: 5, cx: 0, cy: 0, style: { fill: s.color } }); ov.appendChild(dots[s.key]); });
    function geom() {
      var svg = holder && holder.querySelector('svg[role="img"]'), hit = svg && svg.querySelector('rect.hit');
      if (!hit) return null;
      return { svg: svg, W: +svg.getAttribute('width'), H: +svg.getAttribute('height'), x: +hit.getAttribute('x'), y: +hit.getAttribute('y'), w: +hit.getAttribute('width'), h: +hit.getAttribute('height') };
    }
    function placeOverlay() {
      var g = geom();
      if (!g) return;
      if (holder.lastChild !== ov) holder.appendChild(ov);
      ov.setAttribute('viewBox', '0 0 ' + g.W + ' ' + g.H); ov.setAttribute('width', g.W); ov.setAttribute('height', g.H);
      var X = g.x + (st.K - 1) / 9 * g.w;
      ovLine.setAttribute('y1', g.y - 4); ovLine.setAttribute('y2', g.y + g.h);
      ovTagBg.setAttribute('y', g.y - 22); ovTag.setAttribute('y', g.y - 9); ovTag.textContent = 'K = ' + st.K;
      ovG.style.transform = 'translateX(' + X.toFixed(1) + 'px)';
      SER.forEach(function (s) {
        var shown = !!g.svg.querySelector('.series[data-key="' + s.key + '"]'), v = KC[s.key][st.K - 1];
        dots[s.key].style.display = shown ? '' : 'none';
        dots[s.key].style.transform = 'translate(' + X.toFixed(1) + 'px,' + (g.y + g.h - (v - Y0) / (Y1 - Y0) * g.h).toFixed(1) + 'px)';
      });
    }
    if (holder && 'MutationObserver' in window) new MutationObserver(placeOverlay).observe(holder, { childList: true });
    if (holder) holder.addEventListener('click', function (e) {
      var g = geom();
      if (!g) return;
      var r = g.svg.getBoundingClientRect(), px = (e.clientX - r.left) * (g.W / r.width);
      if (px >= g.x - 12 && px <= g.x + g.w + 12) setK(1 + (px - g.x) / g.w * 9);
    });
    UI.onVisible(chost, function () {
      setTimeout(function () { ov.classList.add('in'); }, UI.reduced() ? 0 : 1500);
    }, '0px 0px -15% 0px');
    /* the readout: every series at the chosen K; each item shows or hides its series, as a chart legend would */
    var readVals = {}, shown = {}, readK = E('span', { text: String(st.K) });
    read.setAttribute('role', 'group');
    read.setAttribute('aria-label', 'Values at the chosen K; press a series to show or hide it');
    read.appendChild(E('p', { class: 'gp-read-k' }, ['At K = ', readK]));
    function hilite(key) {
      if (chart) chart.highlight(key);
      SER.forEach(function (x) { dots[x.key].classList.toggle('dim', !!key && x.key !== key); });
    }
    SER.slice().reverse().forEach(function (s) {
      shown[s.key] = true;
      readVals[s.key] = E('b', { text: f1(KC[s.key][st.K - 1]) });
      var btn = E('button', { type: 'button', class: 'gp-read-i', 'aria-pressed': 'true', style: { '--c': s.color } },
        [E('i', { class: s.dash ? 'dash' : '' }), E('span', { text: s.label }), readVals[s.key], s.note ? E('small', { text: s.note }) : null]);
      if (chart) btn.addEventListener('click', function () {
        shown[s.key] = !shown[s.key];
        btn.setAttribute('aria-pressed', String(shown[s.key]));
        chart.setVisible(SER.filter(function (x) { return shown[x.key]; }).map(function (x) { return x.key; }));
      });
      btn.addEventListener('mouseenter', function () { hilite(s.key); });
      btn.addEventListener('mouseleave', function () { hilite(null); });
      btn.addEventListener('focus', function () { hilite(s.key); });
      btn.addEventListener('blur', function () { hilite(null); });
      read.appendChild(btn);
    });
    onK.push(function (K) {
      placeOverlay();
      readK.textContent = K;
      SER.forEach(function (s) { tweenText(readVals[s.key], KC[s.key][K - 1], 420); });
    });

    /* below: headroom at K = 10 */
    if (HR) {
      var hr = E('div', { class: 'gp-hr' });
      hr.appendChild(E('div', { class: 'gp-hr-head' }, [
        E('div', {}, [E('h4', { text: 'Headroom at ten analyses' }), E('p', { class: 'cap', text: 'Pooled over the 70 held-out items: the mean single analysis, the pick, and the post-hoc best of ten. To measure the pool, all ten were also built and scored afterwards; those outcomes never reach any analyzer, check or selector.' })]),
        E('div', { class: 'gp-hr-leg', 'aria-hidden': 'true' }, [
          E('span', {}, [E('i', { class: 'm-dot' }), 'pool mean']), E('span', {}, [E('i', { class: 'm-tri' }), 'pick']),
          E('span', {}, [E('i', { class: 'm-ring' }), 'oracle, best of ten']), E('span', {}, [E('i', { class: 'm-arrow' }), 'iterative pick'])
        ])
      ]));
      var hrHost = E('div', { class: 'gp-hr-plot', role: 'img', 'aria-label': HR.map(function (r) {
        return r.label + ': pool mean ' + f1(r.mean) + ', pick ' + f1(r.pick) + ', oracle ' + f1(r.oracle) + (r.iterative ? ', iterative pick ' + f1(r.iterative) : '');
      }).join('; ') });
      hr.appendChild(hrHost);
      var RK = HR.filter(function (r) { return r.key === 'ranker'; })[0];
      if (RK) hr.appendChild(E('p', { class: 'gp-hr-note' }, [E('b', { text: 'The ranker sees ten finished patches but has no quantitative prediction: ' }),
        'its pick (' + f1(RK.pick) + ') stays near the pool mean (' + f1(RK.mean) + '), although its best of ten reaches ' + f1(RK.oracle) + '. Selecting on predicted gain moves the pick toward the oracle, and the checks move it further.']));
      root.appendChild(hr);
      var drawHR = function () { headroom(hrHost, HR); };
      if ('ResizeObserver' in window) new ResizeObserver(drawHR).observe(hrHost);
      growIn(hr);
    }

    swap(m, root);
    setK(st.K, true);
    if ('ResizeObserver' in window) new ResizeObserver(function () { drawWire(false); }).observe(pool);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawWire(false); });
  });

  /* the headroom dumbbell: one row per method, x = normalized gain at K = 10 */
  function headroom(host, rows) {
    var W = Math.round(host.clientWidth);
    if (!W || W === host.__w) return;
    host.__w = W;
    var COL = { ranker: 'var(--s-ranker)', gap: 'var(--s-gap)', structured: 'var(--s-structured)' };
    var narrow = W < 560, lw = narrow ? 92 : 168, rowH = narrow ? 62 : 66, top = 10, H = top + rows.length * rowH + 30;
    var x0 = 55, x1 = 90, xs = function (v) { return lw + (v - x0) / (x1 - x0) * (W - lw - 18); };
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'aria-hidden': 'true' });
    [60, 70, 80, 90].forEach(function (t) {
      svg.appendChild(S('line', { class: 'gp-hr-grid', x1: xs(t), x2: xs(t), y1: top - 4, y2: H - 26 }));
      svg.appendChild(S('text', { class: 'gp-hr-tick', x: xs(t), y: H - 8, 'text-anchor': 'middle', text: String(t) }));
    });
    rows.forEach(function (r, i) {
      var y = top + i * rowH + rowH / 2, c = COL[r.key] || 'var(--ink-3)';
      var g = S('g', { class: 'gp-hr-row', style: { '--c': c, '--d': (i * 0.12) + 's' } });
      g.appendChild(S('text', { class: 'gp-hr-lab', x: lw - (narrow ? 10 : 18), y: y + 4.5, 'text-anchor': 'end', text: narrow ? r.label.replace('Vanilla + ', '+ ') : r.label }));
      g.appendChild(S('line', { class: 'gp-hr-span', x1: xs(r.mean), x2: xs(r.oracle), y1: y, y2: y }));
      g.appendChild(S('circle', { class: 'gp-hr-mean', cx: xs(r.mean), cy: y, r: 5.5 }));
      var px = xs(r.pick);
      g.appendChild(S('path', { class: 'gp-hr-pick', d: 'M' + px + ' ' + (y - 6.5) + 'L' + (px + 6.5) + ' ' + (y + 5) + 'L' + (px - 6.5) + ' ' + (y + 5) + 'Z' }));
      g.appendChild(S('circle', { class: 'gp-hr-oracle', cx: xs(r.oracle), cy: y, r: 5.5 }));
      var below = y + 21, above = y - 13;
      g.appendChild(S('text', { class: 'gp-hr-val', x: xs(r.mean), y: below, 'text-anchor': 'middle', text: f1(r.mean) }));
      g.appendChild(S('text', { class: 'gp-hr-val', x: px, y: r.iterative ? below : above, 'text-anchor': 'middle', text: f1(r.pick) }));
      g.appendChild(S('text', { class: 'gp-hr-val', x: xs(r.oracle), y: below, 'text-anchor': 'middle', text: f1(r.oracle) }));
      if (r.iterative) {
        var ix = xs(r.iterative);
        g.appendChild(S('path', { class: 'gp-hr-arrow', d: 'M' + (px + 8) + ' ' + y + 'H' + (ix - 2) }));
        g.appendChild(S('path', { class: 'gp-hr-head', d: 'M' + (ix - 6) + ' ' + (y - 4.5) + 'L' + (ix + 1) + ' ' + y + 'L' + (ix - 6) + ' ' + (y + 4.5) + 'Z' }));
        g.appendChild(S('text', { class: 'gp-hr-val gp-hr-it', x: ix, y: above, 'text-anchor': 'middle', text: f1(r.iterative) }));
      }
      svg.appendChild(g);
    });
    host.textContent = '';
    host.appendChild(svg);
  }

  /* ------------------------------------------------------------------ 3. provenance: analysis.py for vLLM 4696 */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  /* minimal highlighting: provenance calls in their source colour, keywords, comments */
  function codeHTML(line) {
    var i = -1, q = false;
    for (var k = 0; k < line.length; k++) {
      if (line[k] === '"') q = !q;
      else if (line[k] === '#' && !q) { i = k; break; }
    }
    var code = i >= 0 ? line.slice(0, i) : line, cm = i >= 0 ? line.slice(i) : '';
    var h = esc(code)
      .replace(/\b(def|return)\b/g, '<span class="kw">$1</span>')
      .replace(/\bC\.scalar\b/g, '<span class="pc-C">C.scalar</span>')
      .replace(/\bE\.scalar\b/g, '<span class="pc-E">E.scalar</span>')
      .replace(/\bA\(("[^"]*")\)/g, '<span class="pc-A">A($1)</span>');
    return h + (cm ? '<span class="cm">' + esc(cm) + '</span>' : '');
  }
  run('provenance', function (m) {
    var deep = CASES.deep;
    if (!deep || !deep.program) return;
    var SRC = {
      C: { name: 'Profiles', role: 'sealed corpus', desc: 'SQL over the baseline profiles and setup' },
      E: { name: 'Evidence', role: 'evidence/', desc: 'the analyzer’s own measurements, here a microbenchmark' },
      A: { name: 'Assumptions', role: 'assume.yaml', desc: 'stated values, each with a reason' }
    };
    var root = E('div', { class: 'gpv' });
    var main = E('div', { class: 'gpv-main' });
    root.appendChild(main);

    /* the program */
    var pred = (deep.prediction || []).filter(function (p) { return p.m === 'E2E'; })[0];
    var codeBox = E('div', { class: 'gpv-code' });
    codeBox.appendChild(E('div', { class: 'gpv-code-head' }, [
      E('div', {}, [E('b', { text: 'analysis.py' }), E('span', { text: 'predicts the gain from C, E, A' })]),
      pred ? E('div', { class: 'gpv-pred' }, [E('span', { text: 'pred. E2E latency' }), E('b', { text: signed(pred.pred) + '%' })]) : null
    ]));
    var pre = E('pre', { class: 'gpv-pre', tabindex: '0', 'aria-label': 'analysis.py, the prediction program for vLLM 4696' });
    var lines = deep.program.map(function (ln, i) {
      var row = E('span', { class: 'gpv-ln' + (ln.src ? ' has-' + ln.src : ''), 'data-src': ln.src || '' });
      row.appendChild(E('span', { class: 'gpv-no', 'aria-hidden': 'true', text: String(i + 1) }));
      row.appendChild(E('span', { class: 'gpv-src', 'aria-hidden': 'true', text: ln.src || '' }));
      row.appendChild(E('span', { class: 'gpv-txt', html: codeHTML(ln.c) }));
      if (ln.src) row.appendChild(E('span', { class: 'sr-only', text: ' (source ' + ln.src + ')' }));
      pre.appendChild(row);
      return row;
    });
    codeBox.appendChild(pre);
    if (deep.prediction) codeBox.appendChild(E('div', { class: 'gpv-run' }, [E('span', { class: 'gpv-run-k', text: 'returns' })].concat(deep.prediction.map(function (p) {
      return E('span', { class: 'gpv-run-v' }, [p.m + ' ', E('b', { text: signed(p.pred) + '%' })]);
    }))));
    main.appendChild(codeBox);

    /* sources, assumptions, outcome */
    var side = E('div', { class: 'gpv-side' });
    var chipBox = E('div', { class: 'gpv-chips', role: 'group', 'aria-label': 'Highlight the program lines by source' });
    var pinned = null, chips = {};
    function light(src) {
      root.classList.toggle('gpv-focus', !!src);
      lines.forEach(function (l) { l.classList.toggle('lit', !!src && l.getAttribute('data-src') === src); });
      Object.keys(chips).forEach(function (k) { chips[k].classList.toggle('lit', k === src); });
      yaml.classList.toggle('lit', src === 'A');
    }
    Object.keys(SRC).forEach(function (k) {
      var n = deep.program.filter(function (l) { return l.src === k; }).length;
      var b = E('button', { type: 'button', class: 'gpv-chip', 'data-src': k, 'aria-pressed': 'false' }, [
        E('span', { class: 'gpv-chip-k pc-' + k, text: k }),
        E('span', { class: 'gpv-chip-t' }, [E('b', { text: SRC[k].name }), E('span', { class: 'gpv-chip-r', text: SRC[k].role }), E('small', { text: SRC[k].desc })]),
        E('span', { class: 'gpv-chip-n', text: n + (n === 1 ? ' line' : ' lines') })
      ]);
      b.addEventListener('mouseenter', function () { light(k); });
      b.addEventListener('focus', function () { light(k); });
      b.addEventListener('mouseleave', function () { light(pinned); });
      b.addEventListener('blur', function () { light(pinned); });
      b.addEventListener('click', function () {
        pinned = pinned === k ? null : k;
        Object.keys(chips).forEach(function (j) { chips[j].setAttribute('aria-pressed', String(j === pinned)); });
        light(pinned || k);
      });
      chips[k] = b;
      chipBox.appendChild(b);
    });
    lines.forEach(function (l) {
      var s = l.getAttribute('data-src');
      if (!s) return;
      l.addEventListener('mouseenter', function () { light(s); });
      l.addEventListener('mouseleave', function () { light(pinned); });
    });
    side.appendChild(chipBox);
    var yaml = E('div', { class: 'gpv-yaml' });
    yaml.appendChild(E('div', { class: 'gpv-yaml-head' }, [E('b', { text: 'assume.yaml' }), E('span', { text: (deep.assumptions || []).length + ' declared assumptions' })]));
    (deep.assumptions || []).forEach(function (a) {
      yaml.appendChild(E('div', { class: 'gpv-a' }, [
        E('code', {}, [E('span', { class: 'gpv-a-n', text: a.name }), ': ', E('b', { text: a.value })]),
        E('p', { text: a.reason })
      ]));
    });
    side.appendChild(yaml);
    main.appendChild(side);

    /* prediction against the measured delivery */
    if (deep.prediction) {
      var out = E('div', { class: 'gpv-out' });
      out.appendChild(E('div', { class: 'gpv-out-head' }, [
        E('div', {}, [E('h4', { text: 'Predicted vs. measured' }), E('p', { class: 'cap', text: 'vLLM 4696, structured attempt 3: one deployment on the scoring node. Change in mean latency.' })]),
        E('div', { class: 'gpv-leg', 'aria-hidden': 'true' }, [E('span', {}, [E('i', { class: 'p' }), 'predicted']), E('span', {}, [E('i', { class: 'm' }), 'measured'])])
      ]));
      var MAXP = 60, rowsBox = E('div', { class: 'gpv-bars' });
      deep.prediction.forEach(function (p, i) {
        rowsBox.appendChild(E('div', { class: 'gpv-bar-row', role: 'img', 'aria-label': p.m + ': predicted ' + signed(p.pred) + '%, measured ' + signed(p.meas) + '%, absolute log error ' + p.err.toFixed(2) }, [
          E('span', { class: 'gpv-bar-m', text: p.m }),
          E('span', { class: 'gpv-bar-tracks' }, [
            E('span', { class: 'gpv-bar-t p', style: { '--w': (Math.abs(p.pred) / MAXP * 100) + '%', '--d': (i * 0.1) + 's' } }, [E('i', { class: 'g-grow' }), E('b', { text: signed(p.pred) + '%' })]),
            E('span', { class: 'gpv-bar-t m', style: { '--w': (Math.abs(p.meas) / MAXP * 100) + '%', '--d': (i * 0.1 + 0.05) + 's' } }, [E('i', { class: 'g-grow' }), E('b', { text: signed(p.meas) + '%' })])
          ]),
          E('span', { class: 'gpv-bar-e' }, [i ? null : E('small', { text: '|log| error' }), E('b', { text: p.err.toFixed(2) })])
        ]));
      });
      out.appendChild(rowsBox);
      if (deep.confidence) out.appendChild(E('p', { class: 'gpv-conf' }, [E('b', { text: 'Stated confidence: ' }), deep.confidence + '.']));
      root.appendChild(out);
      growIn(out);
    }

    /* corpus-level: what tracing all programs shows */
    var PV = D.provenance || { programs: 1000, traceable: 848, undeclaredShare: 58, zeroC: 21 };
    var nProg = PV.programs.toLocaleString('en-US');
    var facts = [
      { n: String(PV.traceable), of: '/ ' + nProg, p: PV.traceable / PV.programs * 100, t: 'submitted programs execute cleanly and return a traceable E2E prediction (10 analyses × 100 items)', k: 'ok' },
      { n: PV.undeclaredShare + '%', p: PV.undeclaredShare, t: 'of mean input sensitivity weight rests on undeclared literals: numbers declared as none of C, E or A', k: 'lit' },
      { n: PV.zeroC + '%', p: PV.zeroC, t: 'of traceable predictions have zero sensitivity to the profiles C', k: 'zc' }
    ];
    var corp = E('div', { class: 'gpv-corpus' });
    corp.appendChild(E('p', { class: 'gpv-corpus-k' }, ['Across all ' + nProg + ' programs · post-hoc AST provenance tracing']));
    var fr = E('div', { class: 'gpv-facts' });
    facts.forEach(function (f, i) {
      fr.appendChild(E('div', { class: 'gpv-fact gpv-' + f.k }, [
        E('div', { class: 'gpv-fact-n' }, [f.n, f.of ? E('small', { text: ' ' + f.of }) : null]),
        E('span', { class: 'gpv-fact-bar', 'aria-hidden': 'true' }, [E('i', { class: 'g-grow', style: { '--w': f.p + '%', '--d': (i * 0.12) + 's' } })]),
        E('p', { text: f.t })
      ]));
    });
    corp.appendChild(fr);
    root.appendChild(corp);
    growIn(corp);
    swap(m, root);
  });

  /* ------------------------------------------------------------------ 4. iterative: check, then refine */
  var ICON = {
    sens: 'M3 12h3l2.5-6 4 12 2.5-6H21',
    audit: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM15.5 15.5 20 20',
    code: 'm8.5 7-5 5 5 5M15.5 7l5 5-5 5'
  };
  function icon(d) { return S('svg', { viewBox: '0 0 24 24', class: 'gi-ico', 'aria-hidden': 'true' }, [S('path', { d: d })]); }
  run('iterative', function (m) {
    var AU = CASES.audit;
    if (!AU) return;
    var root = E('div', { class: 'gi' });
    var stage = E('div', { class: 'gi-stage' });
    root.appendChild(stage);
    var wires = S('svg', { class: 'gi-wires', 'aria-hidden': 'true' });
    stage.appendChild(wires);
    var N = {};
    function node(key, cls, kids, label) {
      N[key] = E('div', { class: 'gi-node ' + cls, 'data-n': key, role: label ? 'group' : null, 'aria-label': label || null }, kids);
      stage.appendChild(N[key]);
      return N[key];
    }
    node('an', 'gi-an', [E('b', { text: 'Analyzer' }), E('small', { class: 'mono', text: 'analysis.md' }), E('small', { class: 'mono', text: 'analysis.py' })]);
    var sens = E('div', { class: 'gi-check', 'data-n': 'sens' }, [icon(ICON.sens), E('div', {}, [E('b', { text: 'Sensitivity check' }), E('small', { text: 'stable under its inputs?' })])]);
    var audit = E('div', { class: 'gi-check', 'data-n': 'audit' }, [icon(ICON.audit), E('div', {}, [E('b', { text: 'Assumption audit' }), E('small', { text: 'does each assumption hold?' })])]);
    node('ck', 'gi-checks', [sens, audit], 'The two checks');
    node('cand', 'gi-cand', [E('b', { text: 'Candidates' }), E('small', { text: 'pick top pred. gain' })]);
    node('impl', 'gi-impl', [E('b', {}, [icon(ICON.code), 'Implement']), E('small', { text: 'build, measure once' })]);
    var tries = E('span', { class: 'gi-tries', 'aria-hidden': 'true' }, [E('i'), E('i'), E('i')]);
    node('fresh', 'gi-fresh', [E('b', { text: 'Fresh analyzer' }), E('small', { text: 'starts from the findings' }),
      E('small', { class: 'gi-narrow', text: 'refines up to ' + (AU.retries || 3) + ' times, back to the checks' }), tries]);

    /* the method figure's two example findings */
    var P = AU.perturbation;
    var trace = E('div', { class: 'gi-card', 'data-n': 'trace' }, [
      E('div', { class: 'gi-card-h' }, [E('b', { text: 'Perturbation trace' }), E('span', { class: 'gi-np', text: 'not passed' })]),
      E('div', { class: 'gi-trace' }, [
        E('table', { class: 'gi-tt' }, [
          E('thead', {}, [E('tr', {}, [E('th', { scope: 'col' }, [E('span', { class: 'sr-only', text: 'metric' })]), E('th', { scope: 'col', text: 'claim' }), E('th', { scope: 'col', text: 'leverage' })])]),
          E('tbody', {}, P.rows.map(function (r) { return E('tr', {}, [E('th', { scope: 'row', text: r[0] }), E('td', { text: r[1] }), E('td', { class: 'lev', text: r[2] })]); }))
        ]),
        E('div', { class: 'gi-ratio' }, [E('small', { text: 'max ratio' }), E('b', { text: P.maxRatio }), E('span', { text: '< ' + P.threshold })])
      ])
    ]);
    var q = esc(AU.finding).replace(/(host_overhead_fraction_removed=0\.17)/, '<code class="gi-q-a">$1</code>');
    var finding = E('div', { class: 'gi-card', 'data-n': 'finding' }, [
      E('div', { class: 'gi-card-h' }, [E('b', { text: 'Audit finding' }), E('span', { class: 'gi-np', text: 'not passed' })]),
      E('p', { class: 'gi-quote', html: '“' + q + '”' }),
      E('div', { class: 'gi-fix' }, [
        E('span', { class: 'gi-fix-v' }, [E('small', { text: 'claimed' }), E('b', { text: AU.claimed })]),
        E('span', { class: 'gi-fix-arrow', 'aria-hidden': 'true' }),
        E('span', { class: 'gi-fix-v gi-fix-c' }, [E('small', { text: 'corrected' }), E('b', { text: AU.corrected })]),
        E('span', { class: 'gi-fix-note', text: AU.rerun })
      ])
    ]);
    node('find', 'gi-find', [E('p', { class: 'gi-find-k' }, ['Stopped: what goes back to the analyzer ', E('span', { class: 'tag-note gi-ex', text: 'example from the method figure' })]), E('div', { class: 'gi-find-cards' }, [trace, finding])]);

    /* edges: [from, to, route per layout (wide, narrow), label] */
    var EDGES = [
      { a: 'an', b: 'ck', w: 'h', n: 'v' },
      { a: 'ck', b: 'cand', w: 'h', n: 'v', label: 'passed' },
      { a: 'cand', b: 'impl', w: 'h', n: 'v', label: 'winner' },
      { a: 'ck', b: 'trace', w: 'v', n: 'loopR', label: 'stopped' },
      { a: 'find', b: 'fresh', w: 'hl', n: 'v', label: 'feedback' },
      { a: 'fresh', b: 'an', w: 'vu', n: 'loopL', label: 'refine up to ' + (AU.retries || 3) + '×', pill: true }
    ];
    EDGES.forEach(function (e) {
      e.path = S('path', { class: 'gi-edge' });
      e.head = S('path', { class: 'gi-head' });
      wires.appendChild(e.path); wires.appendChild(e.head);
      if (e.label) { e.lab = E('span', { class: 'gi-lab' + (e.pill ? ' pill' : ''), 'aria-hidden': 'true', text: e.label }); stage.appendChild(e.lab); }
    });
    var token = E('span', { class: 'gi-token', 'aria-hidden': 'true' });
    stage.appendChild(token);

    function rect(el) {
      var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top, cx: (r.left + r.right) / 2 - s.left, cy: (r.top + r.bottom) / 2 - s.top };
    }
    function corner(pts, rad) {
      var d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 1; i < pts.length - 1; i++) {
        var p0 = pts[i - 1], p = pts[i], p1 = pts[i + 1];
        var r = Math.min(rad, Math.hypot(p[0] - p0[0], p[1] - p0[1]) / 2, Math.hypot(p1[0] - p[0], p1[1] - p[1]) / 2);
        var ax = p[0] + Math.sign(p0[0] - p[0]) * r, ay = p[1] + Math.sign(p0[1] - p[1]) * r;
        var bx = p[0] + Math.sign(p1[0] - p[0]) * r, by = p[1] + Math.sign(p1[1] - p[1]) * r;
        d += 'L' + ax + ' ' + ay + 'Q' + p[0] + ' ' + p[1] + ' ' + bx + ' ' + by;
      }
      var z = pts[pts.length - 1];
      return d + 'L' + z[0] + ' ' + z[1];
    }
    function route(kind, A, B, W) {
      var g = 7;
      if (kind === 'h') return [[A.r + 2, A.cy], [B.l - g, A.cy]];
      if (kind === 'v') { var x = Math.abs(A.cx - B.cx) < 40 ? A.cx : (A.l + A.r) / 2; return [[x, A.b + 2], [x, B.t - g]]; }
      if (kind === 'vu') return [[A.cx, A.t - 2], [A.cx, B.b + g]];
      if (kind === 'hl') return [[A.l - 2, B.cy], [B.r + g, B.cy]];
      if (kind === 'loopR') { var xr = W - 9; return [[A.r + 2, A.cy], [xr, A.cy], [xr, B.cy], [B.r + g, B.cy]]; }
      var xl = 9;
      return [[A.l - 2, A.cy], [xl, A.cy], [xl, B.cy], [B.l - g, B.cy]];
    }
    function arrow(pts) {
      var z = pts[pts.length - 1], y = pts[pts.length - 2], dx = Math.sign(z[0] - y[0]), dy = Math.sign(z[1] - y[1]);
      var tip = [z[0] + dx * 6.5, z[1] + dy * 6.5], px = -dy * 4.2, py = dx * 4.2;
      return 'M' + tip[0] + ' ' + tip[1] + 'L' + (z[0] + px) + ' ' + (z[1] + py) + 'L' + (z[0] - px) + ' ' + (z[1] - py) + 'Z';
    }
    var mode = '';
    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight;
      if (!W) return;
      mode = getComputedStyle(stage).getPropertyValue('--gi-mode').trim() || 'w';
      wires.setAttribute('viewBox', '0 0 ' + W + ' ' + H); wires.setAttribute('width', W); wires.setAttribute('height', H);
      EDGES.forEach(function (e) {
        var pts = route(e[mode] || e.w, rect(EL[e.a]), rect(EL[e.b]), W);
        e.pts = pts;
        e.path.setAttribute('d', corner(pts, 12));
        e.head.setAttribute('d', arrow(pts));
        e.len = e.path.getTotalLength();
        if (!e.lab) return;
        var kind = e[mode] || e.w, horiz = kind === 'h' || kind === 'hl';
        var loop = kind.indexOf('loop') === 0;
        e.lab.hidden = loop;
        if (loop) return;
        var mid = e.path.getPointAtLength(e.len / 2);
        e.lab.className = 'gi-lab' + (e.pill ? ' pill' : '') + (horiz ? ' h' : ' v');
        e.lab.style.transform = 'translate(' + mid.x.toFixed(1) + 'px,' + mid.y.toFixed(1) + 'px) ' +
          (e.pill ? 'translate(-50%, -50%)' : horiz ? 'translate(-50%, calc(-100% - 4px))' : 'translate(9px, -50%)');
      });
    }
    stage.appendChild(E('span', { class: 'tag-note gi-schem', text: 'schematic' }));

    /* the loop: a token walks analysis -> checks -> stopped -> feedback -> refine -> checks -> passed -> implement */
    var EL = { an: N.an, ck: N.ck, cand: N.cand, impl: N.impl, fresh: N.fresh, find: N.find, sens: sens, audit: audit, trace: trace, finding: finding };
    var STEPS = [
      { n: ['an'], d: 800 },
      { e: 0, d: 700 },
      { n: ['ck', 'sens'], d: 700, st: ['sens', 'stop'] },
      { n: ['ck', 'audit'], d: 700, st: ['audit', 'stop'] },
      { e: 3, d: 750 },
      { n: ['find', 'trace', 'finding'], d: 1700 },
      { e: 4, d: 800 },
      { n: ['fresh'], d: 800, retry: 1 },
      { e: 5, d: 750 },
      { n: ['an'], d: 500 },
      { e: 0, d: 700 },
      { n: ['ck', 'sens', 'audit'], d: 1000, st: ['both', 'pass'] },
      { e: 1, d: 700 },
      { n: ['cand'], d: 650 },
      { e: 2, d: 700 },
      { n: ['impl'], d: 1700 },
      { d: 900 }
    ];
    var TOTAL = STEPS.reduce(function (a, s) { return a + s.d; }, 0);
    function status(which, kind) {
      [sens, audit].forEach(function (c) {
        if (which === 'both' || c.getAttribute('data-n') === which) { c.classList.toggle('stop', kind === 'stop'); c.classList.toggle('pass', kind === 'pass'); }
      });
    }
    var cur = -1;
    function enter(i) {
      cur = i;
      var s = STEPS[i];
      stage.querySelectorAll('.on, .run').forEach(function (el) { el.classList.remove('on'); el.classList.remove('run'); });
      if (i === 0) {
        status('both', '');
        tries.querySelectorAll('i').forEach(function (t) { t.classList.remove('lit'); });
      }
      (s.n || []).forEach(function (k) { EL[k].classList.add('on'); });
      if (s.st) status(s.st[0], s.st[1]);
      if (s.retry) tries.children[s.retry - 1].classList.add('lit');
      var e = s.e != null ? EDGES[s.e] : null;
      if (e) { e.path.classList.add('run'); e.head.classList.add('run'); if (e.lab) e.lab.classList.add('run'); }
      token.classList.toggle('show', !!e);
    }
    var tAcc = 0, last = null, raf = null, seen = false;
    function frame(now) {
      if (last == null) last = now;
      tAcc = (tAcc + Math.min(50, now - last)) % TOTAL;
      last = now;
      var t = tAcc, i = 0;
      while (i < STEPS.length - 1 && t >= STEPS[i].d) { t -= STEPS[i].d; i++; }
      if (i !== cur) enter(i);
      var s = STEPS[i];
      if (s.e != null && EDGES[s.e].len) {
        var e = EDGES[s.e], pt = e.path.getPointAtLength(e.len * UI.easeInOut(Math.min(1, t / s.d)));
        token.style.transform = 'translate(' + pt.x.toFixed(1) + 'px,' + pt.y.toFixed(1) + 'px)';
      }
      raf = requestAnimationFrame(frame);
    }
    function settle() { stage.querySelectorAll('.on, .run').forEach(function (el) { el.classList.remove('on'); el.classList.remove('run'); }); token.classList.remove('show'); status('both', 'pass'); tries.children[0].classList.add('lit'); }
    function tick() {
      var go = seen && !document.hidden && !UI.reduced();
      if (go && !raf) { last = null; raf = requestAnimationFrame(frame); }
      else if (!go && raf) { cancelAnimationFrame(raf); raf = null; }
      if (UI.reduced()) { cur = -1; settle(); }
    }
    UI.watch(stage, function (v) { seen = v; tick(); }, '0px');
    document.addEventListener('visibilitychange', tick);
    UI.onReducedChange(tick);

    /* the numbers */
    var CK = D.checks || {};
    var stats = E('div', { class: 'gi-stats' });
    function geoBar(label, v, cls) {
      return E('div', { class: 'gi-geo ' + cls }, [E('span', { class: 'gi-geo-l', text: label }),
        E('span', { class: 'gi-geo-t', style: { '--w': ((v - 1) / 1 * 100).toFixed(1) + '%' } }, [E('i', { class: 'g-grow' }), E('b', { text: v.toFixed(2) + '×' })])]);
    }
    stats.appendChild(E('div', { class: 'gi-stat' }, [
      E('div', { class: 'gi-stat-n' }, [String(CK.stopped), E('small', { text: '%' })]),
      E('p', { text: 'of held-out candidates are stopped by the two checks. Delivered E2E speedup, geometric mean:' }),
      E('div', { class: 'gi-geos', role: 'img', 'aria-label': 'Stopped analyses deliver ' + CK.stoppedGeo + ' times, passed analyses ' + CK.passedGeo + ' times' }, [
        geoBar('stopped', CK.stoppedGeo, 'stop'), geoBar('passed', CK.passedGeo, 'pass'), E('span', { class: 'gi-geo-ax', 'aria-hidden': 'true' }, [E('em', { text: '1×' }), E('em', { text: '2×' })])
      ])
    ]));
    var CA = D.checkAblation || { post: { none: 77.3, audit: 79.0, sensitivity: 81.0, both: 82.7 }, pooled: { before: 73.7, after: 76.9 } };
    stats.appendChild(E('div', { class: 'gi-stat' }, [
      E('div', { class: 'gi-stat-n' }, [f1(CA.pooled.before), E('span', { class: 'gi-to', 'aria-hidden': 'true' }), E('span', { class: 'blue', text: f1(CA.pooled.after) })]),
      E('p', { text: 'pooled held-out E2E pick at K = 10 when a failed check’s findings go back to a fresh analyzer, before selection.' })
    ]));
    var ABL = [['No checks (structured + parallel)', CA.post.none, ''], ['Assumption audit alone', CA.post.audit, ''], ['Sensitivity check alone', CA.post.sensitivity, ''], ['Both checks (+ iterative)', CA.post.both, 'both']];
    var abl = E('div', { class: 'gi-abl', role: 'img', 'aria-label': 'Post-cutoff split, normalized E2E gain: ' + ABL.map(function (r) { return r[0] + ' ' + f1(r[1]); }).join(', ') });
    ABL.forEach(function (r) {
      abl.appendChild(E('div', { class: 'gi-abl-r ' + r[2] }, [E('span', { class: 'gi-abl-l', text: r[0] }),
        E('span', { class: 'gi-abl-t' }, [E('i', { style: { left: ((r[1] - 75) / 10 * 100) + '%' } }), E('b', { style: { left: ((r[1] - 75) / 10 * 100) + '%' }, text: f1(r[1]) })])]));
    });
    abl.appendChild(E('div', { class: 'gi-abl-r gi-abl-ax', 'aria-hidden': 'true' }, [E('span'), E('span', { class: 'gi-abl-t' }, [75, 80, 85].map(function (t) { return E('em', { style: { left: ((t - 75) / 10 * 100) + '%' }, text: String(t) }); }))]));
    stats.appendChild(E('div', { class: 'gi-stat gi-stat-abl' }, [E('p', { class: 'gi-stat-k', text: 'Post-cutoff split: both checks beat either alone' }), abl]));
    root.appendChild(stats);
    growIn(stats);

    /* the checks as pseudocode */
    var codeId = 'gi-code-' + Math.random().toString(36).slice(2, 7);
    var togLabel = E('span', { text: 'Show the two checks as pseudocode' });
    var tog = E('button', { type: 'button', class: 'gi-toggle', 'aria-expanded': 'false', 'aria-controls': codeId }, [icon(ICON.code), togLabel, E('i', { class: 'gi-chev', 'aria-hidden': 'true' })]);
    /* pseudocode: keywords and STOP/PASS outside strings, strings dimmed (a string may span lines), # comments */
    function codePanel(title, meta, lines) {
      var pre = E('pre'), inStr = false;
      var hl = function (t) { return esc(t).replace(/\b(for|in|if|else|return|and|with)\b/g, '<span class="kw">$1</span>').replace(/\b(STOP|PASS)\b/g, '<b class="gi-$1">$1</b>'); };
      lines.forEach(function (l) {
        var h = '', seg = '', k = 0;
        for (; k < l.length; k++) {
          var ch = l[k];
          if (!inStr && ch === '#') break;
          if (ch === '"') {
            h += inStr ? '<span class="str">' + esc(seg + ch) + '</span>' : hl(seg);
            seg = inStr ? '' : ch; inStr = !inStr;
            continue;
          }
          seg += ch;
        }
        h += inStr ? '<span class="str">' + esc(seg) + '</span>' : hl(seg);
        if (k < l.length) h += '<span class="cm">' + esc(l.slice(k)) + '</span>';
        pre.appendChild(E('span', { class: 'ln', html: h }));
      });
      return E('div', { class: 'code gi-codep' }, [E('div', { class: 'code-head' }, [E('span', { text: title }), E('span', { class: 'meta', text: meta })]), pre]);
    }
    var codeWrap = E('div', { class: 'gi-code', id: codeId, hidden: true }, [
      codePanel('Sensitivity check', 'perturb the inputs of analyze(C, E, A)', AU.sensitivityCode || []),
      codePanel('Assumption audit', 'a read-only agent session', AU.auditCode || [])
    ]);
    tog.addEventListener('click', function () {
      var open = codeWrap.hidden;
      codeWrap.hidden = !open;
      tog.setAttribute('aria-expanded', String(open));
      togLabel.textContent = open ? 'Hide the pseudocode' : 'Show the two checks as pseudocode';
    });
    root.appendChild(E('div', { class: 'gi-tog-row' }, [tog]));
    root.appendChild(codeWrap);

    swap(m, root);
    layout();
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    if (UI.reduced()) settle();
  });

  /* ------------------------------------------------------------------ 5. results: the main table, interactive */
  run('results', function (m) {
    var M = D.main, G = D.gemini;
    if (!M || !M.rows) return;
    var METRICS = M.metrics;
    var COLOR = { vanilla: 's-vanilla', ranker: 's-ranker', gap: 's-gap', gapPar: 's-gap', struct: 's-structured', structPar: 's-structured', iterative: 's-iterative' };
    var plus = function (l) { return l.charAt(0) === '+' ? 1 : 0; };
    var devBase = M.rows.filter(function (r) { return r.key !== 'ranker'; });
    var GKEY = ['vanilla', 'gap', 'gapPar', 'struct', 'structPar'];
    var VIEWS = {
      pre: { n: 35, rows: M.rows.map(function (r) { return { key: r.key, label: r.label, indent: r.indent, K: r.K, v: r.pre }; }) },
      post: { n: 35, rows: M.rows.map(function (r) { return { key: r.key, label: r.label, indent: r.indent, K: r.K, v: r.post }; }) },
      dev: { n: 30, rows: (M.dev || []).map(function (d, i) {
        var b = devBase[i] && devBase[i].label === d.label ? devBase[i] : { key: '', indent: plus(d.label), K: null };
        return { key: b.key, label: d.label, indent: b.indent, K: b.K, v: d.v };
      }) }
    };
    if (G) G.models.forEach(function (name, mi) {
      VIEWS['g' + mi] = { n: 35, gem: name, rows: G.rows.map(function (r, i) { return { key: GKEY[i], label: r.label, indent: plus(r.label), K: null, v: r.v[mi] }; }) };
    });
    var st = { agent: 'opus', split: 'post', model: 'g0', metric: 0 };

    var root = E('div', { class: 'gr' });
    var bar = E('div', { class: 'gr-bar' });
    var agentSeg = segmented({ label: 'Agent', value: 'opus', items: [{ key: 'opus', text: E('span', {}, ['Opus 5', E('span', { class: 'gr-long', text: ' · Claude Code' })]) }]
      .concat(G ? [{ key: 'gemini', text: E('span', {}, ['Gemini', E('span', { class: 'gr-long', text: ' · Antigravity CLI' })]) }] : []),
      onChange: function (k) { st.agent = k; sync(); draw(); } });
    var splitSeg = segmented({ label: 'Split', value: st.split, items: [
      { key: 'pre', text: E('span', {}, [E('span', { class: 'gr-long', text: 'Held-out ' }), 'pre-cutoff']) },
      { key: 'post', text: E('span', {}, [E('span', { class: 'gr-long', text: 'Held-out ' }), 'post-cutoff']) },
      { key: 'dev', text: E('span', {}, ['Dev', E('span', { class: 'gr-long', text: ' (tuning)' })]) }], onChange: function (k) { st.split = k; draw(); } });
    var modelSeg = G ? segmented({ label: 'Gemini model', value: 'g0', items: G.models.map(function (n, i) { return { key: 'g' + i, text: n }; }),
      onChange: function (k) { st.model = k; draw(); } }) : null;
    bar.appendChild(agentSeg.el);
    var right = E('div', { class: 'gr-right' }, [splitSeg.el, modelSeg ? modelSeg.el : null]);
    bar.appendChild(right);
    root.appendChild(bar);
    var scroller = E('div', { class: 'tbl-scroll gr-scroll' });
    var table = E('table', { class: 'tbl gr-tbl' });
    scroller.appendChild(table);
    root.appendChild(scroller);
    /* fade the right edge while more columns sit off screen (phones) */
    function edge() { scroller.classList.toggle('at-end', scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2); }
    scroller.addEventListener('scroll', edge, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(edge).observe(scroller); else window.addEventListener('resize', edge);
    var cap = E('p', { class: 'cap gr-cap' });
    root.appendChild(cap);

    function sync() {
      var gem = st.agent === 'gemini';
      splitSeg.el.hidden = gem;
      if (modelSeg) modelSeg.el.hidden = !gem;
      requestAnimationFrame(function () { splitSeg.place(); if (modelSeg) modelSeg.place(); });
    }
    function ranks(rows, j) {
      var vals = rows.map(function (r) { return r.v[j]; }).filter(function (v) { return v != null; });
      var uniq = vals.filter(function (v, i) { return vals.indexOf(v) === i; }).sort(function (a, b) { return b - a; });
      return { best: uniq[0], second: uniq[1], max: Math.max(100, uniq[0]) };
    }
    function draw() {
      var gem = st.agent === 'gemini';
      var view = VIEWS[gem ? st.model : st.split];
      var rows = view.rows, showK = !gem;
      var rk = METRICS.map(function (_, j) { return ranks(rows, j); });
      table.textContent = '';
      var dev = !gem && st.split === 'dev';
      table.appendChild(E('caption', { class: 'sr-only', text: 'Normalized gain in percent, ' + (gem ? view.gem + ', held-out post-cutoff' : dev ? 'dev split, used for tuning and not held out' : 'held-out ' + st.split + '-cutoff split') + '. 100 matches the expert.' }));
      var hr = E('tr', {}, [E('th', { scope: 'col', text: 'Setup' }), showK ? E('th', { scope: 'col', class: 'n gr-k', text: 'K' }) : null]);
      METRICS.forEach(function (name, j) {
        var b = E('button', { type: 'button', class: 'gr-mh', 'aria-pressed': String(j === st.metric), 'aria-label': 'Show bars for ' + name }, [name]);
        b.addEventListener('click', function () { st.metric = j; select(); });
        hr.appendChild(E('th', { scope: 'col', class: 'n gr-m', 'data-j': j }, [b]));
      });
      table.appendChild(E('thead', {}, [hr]));
      var tb = E('tbody');
      rows.forEach(function (r) {
        var tr = E('tr', { class: r.key === 'iterative' ? 'hl' : null, style: { '--c': 'var(--' + (COLOR[r.key] || 's-muted') + ')' } });
        tr.appendChild(E('th', { scope: 'row', class: 'gr-label' + (r.indent ? ' ind' + r.indent : '') }, [E('i', { class: 'gr-key', 'aria-hidden': 'true' }), r.label]));
        if (showK) tr.appendChild(E('td', { class: 'n gr-k', text: r.K == null ? '' : String(r.K) }));
        r.v.forEach(function (v, j) {
          var R = rk[j], cls = 'n gr-c' + (v === R.best ? ' best' : v === R.second ? ' second' : '');
          tr.appendChild(E('td', { class: cls, 'data-j': j }, [
            E('span', { class: 'gr-v', text: f1(v) }),
            E('span', { class: 'gr-mini', 'aria-hidden': 'true' }, [
              E('i', { style: { '--f': (Math.max(0, v) / R.max).toFixed(4) } }),
              E('u', { style: { left: (100 / R.max * 100).toFixed(2) + '%' } })
            ])
          ]));
        });
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      cap.innerHTML = '';
      cap.appendChild(document.createTextNode((gem ? view.gem + ' on the Antigravity CLI, held-out post-cutoff split' : dev ? 'Dev split' : 'Held-out ' + st.split + '-cutoff split') + ' (n = ' + view.n + '). '));
      if (dev) cap.appendChild(E('span', { class: 'gr-dev' }, [E('b', { text: 'Not held out: ' }),
        'prompts, handover rules and the check threshold τ = 0.01 were developed on this split before the held-out runs, so the paper reports it only in the appendix. ']));
      cap.appendChild(E('b', { text: 'Normalized gain in percent: 100 = the expert’s fix.' }));
      cap.appendChild(document.createTextNode(' Bold is best per column, underline second' + (showK ? '; K is the number of analyses (or patches) per item, with one final measurement' : '') + '. Click a metric for bars; the tick marks 100.'));
      requestAnimationFrame(function () { requestAnimationFrame(select); edge(); });
    }
    function select() {
      table.querySelectorAll('[data-j]').forEach(function (c) { c.classList.toggle('sel', +c.getAttribute('data-j') === st.metric); });
      table.querySelectorAll('.gr-mh').forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === st.metric)); });
    }
    sync();
    draw();
    swap(m, root);
    splitSeg.place();
  });

  /* ------------------------------------------------------------------ 6. k50: analysis-time scaling to K = 50 */
  /* an SVG layer over an LMSDCharts.line chart, redrawn whenever the chart re-renders: draw(geometry, layer) */
  function overlay(host, cls, draw) {
    var holder = host.lastElementChild, layer = S('svg', { class: 'g-ov ' + cls, 'aria-hidden': 'true' });
    function go() {
      var svg = holder.querySelector('svg[role="img"]'), hit = svg && svg.querySelector('rect.hit');
      if (!hit) return;
      if (holder.lastChild !== layer) holder.appendChild(layer);
      var g = { svg: svg, W: +svg.getAttribute('width'), H: +svg.getAttribute('height'), x: +hit.getAttribute('x'), y: +hit.getAttribute('y'), w: +hit.getAttribute('width'), h: +hit.getAttribute('height') };
      layer.setAttribute('viewBox', '0 0 ' + g.W + ' ' + g.H); layer.setAttribute('width', g.W); layer.setAttribute('height', g.H);
      layer.textContent = '';
      draw(g, layer);
    }
    if (holder && 'MutationObserver' in window) new MutationObserver(go).observe(holder, { childList: true });
    UI.onVisible(host, function () { setTimeout(function () { layer.classList.add('in'); }, UI.reduced() ? 0 : 1900); }, '0px 0px -15% 0px');
    return go;
  }
  run('k50', function (m) {
    var K5 = D.k50;
    if (!K5 || !window.LMSDCharts) return;
    var card = E('div', { class: 'gk' });
    card.appendChild(E('div', { class: 'gk-head' }, [
      E('h4', { text: 'Normalized gain of the pick, K = 1 to 50' }),
      E('p', { class: 'cap', text: 'Held-out post-cutoff split (n = 35), E2E. At each K: the first K analyses of a random permutation, one implemented and measured winner per item, averaged over three shuffles.' })
    ]));
    var host = E('div', { class: 'gk-chart' });
    card.appendChild(host);
    var X0 = 1, X1 = 50, Y0 = 58, Y1 = 106;
    LMSDCharts.line(host, {
      x: K5.K, xDomain: [X0, X1], xTicks: K5.K, yDomain: [Y0, Y1], yTicks: [60, 70, 80, 90, 100], height: 370,
      xTitle: 'analyses per item, K', yTitle: 'normalized gain (%)', margin: { r: 54 },
      refs: [{ y: 100, label: 'human fix' }],
      ariaLabel: 'Normalized gain against K up to 50: gap analysis with parallel selection reaches 99.6, structured 100.6, iterative 103.8; iterative crosses 100 at K = 40 with 101.9',
      tipTitle: function (x) { return 'K = ' + x; },
      series: [
        { key: 'gap', label: 'Gap analysis + parallel', color: 'var(--s-gap)', values: K5.gap },
        { key: 'structured', label: 'Structured + parallel', color: 'var(--s-structured)', values: K5.structured },
        { key: 'iterative', label: '+ iterative', color: 'var(--s-iterative)', values: K5.iterative }
      ]
    });
    var i40 = K5.K.indexOf(40), v40 = K5.iterative[i40], v50 = K5.iterative[K5.K.length - 1];
    overlay(host, 'gk-ov', function (g, layer) {
      if (i40 < 0 || !g.svg.querySelector('.series[data-key="iterative"]')) return;
      var xs = function (v) { return g.x + (v - X0) / (X1 - X0) * g.w; }, ys = function (v) { return g.y + g.h - (v - Y0) / (Y1 - Y0) * g.h; };
      var px = xs(40), py = ys(v40), narrow = g.W < 520;
      var lx = px - (narrow ? 10 : 18), ly = ys(104.4);
      layer.appendChild(S('circle', { class: 'gk-ring', cx: px, cy: py, r: 8 }));
      layer.appendChild(S('path', { class: 'gk-lead', d: 'M' + (px - 5) + ' ' + (py - 6) + 'L' + (lx + 2) + ' ' + (ly + 4) }));
      var t = S('text', { class: 'gk-note', x: lx, y: ly, 'text-anchor': 'end' });
      t.appendChild(S('tspan', { class: 'gk-note-b', text: f1(v40) + '%' }));
      t.appendChild(S('tspan', { text: narrow ? ' at K = 40' : ' at K = 40: past the human fix' }));
      layer.appendChild(t);
      var ex = xs(50), ey = ys(v50);
      layer.appendChild(S('circle', { class: 'gk-dot50', cx: ex, cy: ey, r: 5.5 }));
    });
    card.appendChild(E('div', { class: 'gk-foot' }, [
      E('span', {}, [E('b', { text: f1(v50) + '%' }), ' of the expert’s gain at K = 50 for iterative gap analysis']),
      E('span', {}, ['Unaudited selection converges near 100%: one over-claimed estimate can hijack a large pool.'])
    ]));
    swap(m, card);
  });
})();
