/* LMSysDojo project page: section 01, the environment. Four progressive enhancements inside #dojo: the normalized-gain
 * calculator, the census funnel with the temporal splits, the benchmark composition (small multiples drawn with
 * LMSDCharts) and the sealed sandbox. Numbers come from window.LMSD.dojo; the static markup stays as the fallback
 * for any piece that cannot run. Depends on site.js (LMSDUI) and charts.js (LMSDCharts). */
(function () {
  'use strict';
  var UI = window.LMSDUI, D = window.LMSD && window.LMSD.dojo;
  var sec = document.getElementById('dojo');
  if (!UI || !D || !sec) return;
  var E = UI.el, S = UI.svg;

  /* a frame loop that runs only while step() asks for more and the page is visible */
  function ticker(step) {
    var raf = 0, last = 0;
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (step(dt) && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    return function kick() { if (!raf) raf = requestAnimationFrame(frame); };
  }
  function pct(v) { return Math.round(v * 100); }

  /* ------------------------------------------------------------------ 1. normalized-gain calculator */
  var CAP = 3, PRESET = { a: 1.21, e: 1.35 };   /* Fig. 1: agent +21%, expert +35% -> 60% */

  function gainWidget(host) {
    var ids = { a: 'gw-agent', e: 'gw-expert' };
    function slider(key, label, min, value) {
      var input = E('input', { type: 'range', id: ids[key], min: min, max: 3, step: 0.01, value: value });
      var val = E('span', { class: 'gw-val' });
      var fill = E('i', { class: 'gw-fill' });
      var row = E('div', { class: 'gw-slider gw-' + key }, [
        E('div', { class: 'gw-slider-top' }, [E('label', { for: ids[key], text: label }), val]),
        E('div', { class: 'gw-track' }, [E('span', { class: 'gw-rail', 'aria-hidden': 'true' }, [fill]), input])
      ]);
      return { row: row, input: input, val: val, fill: fill };
    }
    var A = slider('a', 'Agent patch speedup', 1, PRESET.a);
    var X = slider('e', 'Expert fix speedup', 1.05, PRESET.e);

    var preset = E('button', { class: 'chip gw-preset', type: 'button', 'aria-pressed': 'true',
      'aria-label': 'Load the Figure 1 example: agent gain 21 percent, expert gain 35 percent' },
      [E('span', { class: 'gw-preset-k', text: 'Fig. 1' }), 'example']);
    var big = E('span', { class: 'gw-big-n', text: '60' });
    var eqA = E('b', { class: 'gw-eq-a' }), eqE = E('b', { class: 'gw-eq-e' }), eqR = E('b', { class: 'gw-eq-r' });
    var verdict = E('span', { class: 'gw-verdict-t' });
    var vdot = E('i', { class: 'gw-verdict-dot', 'aria-hidden': 'true' });
    var live = E('p', { class: 'sr-only', 'aria-live': 'polite' });

    var run = E('span', { class: 'gw-run' });
    var needleK = E('span', { class: 'gw-needle-k', text: 'agent' });
    var needle = E('span', { class: 'gw-needle-x' }, [E('span', { class: 'gw-needle' }, [needleK])]);
    var scale = E('div', { class: 'gw-scale', 'aria-hidden': 'true' }, [
      E('div', { class: 'gw-bar' }, [E('span', { class: 'gw-clip' }, [E('span', { class: 'gw-zone' }), run]), E('span', { class: 'gw-exp' }), needle]),
      E('div', { class: 'gw-marks' }, [
        E('span', { class: 'gw-m0', html: '<b>0%</b> 1× baseline' }),
        E('span', { class: 'gw-m1', html: '<b>100%</b> expert' }),
        E('span', { class: 'gw-mz', text: 'beats the expert' }),
        E('span', { class: 'gw-m3', html: '<b>300%</b> cap' })
      ])
    ]);

    host.textContent = '';
    host.classList.add('gw');
    host.appendChild(E('div', { class: 'gw-head' }, [E('span', { class: 'gw-kicker' }, [E('span', { class: 'gw-try', text: 'Try it · ' }), 'normalized gain']), preset]));
    host.appendChild(E('div', { class: 'gw-result' }, [
      E('div', { class: 'gw-big', 'aria-hidden': 'true' }, [big, E('span', { class: 'gw-big-u', text: '%' })]),
      E('div', { class: 'gw-side' }, [
        E('div', { class: 'gw-eq', 'aria-hidden': 'true' }, [eqA, E('span', { text: ' / ' }), eqE, E('span', { text: ' = ' }), eqR]),
        E('p', { class: 'gw-verdict' }, [vdot, verdict])
      ]),
      live
    ]));
    host.appendChild(E('div', { class: 'gw-sliders' }, [A.row, X.row,
      E('div', { class: 'gw-ruler', 'aria-hidden': 'true' }, ['1×', '1.5×', '2×', '2.5×', '3×'].map(function (t) { return E('span', { text: t }); }))
    ]));
    host.appendChild(scale);

    var shown = null, target = 0, barW = 0, liveT = 0, bar = scale.querySelector('.gw-bar');
    function measure() { barW = bar.clientWidth; if (shown !== null) paint(); }
    function read() { return { a: +(+A.input.value).toFixed(2), e: +(+X.input.value).toFixed(2) }; }
    function update() {
      var v = read(), g = (v.a - 1) / (v.e - 1), capped = g > CAP;
      target = Math.min(g, CAP);
      [[A, v.a], [X, v.e]].forEach(function (p) {
        p[0].val.innerHTML = '<b>' + p[1].toFixed(2) + '×</b><small>+' + pct(p[1] - 1) + '%</small>';
        p[0].fill.style.transform = 'scaleX(' + ((p[1] - 1) / 2).toFixed(4) + ')';
        p[0].input.setAttribute('aria-valuetext', p[1].toFixed(2) + ' times, a ' + pct(p[1] - 1) + ' percent gain');
      });
      eqA.textContent = '+' + pct(v.a - 1) + '%';
      eqE.textContent = '+' + pct(v.e - 1) + '%';
      eqR.textContent = capped ? g.toFixed(1) + ' → 3.00' : g.toFixed(2);
      var p = pct(target), state = capped ? 'cap' : p === 100 ? 'match' : p > 100 ? 'beat' : p === 0 ? 'zero' : 'below';
      verdict.textContent = { zero: 'No change', below: 'Below the expert', match: 'Matches the expert', beat: 'Beats the expert', cap: 'Beats the expert · capped at 3× its gain' }[state];
      host.setAttribute('data-state', state);
      clearTimeout(liveT);
      liveT = setTimeout(function () { live.textContent = 'Normalized gain ' + p + ' percent. ' + verdict.textContent + '.'; }, 450);
      preset.setAttribute('aria-pressed', String(v.a === PRESET.a && v.e === PRESET.e));
      if (shown === null || UI.reduced()) { shown = target; paint(); } else kick();
    }
    function paint() {
      big.textContent = String(pct(shown));
      run.style.transform = 'translateX(' + ((shown / CAP - 1) * 100).toFixed(3) + '%)';
      needle.style.transform = 'translateX(' + (shown / CAP * barW).toFixed(2) + 'px)';
      /* the label leans inward near the ends so it never leaves the card */
      needleK.style.transform = 'translateX(' + (-50 + (0.5 - shown / CAP) * 64).toFixed(2) + '%)';
    }
    var kick = ticker(function (dt) {
      shown += (target - shown) * (1 - Math.exp(-dt / 70));
      if (Math.abs(target - shown) < 0.0005) shown = target;
      paint();
      return shown !== target;
    });

    /* the preset glides the thumbs to the Fig. 1 values */
    var tween = 0;
    preset.addEventListener('click', function () {
      var from = read(), t0 = performance.now(), dur = 700;
      cancelAnimationFrame(tween);
      if (UI.reduced()) { A.input.value = PRESET.a; X.input.value = PRESET.e; update(); return; }
      (function step(now) {
        var k = UI.easeInOut(UI.clamp((now - t0) / dur));
        A.input.value = UI.lerp(from.a, PRESET.a, k).toFixed(2);
        X.input.value = UI.lerp(from.e, PRESET.e, k).toFixed(2);
        update();
        if (k < 1) tween = requestAnimationFrame(step);
      })(t0);
    });
    [A.input, X.input].forEach(function (inp) {
      inp.addEventListener('input', function () { cancelAnimationFrame(tween); update(); });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && shown !== target) kick(); });
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(bar);
    else window.addEventListener('resize', measure);
    update();
  }

  /* ------------------------------------------------------------------ 2. census funnel + temporal splits */
  /* count a number up from 0 after `delay` ms (final value at once under reduced motion) */
  function countTo(el, end, delay, dur) {
    if (UI.reduced()) { el.textContent = UI.fmt(end); return; }
    el.textContent = '0';
    setTimeout(function () {
      var t0 = performance.now();
      (function step(now) {
        var k = UI.clamp((now - t0) / (dur || 1300));
        el.textContent = UI.fmt(Math.round(end * UI.easeOut(k)));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }, delay);
  }
  var MONTH0 = 2024 * 12 + 2, MONTHS = 30;        /* the axis runs from 2024-03 through 2026-08 */
  function monthAt(ym) { var p = ym.split('-'); return (+p[0] * 12 + (+p[1] - 1) - MONTH0) / MONTHS * 100; }

  function funnel(host) {
    var stages = D.funnel, top = Math.log10(stages[0].total);
    var widths = stages.map(function (s) { return Math.log10(s.total) / top * 100; });
    var links = [
      { k: D.eligibleShare + '% eligible', t: 'documented, reconstructable optimizations' },
      { k: 'clean, with headroom', t: '≥ 100 requests under matching load; expert E2E above the ' + D.noiseFloor + '× noise floor; every post-cutoff qualifier plus a stratified sample of earlier ones' }
    ];
    var counts = [];
    var list = E('ol', { class: 'fn-stages' });
    stages.forEach(function (s, i) {
      var n = E('b', { class: 'fn-n', text: UI.reduced() ? UI.fmt(s.total) : '0' });
      counts.push([n, s.total]);
      list.appendChild(E('li', { class: 'fn-stage', style: { '--i': i, '--w': widths[i].toFixed(2) + '%' } }, [
        E('div', { class: 'fn-meta' }, [n, E('span', { class: 'fn-l', text: ['merged PRs scanned', 'measured setups', 'items in LMSysDojo-100'][i] })]),
        E('div', { class: 'fn-col' }, [
          E('div', { class: 'fn-bar', role: 'img', 'aria-label': UI.fmt(s.total) + ' ' + s.label + ': vLLM ' + UI.fmt(s.vllm) + ', SGLang ' + UI.fmt(s.sglang) }, [
            E('span', { class: 'fn-seg fn-v', style: { flex: s.vllm + ' 1 0' } }),
            E('span', { class: 'fn-seg fn-s', style: { flex: s.sglang + ' 1 0' } })
          ]),
          E('div', { class: 'fn-split', 'aria-hidden': 'true' }, [
            E('span', { html: 'vLLM <b>' + UI.fmt(s.vllm) + '</b>' }),
            E('span', { html: 'SGLang <b>' + UI.fmt(s.sglang) + '</b>' })
          ])
        ])
      ]));
      if (i < stages.length - 1) {
        var a = (100 - widths[i]) / 2, b = (100 - widths[i + 1]) / 2;
        var poly = a + ',0 ' + (100 - a) + ',0 ' + (100 - b) + ',100 ' + b + ',100';
        list.appendChild(E('li', { class: 'fn-link', style: { '--i': i, '--mw': widths[i + 1].toFixed(2) + '%' }, 'aria-hidden': 'true' }, [
          E('div', { class: 'fn-meta' }, [E('b', { text: links[i].k }), E('span', { text: links[i].t })]),
          E('div', { class: 'fn-col' }, [S('svg', { class: 'fn-trap', viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, [
            S('polygon', { points: poly }),
            S('line', { x1: a, y1: 0, x2: b, y2: 100 }), S('line', { x1: 100 - a, y1: 0, x2: 100 - b, y2: 100 })
          ])])
        ]));
      }
    });

    /* the three splits on a merge-date axis */
    var cut = monthAt(D.cutoff.slice(0, 7));
    var colors = { dev: 'var(--ink-4)', pre: 'var(--blue-2)', post: 'var(--blue)' };
    var rows = D.splits.map(function (s, i) {
      var r = s.merged.split(' to '), x0 = monthAt(r[0]), x1 = monthAt(r[1]) + 100 / MONTHS;
      var eng = s.engines.split(' / ');
      return E('div', { class: 'tl-row', style: { '--i': i } }, [
        E('div', { class: 'tl-name' }, [E('b', { text: s.label }), E('span', { text: s.n + ' items · vLLM ' + eng[0] + ' · SGLang ' + eng[1] })]),
        E('div', { class: 'tl-lane' }, [
          E('span', { class: 'tl-bar', title: 'merged ' + s.merged, style: { left: x0 + '%', width: (x1 - x0) + '%', background: colors[s.key] } }),
          E('span', { class: 'sr-only', text: 'merged ' + s.merged })
        ]),
        E('div', { class: 'tl-geo' }, [E('b', { text: s.expertGeo.toFixed(2) + '×' })])
      ]);
    });
    var ticks = [['2024-03', 0], ['2025-01', monthAt('2025-01')], ['2026-01', monthAt('2026-01')], ['2026-08', 100]];
    var axis = E('div', { class: 'tl-row tl-axis', 'aria-hidden': 'true' }, [E('div'), E('div', { class: 'tl-lane' },
      ticks.map(function (t, i) { return E('span', { class: 'tl-tick' + (i === 2 ? ' tl-opt' : ''), style: { left: t[1] + '%' }, text: t[0] }); })), E('div')]);
    var splits = E('div', { class: 'tl', style: { '--cut': (cut / 100).toFixed(4) } }, [
      E('div', { class: 'tl-row tl-headrow' }, [
        E('div', { class: 'fn-kicker', text: 'Three splits · 100 items' }),
        E('div', { class: 'tl-lane' }, [E('span', { class: 'tl-cut-k', html: 'Opus 5 cutoff <b>' + D.cutoff + '</b>' })]),
        E('div', { class: 'tl-geo-h', text: 'expert E2E, geomean' })
      ]),
      E('div', { class: 'tl-body' }, rows.concat([axis, E('span', { class: 'tl-cut', 'aria-hidden': 'true' })]))
    ]);

    var wrap = E('div', { class: 'fn-wrap' }, [
      E('div', { class: 'fn-head' }, [
        E('span', { class: 'fn-kicker', text: 'Census funnel' }),
        E('span', { class: 'fn-key', 'aria-hidden': 'true' }, [E('i', { class: 'fn-v' }), 'vLLM', E('i', { class: 'fn-s' }), 'SGLang']),
        E('span', { class: 'fn-note', text: 'bar length on a log scale · split within each bar to scale' })
      ]),
      list, splits
    ]);
    host.textContent = '';
    host.appendChild(wrap);
    host.classList.add('fn-ready');
    function play() {
      host.classList.add('fn-in');
      counts.forEach(function (c, i) { countTo(c[0], c[1], i * 420, 1300); });
    }
    if (UI.reduced()) play(); else UI.onVisible(host, play, '0px 0px -18% 0px');
    window.addEventListener('beforeprint', function () { counts.forEach(function (c) { c[0].textContent = UI.fmt(c[1]); }); });
  }

  /* ------------------------------------------------------------------ 3. benchmark composition: small multiples */
  function composition(host) {
    var C = window.LMSDCharts;
    if (!C) return;
    var BLUE = 'var(--blue)', BLUE2 = 'var(--blue-2)', VIOLET = 'var(--violet)', INK = 'var(--block)', GRAY = 'var(--ink-4)';
    var ON = 'var(--on-block)';   /* slice labels: white on the light theme, near-black on the dark one */
    var FILL = 'var(--blue-fill)', ON_FILL = 'var(--on-blue)';   /* the blue slice carries small white numbers */
    function rows(list, color) {
      return list.map(function (r) { return { label: r[0], value: r[1], color: /^Other/.test(r[0]) ? GRAY : (color || BLUE) }; });
    }
    function card(to, span, title, cap, draw, mid) {
      var plot = E('div', { class: 'comp-plot' + (mid ? ' comp-mid' : '') });
      to.appendChild(E('figure', { class: 'chart-card comp-card comp-' + span }, [
        E('figcaption', { class: 'comp-cap' }, [E('h4', { text: title }), E('p', { class: 'cap', text: cap })]), plot
      ]));
      draw(plot);   /* charts inside the closed group draw when it opens: their ResizeObserver fires on the first real width */
    }
    function bars(list, domain, ticks, extra) {
      return function (plot) {
        C.hbar(plot, Object.assign({ rows: rows(list), domain: domain, ticks: ticks, labelWidth: 152, barH: 16, gap: 11, valuePad: 44,
          ariaLabel: list.map(function (r) { return r[0] + ' ' + r[1]; }).join(', ') }, extra || {}));
      };
    }
    function ring(list, colors, inks, title) {
      return function (plot) {
        C.donut(plot, { size: 164, thickness: 28, center: { big: '100', small: 'items' }, ariaLabel: title + ': ' + list.map(function (r) { return r[0] + ' ' + r[1]; }).join(', '),
          data: list.map(function (r, i) { return { label: r[0], value: r[1], color: colors[i], ink: inks[i] }; }) });
      };
    }
    /* four charts up front; the other four follow one disclosure button, so they come after it in reading order too */
    var grid = E('div', { class: 'comp-grid' });
    var more = E('div', { class: 'comp-grid comp-more', id: 'dojo-comp-more', hidden: true });
    var togT = E('span', { text: 'Show all 8' });
    var tog = E('button', { class: 'chip comp-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'dojo-comp-more', 'aria-describedby': 'dojo-comp-more-k' },
      [togT, E('i', { class: 'comp-chev', 'aria-hidden': 'true' })]);
    host.textContent = '';
    host.appendChild(E('div', { class: 'comp-head' }, [
      E('span', { class: 'fn-kicker', text: 'LMSysDojo-100 at a glance' }),
      E('span', { class: 'comp-note', text: 'counts are items out of 100' })
    ]));
    host.appendChild(grid);
    host.appendChild(E('div', { class: 'comp-more-row' }, [tog, E('span', { class: 'comp-more-k', id: 'dojo-comp-more-k', text: 'Model type, GPUs, model size, prompts' })]));
    host.appendChild(more);
    card(grid, 'c6', 'Subsystem', 'target subsystem of each item', bars(D.subsystem, [0, 15], [0, 5, 10, 15], { labelFixed: true }));
    card(grid, 'c6', 'Workload', 'serving workload of each item', bars(D.workload, [0, 33], [0, 10, 20, 30], { labelFixed: true }));
    card(grid, 'c4', 'Bound phase', 'bottleneck phase of each item',
      ring(D.boundPhase, [FILL, BLUE2, INK, VIOLET, GRAY], [ON_FILL, '#1E2024', ON, ON, 'var(--ink)'], 'Bound phase'), true);
    card(grid, 'c8', 'Expert headroom', 'geometric-mean speedup of the expert\'s fix, per metric',
      bars(D.headroom, [1, 2.05], [1, 1.25, 1.5, 1.75, 2], {
        labelWidth: 56, valuePad: 56, barH: 20, gap: 13, band: { x0: 1, x1: D.noiseFloor }, ref: { x: D.noiseFloor, label: 'noise floor ' + D.noiseFloor + '×' },
        tickFormat: function (v) { return v + '×'; }, valueFormat: function (v) { return v.toFixed(2) + '×'; }
      }), true);
    card(more, 'c3', 'Model type', 'exclusive: MoE VLMs count as VLM',
      ring(D.modelType, [FILL, BLUE2, VIOLET], [ON_FILL, '#1E2024', ON], 'Model type'), true);
    card(more, 'c3', 'GPUs', 'H100s per item', bars(D.gpus, [0, 88], [0, 40, 80], { labelWidth: 76, valuePad: 36 }), true);
    card(more, 'c3', 'Model size', 'parameters', bars(D.params, [0, 56], [0, 25, 50], { labelWidth: 76, valuePad: 36 }), true);
    card(more, 'c3', 'Prompts', 'prompt data of each item', bars(D.prompts, [0, 80], [0, 40, 80], { labelWidth: 96, valuePad: 36, labelFixed: true }), true);
    tog.addEventListener('click', function () {
      var open = tog.getAttribute('aria-expanded') !== 'true';
      tog.setAttribute('aria-expanded', String(open));
      togT.textContent = open ? 'Show fewer' : 'Show all 8';
      more.hidden = !open;
    });
  }

  /* ------------------------------------------------------------------ 4. the sealed sandbox */
  function glyph(kind) {
    var paths = {
      check: [S('path', { d: 'M5.2 9.2 7.6 11.6 12.8 6.4' })],
      seal: [S('path', { d: 'M5.8 9h6.4' })],
      lock: [S('rect', { x: 4.6, y: 10, width: 14.8, height: 10.6, rx: 3 }),
        S('path', { class: 'sb-shackle', d: 'M8 10V7.4a4 4 0 0 1 8 0V10' }), S('path', { d: 'M12 14.3v2.2' })]
    }[kind];
    var box = kind === 'lock' ? '0 0 24 24' : '0 0 18 18';
    return S('svg', { class: 'sb-g sb-g-' + kind, viewBox: box, 'aria-hidden': 'true' }, paths);
  }
  function sandbox(host) {
    var old = host.querySelectorAll('.grid2 > div');
    if (old.length < 2) return;
    function items(box) { return Array.prototype.map.call(box.querySelectorAll('li'), function (li) { return li.textContent.trim(); }); }
    function title(box) { var t = box.querySelector('.note-title'); return t ? t.textContent.trim() : ''; }
    function list(texts, kind) {
      return E('ul', { class: 'sb-list' }, texts.map(function (t, i) {
        return E('li', { style: { '--i': i } }, [glyph(kind), E('span', { text: t })]);
      }));
    }
    var open = E('div', { class: 'sb-panel sb-open' }, [
      E('div', { class: 'sb-top' }, [E('span', { class: 'note-title', text: title(old[0]) }), E('span', { class: 'sb-tag', text: 'agent' })]),
      list(items(old[0]), 'check')
    ]);
    var sealed = E('div', { class: 'sb-panel sb-sealed' }, [
      E('span', { class: 'sb-hatch', 'aria-hidden': 'true' }),
      E('div', { class: 'sb-top' }, [E('span', { class: 'note-title', text: title(old[1]) }), E('span', { class: 'sb-lock' }, [glyph('lock')])]),
      list(items(old[1]), 'seal')
    ]);
    host.textContent = '';
    host.appendChild(E('div', { class: 'sb-grid' }, [open, sealed]));
    host.classList.add('sb-ready');
    if (UI.reduced()) host.classList.add('sb-in');
    else UI.onVisible(host, function () { host.classList.add('sb-in'); }, '0px 0px -22% 0px');
  }

  [['gain-widget', gainWidget], ['funnel', funnel], ['composition', composition], ['sandbox', sandbox]].forEach(function (p) {
    var host = sec.querySelector('[data-mount="' + p[0] + '"]');
    if (!host) return;
    try { p[1](host); } catch (err) { /* keep the static fallback */ }
  });
})();
