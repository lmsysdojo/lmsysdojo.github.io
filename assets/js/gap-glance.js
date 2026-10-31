/* LMSysDojo project page: section 02, "At a glance" as an animation (data-mount="gap-glance").
 * The paper's Fig. 1 played left to right as one loop, in the figure's own panel language. (1) Four real serving setups
 * as playgrounds: each card's workload chart draws in, then Setup A is picked. (2) The analytical agent on that one
 * setup: three analyses fan out at once, each draws its chart and counts up a predicted gain, and only the highest
 * prediction goes on to the implementer. (3) The candidate mechanisms ranked by prediction: only Rank 1 is built and
 * measured while the others stay gray predictions, and the measured gain is compared with the human expert's fix through
 * the normalized gain. A token rides each arrow between the panels as a stage completes, and a caption under each
 * panel says what it is doing. Every value is Fig. 1's own illustrative example (predicted +28/+22/+18%, measured +21%,
 * expert +35%, 0.60); the parallel-K demo further down is the interactive version of the selection step.
 * One clock t drives a pure render(t), so reduced motion, ?reveal=all and print show the finished frame, and the loop
 * runs only while the figure is on screen. When the panels stack, the figure is taller than the screen, so the clock
 * follows the reader from panel to panel (advance()). Colours and layout live in gap-glance.css (tokens, so a theme
 * switch needs no redraw). The drawings follow asset/source/lmsys-triad; the static figure stays as the fallback if
 * anything fails. */
(function () {
  'use strict';
  var UI = window.LMSDUI;
  var sec = document.getElementById('gap');
  var host = sec && sec.querySelector('[data-mount="gap-glance"]');
  if (!UI || !host) return;
  var E = UI.el, S = UI.svg, seg = UI.seg, eo = UI.easeOut, eio = UI.easeInOut;
  var KIT = 'assets/img/kit/';

  try { build(); } catch (err) { if (window.console) console.warn('gap-glance:', err); }

  function build() {
    /* ---------------------------------------------------------------- Fig. 1's content */
    var SETUPS = [
      { k: 'A', engine: 'vllm', model: 'Llama', mark: 'meta', chart: 'histA', work: 'Request length distribution', comp: ['Scheduler', 'KV Cache', 'Attention'] },
      { k: 'B', engine: 'sgl', model: 'Qwen', mark: 'qwen', chart: 'burst', work: 'Arrival pattern (burst)', comp: ['Continuous batch', 'Paged attention', 'Speculative dec.'] },
      { k: 'C', engine: 'vllm', model: 'MoE', mark: 'moe', chart: 'histC', work: 'Multi-modal workload', comp: ['MoE routing', 'Load balancing', 'Expert parallel'] },
      { k: 'D', engine: 'sgl', model: 'Mamba', mark: 'mamba', chart: 'ramp', work: 'Long-context requests', comp: ['Prefill-decode', 'Chunked attention', 'Memory mgmt.'] }
    ];
    var ENGINE = { vllm: 'vLLM', sgl: 'SGLang' };
    var ANALYSES = [
      { chart: 'gap', gap: 'memory allocation gap', pred: 28 },
      { chart: 'bells', gap: 'redundant computation', pred: 22 },
      { chart: 'waves', gap: 'scheduling imbalance', pred: 18 }
    ];
    var MECHS = [
      { name: 'Better KV cache block allocation', why: 'reduce memory waste', pred: 28, meas: 21 },
      { name: 'Fused attention computation', why: 'reduce redundant work', pred: 22 },
      { name: 'Request batching / scheduling', why: 'improve load balance', pred: 18 }
    ];
    var EXPERT = { name: 'Asynchronous scheduling', why: 'eliminate CPU bottleneck', gain: 35 };
    var SCALE = 40;   /* Fig. 1's gain bars span 0-40%: the expert's +35% fills seven eighths of the track */
    /* bar heights measured from Fig. 1 (as in lmsys-triad): setup A's request lengths, setup C's two-hump workload and
       Analysis 1's histogram, whose two blue bars are the located gap */
    var HIST_A = [2, 6, 15, 28, 50, 73, 88, 100, 92, 86, 72, 58, 47, 35, 23, 15, 9, 5, 3];
    var HIST_C = [40, 90, 170, 247, 313, 317, 278, 191, 102, 60, 57, 89, 146, 195, 202, 168, 120, 65, 30];
    var ANALYSIS_1 = [56, 88, 78, 131, 250, 216, 120, 162, 94, 62, 41], GAP_BARS = [4, 5];

    /* ---------------------------------------------------------------- the clock, in seconds
       Panel 1 draws its setups and picks A; a token carries the setup to panel 2, whose analyses run at once, count up
       their predictions and send the best to the implementer; a token carries the patch to panel 3, where Rank 1 is
       measured, the expert's fix is shown and the normalized gain worked out. Then a hold, and every mark rewinds to
       its pending state before the next run. */
    var T = {
      cards: .15, cardGap: .28, pick: 2.9,
      tok1: 3.5, tok: .9,
      p2: 4.3, head: 4.35, fan: 4.75, ana: 5.4, anaChart: 5.55, label: 6.15, count: 6.45, countDur: 1.3,
      best: 8.3, conv: 8.75, run: 9.3, impl: 9.95,
      tok2: 10.45,
      p3: 11.35, rows: 11.45, rowGap: .22, measure: 12.95, notBuilt: 13.55,
      expert: 14.8, cmp: 15.85, formula: 16.15, result: 16.45,
      end: 17.8, hold: 4.4, reset: .8
    };
    var REWIND = T.end + T.hold, LOOP = REWIND + T.reset, STILL = T.end + .05;
    /* what each panel is doing: [from, text]; a panel shows its first line until its stage starts. The last line of
       each list sums up the whole panel for a still frame (reduced motion, ?reveal=all, print). */
    var CAPS = [
      [[0, 'Real serving setups, each rebuilt from a merged vLLM or SGLang PR: engine, model, components and workload.'],
        [T.pick, 'One setup is picked for this run: <b>Setup A</b>, vLLM serving Llama.'],
        [Infinity, 'Real serving setups, each rebuilt from a merged vLLM or SGLang PR. <b>Setup A</b> is picked for the run.']],
      [[0, 'Next: gap analysis on the picked setup.'],
        [T.p2, 'Three analyzers work on Setup A <b>in parallel</b>. Each locates a gap, proposes a mechanism and predicts its gain.'],
        [T.best, 'Only the highest prediction, <b>+28%</b> from Analysis 1, is implemented.'],
        [Infinity, 'Three analyzers work on Setup A <b>in parallel</b>; only the highest prediction, <b>+28%</b>, is implemented.']],
      [[0, 'Next: the ranked candidates and the score.'],
        [T.p3, 'The proposed mechanisms, ranked by predicted gain (gray).'],
        [T.measure, 'Only Rank 1 is built and measured: <b>+21%</b>. Ranks 2 and 3 are never built.'],
        [T.expert, 'The human expert’s fix on the same setup gains <b>+35%</b>.'],
        [T.result, 'Scored against the expert’s fix: 21% / 35% = <b>0.60</b>.'],
        [Infinity, 'Only Rank 1 is built and measured: <b>+21%</b>. Against the expert’s fix that is 21% / 35% = <b>0.60</b>.']]
    ];

    /* ---------------------------------------------------------------- helpers */
    function f2(x) { return Math.round(x * 100) / 100; }
    function f3(x) { return Math.round(x * 1000) / 1000; }
    /* write a style property or custom property only when it changes (most marks hold still most of the time) */
    function put(el, prop, v) {
      var c = el.__gg || (el.__gg = {});
      v = String(v);
      if (c[prop] === v) return;
      c[prop] = v;
      el.style.setProperty(prop, v);
    }
    function say(el, s) { if (el.__ggs !== s) { el.__ggs = s; el.textContent = s; } }
    function attr(el, k, v) { v = String(v); if (el.getAttribute(k) !== v) el.setAttribute(k, v); }
    function rng(seed) { var s = seed; return function () { return (s = (s * 16807) % 2147483647) / 2147483647; }; }
    function line(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1]); }).join(''); }

    /* ---------------------------------------------------------------- mini charts in Fig. 1's style
       Light-blue marks over a dark baseline, drawn in a 100 x 40 box stretched to the card; lines keep their width.
       Bar charts grow bar by bar; line and area charts are revealed left to right through their wrapper's clip. */
    function chartBox(cls) {
      var svg = S('svg', { viewBox: '0 0 100 40', preserveAspectRatio: 'none', focusable: 'false' });
      var inner = E('div', { class: 'gg-ch-in' }, [svg]);
      return { box: E('div', { class: 'gg-ch' + (cls ? ' ' + cls : '') }, [inner]), svg: svg, inner: inner };
    }
    /* the outer bars are flush with the baseline's ends, as in Fig. 1 */
    function bars(c, vals, hi, gapFrac) {
      var n = vals.length, pitch = 100 / (n - gapFrac), bw = pitch * (1 - gapFrac), mx = Math.max.apply(null, vals);
      var out = { bars: [], hi: [] };
      vals.forEach(function (v, i) {
        var h = 40 * v / mx, at = { x: f2(i * pitch), y: f2(40 - h), width: f2(bw), height: f2(h) };
        var g = S('g', { class: 'gg-bg' }, [S('rect', Object.assign({ class: 'gg-b' }, at))]);
        if (hi && hi.indexOf(i) >= 0) { var b = S('rect', Object.assign({ class: 'gg-b gg-b-hi' }, at)); g.appendChild(b); out.hi.push(b); }
        c.svg.appendChild(g);
        out.bars.push(g);
      });
      return out;
    }
    function stroke(c, pts, cls) { c.svg.appendChild(S('path', { class: 'gg-ln' + (cls ? ' ' + cls : ''), d: line(pts), 'vector-effect': 'non-scaling-stroke' })); }
    /* an area chart from samples in [0, 1]: light fill and a blue line on top */
    function area(c, vals) {
      var n = vals.length, pts = vals.map(function (v, i) { return [100 * i / (n - 1), 40 - 40 * v]; });
      c.svg.appendChild(S('path', { class: 'gg-area', d: line(pts) + 'L100 40L0 40Z' }));
      stroke(c, pts);
    }
    /* setup B: three bursts of arrivals, each a sharp spike and a smaller one after it */
    function burst() {
      var r = rng(7), out = [], P = [[.13, .84], [.205, .5], [.44, .8], [.505, .45], [.73, .84], [.855, .56]];
      for (var i = 0; i < 140; i++) {
        var t = i / 139, v = .09 + .035 * (r() - .5);
        for (var j = 0; j < P.length; j++) v += P[j][1] / (1 + Math.pow((t - P[j][0]) / .012, 2));
        out.push(Math.min(.95, v));
      }
      return out;
    }
    /* setup D: request lengths that keep growing, with Fig. 1's small steps */
    function ramp() {
      var out = [];
      for (var i = 0; i < 72; i++) { var t = i / 71; out.push(.07 + .84 * Math.pow(t, 1.6) + .022 * Math.sin(2 * Math.PI * 13 * t)); }
      return out;
    }
    /* Analysis 2: two overlapping bells (the same work, done twice) */
    function bells(c) {
      function g(m, s) { var pts = []; for (var i = 0; i <= 48; i++) { var t = i / 48; pts.push([100 * t, 40 - 37 * Math.exp(-Math.pow((t - m) / s, 2))]); } return pts; }
      var a = g(.36, .16), b = g(.62, .16);
      c.svg.appendChild(S('path', { class: 'gg-bell', d: line(a) + 'L100 40L0 40Z' }));
      c.svg.appendChild(S('path', { class: 'gg-bell gg-bell-2', d: line(b) + 'L100 40L0 40Z' }));
      stroke(c, a); stroke(c, b, 'gg-ln-2');
    }
    /* Analysis 3: two pairs of jittery waves out of phase (scheduling imbalance), no baseline */
    function waves(c) {
      var r = rng(5);
      [[0, .3, 'gg-ln-lt'], [.5, .3, ''], [.25, .7, 'gg-ln-lt'], [.75, .7, '']].forEach(function (w) {
        var pts = [];
        for (var i = 0; i <= 40; i++) { var t = i / 40; pts.push([100 * t, 40 * (w[1] - .17 * Math.sin(2 * Math.PI * (1.6 * t + w[0])) + .05 * (r() - .5))]); }
        stroke(c, pts, w[2]);
      });
    }

    /* ---------------------------------------------------------------- marks: engine logos, served-model marks */
    /* the engine logos are the kit images; their black and gray ink is a mask filled from the theme (gap-glance.css) */
    function engineLogo(k) { return E('i', { class: 'gg-eng gg-' + k }); }
    function modelMark(k) {
      if (k === 'meta' || k === 'qwen') return E('img', { class: 'gg-mark gg-mark-' + k, src: KIT + k + '.svg', alt: '', width: 24, height: 24, decoding: 'async' });
      var g;
      if (k === 'moe') {
        /* MoE (Fig. 1, setup C): a router fanning out to four stacked experts, two of them active */
        g = S('svg', { class: 'gg-mark gg-mark-moe', viewBox: '0 0 187 160' });
        [0, 40, 80, 120].forEach(function (t, i) { g.appendChild(S('line', { class: i % 2 ? 'gg-moe-off' : 'gg-moe-on', x1: 27, y1: 80, x2: 128, y2: t + 20 })); });
        [0, 40, 80, 120].forEach(function (t, i) {
          g.appendChild(i % 2 ? S('rect', { class: 'gg-moe-idle', x: 127, y: t + 4, width: 56, height: 32, rx: 10 }) : S('rect', { class: 'gg-mk', x: 123, y: t, width: 64, height: 40, rx: 13 }));
        });
        g.appendChild(S('circle', { class: 'gg-mk', cx: 27, cy: 80, r: 27 }));
        return g;
      }
      /* Mamba (Fig. 1, setup D): a blue snake with an eye */
      g = S('svg', { class: 'gg-mark gg-mark-mamba', viewBox: '0 0 181 73' });
      g.appendChild(S('path', { class: 'gg-mamba', d: 'M3 36C7 27 10 22.5 16 22.5C28 22.5 35 62.5 46 62.5C58 62.5 65 17.5 77 17.5C89 17.5 96 63.5 108 63.5C119 63.5 123 38 140 27' }));
      g.appendChild(S('ellipse', { class: 'gg-mk', cx: 158, cy: 22, rx: 23, ry: 20.5 }));
      g.appendChild(S('circle', { class: 'gg-eye', cx: 166.5, cy: 14, r: 6.3 }));
      return g;
    }
    function ring() { return E('span', { class: 'gg-ring' }); }
    function caps(list) {
      var box = E('div', { class: 'gg-cap' });
      return { box: box, items: list.map(function (c) { var p = E('p', { html: c[1] }); box.appendChild(p); return { at: c[0], el: p }; }), on: null };
    }
    function panel(n, cls, title, kids, cap) {
      return E('div', { class: 'gg-panel ' + cls }, [E('p', { class: 'gg-ph' }, [E('span', { class: 'nb', text: String(n) }), E('span', { html: title })])].concat(kids, [cap.box]));
    }

    /* ---------------------------------------------------------------- panel 1: diverse real-world setups */
    var setups = SETUPS.map(function (s) {
      var c = chartBox(), d = { k: s.k };
      if (s.chart === 'histA' || s.chart === 'histC') d.bars = bars(c, s.chart === 'histA' ? HIST_A : HIST_C, null, .2).bars;
      else { area(c, s.chart === 'burst' ? burst() : ramp()); d.wipe = c.inner; }
      d.items = s.comp.concat(['…']).map(function (x, j) { return E('li', { class: j === 3 ? 'gg-etc' : null, text: x }); });
      d.el = E('div', { class: 'gg-setup', 'data-k': s.k }, [
        ring(),
        s.k === 'A' ? E('span', { class: 'gg-tab', text: 'selected setup' }) : null,
        E('div', { class: 'gg-sh' }, [
          E('p', { class: 'gg-st' }, ['Setup ', E('b', { text: s.k }), ': ' + ENGINE[s.engine] + ' + ' + s.model]),
          E('span', { class: 'gg-logos' }, [engineLogo(s.engine), modelMark(s.mark)])]),
        E('div', { class: 'gg-wl' }, [c.box, E('p', { class: 'gg-wl-k', text: s.work })]),
        E('ul', { class: 'gg-comp' }, d.items)
      ]);
      return d;
    });
    /* Fig. 1's '• • •': these four are examples, not the whole set */
    var more = E('p', { class: 'gg-more', text: '• • •' });
    var cap1 = caps(CAPS[0]);
    var p1 = panel(1, 'gg-p1', 'Diverse real-world setups as playgrounds', [E('div', { class: 'gg-setups' }, setups.map(function (d) { return d.el; })), more], cap1);

    /* ---------------------------------------------------------------- panel 2: the analytical agent on one setup */
    var agent = E('div', { class: 'gg-agent' }, [
      E('i', { class: 'gg-head' }),
      E('div', null, [
        E('p', { class: 'gg-agent-h' }, ['Gap analysis ', E('em', { text: '(parallel)' })]),
        E('p', { class: 'gg-agent-s', text: 'analyze the setup and generate promising optimization candidates in parallel' })
      ])
    ]);
    var anas = ANALYSES.map(function (a, i) {
      var c = chartBox(a.chart === 'waves' ? 'gg-ch-free' : ''), d = { pred: a.pred };
      if (a.chart === 'gap') { var b = bars(c, ANALYSIS_1, GAP_BARS, .22); d.bars = b.bars; d.hi = b.hi; }
      else { (a.chart === 'bells' ? bells : waves)(c); d.wipe = c.inner; }
      d.num = E('b', { text: '–' });
      d.label = E('p', { class: 'gg-ana-l', text: 'e.g., ' + a.gap });
      d.el = E('div', { class: 'gg-ana', 'data-i': i + 1 }, [
        ring(),
        E('p', { class: 'gg-ana-h' }, ['Analysis', E('span', { class: 'nb', text: String(i + 1) })]),
        c.box, d.label,
        E('p', { class: 'gg-gain' }, [E('span', { text: 'pred. gain' }), d.num])
      ]);
      return d;
    });
    /* the fan-out above the analyses and the merge below them: drawn in pixels once the cards are laid out */
    var fan = S('svg', { class: 'gg-fan', focusable: 'false' }), conv = S('svg', { class: 'gg-conv', focusable: 'false' });
    var W = { fan: [], fanHeads: [], conv: [], convHead: null, run: null, dot: null, len: 0, ok: false };
    [0, 1, 2].forEach(function () {
      W.fan.push(fan.appendChild(S('path', { class: 'gg-wire', pathLength: 1 })));
      W.fanHeads.push(fan.appendChild(S('polygon', { class: 'gg-wire-head' })));
      W.conv.push(conv.appendChild(S('path', { class: 'gg-wire', pathLength: 1 })));
    });
    W.convHead = conv.appendChild(S('polygon', { class: 'gg-wire-head' }));
    W.run = conv.appendChild(S('path', { class: 'gg-wire gg-run', pathLength: 1 }));
    W.dot = conv.appendChild(S('circle', { class: 'gg-dot', r: 4.5, cx: -20, cy: -20 }));
    var implRing = E('span', { class: 'gg-impl-ring' });
    var impl = E('div', { class: 'gg-impl' }, [implRing, E('span', { class: 'gg-code', text: '</>' }),
      E('span', { class: 'gg-impl-t' }, [E('b', { text: 'Implement' }), E('small', { text: 'implement the best candidate' })])]);
    var anaRow = E('div', { class: 'gg-anas' }, anas.map(function (d) { return d.el; }));
    var cap2 = caps(CAPS[1]);
    var p2 = panel(2, 'gg-p2', 'Analytical agent on <em>one setup</em>', [agent, fan, anaRow, conv, impl], cap2);

    /* ---------------------------------------------------------------- panel 3: candidate mechanisms and the score */
    function gainRow(cls, rank, m, fills, val) {
      return E('div', { class: 'gg-row' + (cls ? ' ' + cls : '') }, [ring(), rank,
        E('span', { class: 'gg-mech' }, [E('b', { text: m.name }), E('i', { text: '(' + m.why + ')' })]),
        E('span', { class: 'gg-track' }, fills), val]);
    }
    var rows = MECHS.map(function (m, j) {
      var d = { m: m };
      d.pred = E('i', { class: 'gg-fill gg-fill-pred' });
      d.meas = m.meas ? E('i', { class: 'gg-fill gg-fill-meas' }) : null;
      d.val = E('span', { class: 'gg-val' + (m.meas ? '' : ' gg-val-nb'), text: m.meas ? '' : 'not built' });
      d.el = gainRow('', E('span', { class: 'gg-rank' }, ['Rank', E('span', { class: 'nb' + (j ? ' gray' : ''), text: String(j + 1) })]), m, [d.pred, d.meas], d.val);
      d.el.setAttribute('data-r', j + 1);
      return d;
    });
    var ex = { bar: E('i', { class: 'gg-fill gg-fill-exp' }), val: E('span', { class: 'gg-val gg-val-exp' }) };
    ex.el = gainRow('gg-expert', E('span', { class: 'gg-rank gg-who', html: 'Human<br>Expert' }), EXPERT, [ex.bar], ex.val);
    var fLine1 = E('p', { class: 'gg-f1' }, ['normalized gain = ', E('span', { class: 'gg-fb', text: 'agent gain / expert gain' })]);
    var fLine2 = E('p', { class: 'gg-f2' }, ['e.g., 21% / 35% = ', E('b', { text: '0.60 (60%)' })]);
    var cmpA = E('div', { class: 'gg-cmp-a' }, [E('i', { class: 'gg-cmp-line' }), E('em', { text: 'Compare' })]);
    var formula = E('div', { class: 'gg-formula' }, [fLine1, fLine2]);
    var cols = E('p', { class: 'gg-cols' }, [E('span', { text: 'Mechanism (fixing a gap)' }), E('span', { text: 'Evaluated gain' })]);
    var legend = E('p', { class: 'gg-legend' }, [
      E('span', null, [E('i', { class: 'gg-lg-pred' }), 'predicted']), E('span', null, [E('i', { class: 'gg-lg-meas' }), 'measured']),
      E('span', null, [E('i', { class: 'gg-lg-exp' }), 'expert’s fix'])]);
    var cap3 = caps(CAPS[2]);
    var p3 = panel(3, 'gg-p3', 'Candidate mechanisms', [E('div', { class: 'gg-board' }, [
      cols, E('div', { class: 'gg-rows' }, rows.map(function (d) { return d.el; })),
      E('div', { class: 'gg-cmp' }, [cmpA, formula]),
      ex.el, legend])], cap3);

    /* ---------------------------------------------------------------- the arrows between the panels, with their tokens */
    function token(kind) {
      var s = S('svg', { viewBox: '0 0 22 22', focusable: 'false' }, [S('rect', { class: 'gg-tok-bg', x: 0, y: 0, width: 22, height: 22, rx: 6 })]);
      if (kind === 'setup') [[5.6, 9], [9.7, 5], [13.8, 7]].forEach(function (b) { s.appendChild(S('rect', { class: 'gg-tok-ink', x: b[0], y: 16 - b[1], width: 2.8, height: b[1], rx: .6 })); });
      else s.appendChild(S('path', { class: 'gg-tok-code', d: 'M7.6 7 4.6 11l3 4M14.4 7l3 4-3 4M12.1 5.6 9.9 16.4' }));
      return E('i', { class: 'gg-tok gg-tok-' + kind }, [s]);
    }
    var tok1 = token('setup'), tok2 = token('patch');
    var a1 = E('div', { class: 'gg-arrow' }, [E('i', { class: 'gg-shaft' }), tok1]);
    var a2 = E('div', { class: 'gg-arrow' }, [E('i', { class: 'gg-shaft' }), tok2]);

    /* ---------------------------------------------------------------- frame, controls and the text alternative */
    var playBtn = E('button', { type: 'button', class: 'gg-play', 'aria-label': 'Pause animation',
      html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-pause" d="M5 3.5v9M11 3.5v9"/><path class="i-play" d="M5.5 3.2v9.6L12.8 8z"/></svg>' });
    var stage = E('div', { class: 'gg-stage', 'aria-hidden': 'true' }, [p1, a1, p2, a2, p3]);
    var alt = E('div', { class: 'sr-only' }, [
      E('p', { text: 'Animated version of the figure, with the illustrative values printed in it.' }),
      E('ol', null, [
        E('li', { text: 'Diverse real-world setups as playgrounds, shown with four example setups: ' + SETUPS.map(function (s) {
          return 'Setup ' + s.k + ', ' + ENGINE[s.engine] + ' serving ' + s.model + ' (' + s.comp.join(', ') + '; ' + s.work.toLowerCase() + ')';
        }).join('; ') + '. Setup A is selected.' }),
        E('li', { text: 'Analytical agent on one setup: gap analysis runs three analyses of Setup A in parallel. ' + ANALYSES.map(function (a, i) {
          return 'Analysis ' + (i + 1) + ', for example a ' + a.gap + ', predicts a +' + a.pred + '% gain';
        }).join('; ') + '. Only the best candidate, +28%, is implemented.' }),
        E('li', { text: 'Candidate mechanisms, ranked by predicted gain: ' + MECHS.map(function (m, j) {
          return (j + 1) + ', ' + m.name + ' (' + m.why + '), ' + (m.meas ? 'built and measured at +' + m.meas + '%' : 'never built');
        }).join('; ') + '. The human expert’s fix, ' + EXPERT.name.toLowerCase() + ' (' + EXPERT.why + '), gains +' + EXPERT.gain +
          '%. Normalized gain = agent gain / expert gain, for example 21% / 35% = 0.60 (60%).' })
      ])
    ]);
    var root = E('div', { class: 'gg-root' }, [
      E('div', { class: 'gg-top' }, [E('p', { class: 'gg-title' }, [E('span', { class: 'tag-note', text: 'illustrative' }), E('span', { text: 'One run, from setup to score' })]), playBtn]),
      stage, alt
    ]);

    /* ---------------------------------------------------------------- wires in panel 2 (pixel geometry) */
    var HL = 7, HW = 4.6;
    /* from (xa, ya) down to the bar at yb, across to xb, and down to yEnd, with Fig. 1's rounded elbows */
    function elbow(xa, ya, xb, yb, yEnd) {
      var dx = xb - xa, s = dx > 0 ? 1 : -1, r = Math.min(8, Math.abs(dx) / 2, (yb - ya) * .9, (yEnd - yb) * .9);
      if (Math.abs(dx) < 1) return 'M' + f2(xa) + ' ' + f2(ya) + 'V' + f2(yEnd);
      return 'M' + f2(xa) + ' ' + f2(ya) + 'V' + f2(yb - r) + 'Q' + f2(xa) + ' ' + f2(yb) + ' ' + f2(xa + s * r) + ' ' + f2(yb) +
        'H' + f2(xb - s * r) + 'Q' + f2(xb) + ' ' + f2(yb) + ' ' + f2(xb) + ' ' + f2(yb + r) + 'V' + f2(yEnd);
    }
    function head(x, tip) { return [[x, tip], [x - HW, tip - HL], [x, tip - HL + 2], [x + HW, tip - HL]].map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' '); }
    function layoutWires() {
      var fr = fan.getBoundingClientRect(), cr = conv.getBoundingClientRect();
      if (!fr.width || !fr.height || !cr.height) return false;
      var xs = anas.map(function (a) { var r = a.el.getBoundingClientRect(); return r.left + r.width / 2 - fr.left; });
      var x0 = xs[1], H = fr.height, tip = H - 2, end = tip - HL + 1;
      fan.setAttribute('viewBox', '0 0 ' + f2(fr.width) + ' ' + f2(H));
      xs.forEach(function (x, i) {
        attr(W.fan[i], 'd', elbow(x0, 0, x, H * .42, end));
        attr(W.fanHeads[i], 'points', head(x, tip));
      });
      H = cr.height; tip = H - 2; end = tip - HL + 1;
      conv.setAttribute('viewBox', '0 0 ' + f2(cr.width) + ' ' + f2(H));
      xs.forEach(function (x, i) { attr(W.conv[i], 'd', elbow(x, 0, x0, H * .55, end)); });
      attr(W.convHead, 'points', head(x0, tip));
      attr(W.run, 'd', elbow(xs[0], 0, x0, H * .55, end));
      W.len = W.run.getTotalLength();
      W.ok = true;
      return true;
    }

    /* ---------------------------------------------------------------- render(t): every mark as a function of the clock */
    var now = 0, K = 1;
    /* progress through [a, a + d], rewound by K after the hold */
    function p(a, d) { return K * seg(now, a, a + d); }
    function draw(path, v) { put(path, 'stroke-dashoffset', f3(1 - v)); put(path, 'visibility', v > 0 ? 'visible' : 'hidden'); }
    function grow(g, v) { put(g, 'transform', 'scaleY(' + f3(v) + ')'); }
    function wipe(el, v) { put(el, 'clip-path', v >= 1 ? 'none' : 'inset(0 ' + f2(100 * (1 - v)) + '% 0 0)'); }
    function fillTo(el, v) { put(el, 'transform', 'scaleX(' + f3(v) + ')'); }
    function travel(tok, k) {
      put(tok, '--p', f3(eio(k)));
      put(tok, 'opacity', k <= 0 || k >= 1 ? 0 : f3(Math.min(1, k * 6, (1 - k) * 6)));
    }
    function caption(c, t, still) {
      var on = c.items[0];
      c.items.forEach(function (it) { if (still || it.at <= t) on = it; });
      if (c.on === on) return;
      if (c.on) c.on.el.classList.remove('on');
      on.el.classList.add('on');
      c.on = on;
    }
    function stateOf(el, on, current) { el.classList.toggle('is-on', on); el.classList.toggle('is-now', current); }
    function pct(v) { return '+' + Math.round(v) + '%'; }

    function render(t, still) {
      now = t; K = 1 - eio(seg(t, REWIND, LOOP));
      /* panels: pending, current or done */
      stateOf(p1, true, !still && t < T.tok1 + .5);
      stateOf(p2, still || t >= T.p2, !still && t >= T.p2 && t < T.tok2 + .5);
      stateOf(p3, still || t >= T.p3, !still && t >= T.p3);
      caption(cap1, t, still); caption(cap2, t, still); caption(cap3, t, still);

      /* 1. the setups draw in, card by card, then A is picked */
      var pick = eio(p(T.pick, .5));
      setups.forEach(function (d, i) {
        var a0 = T.cards + i * T.cardGap;
        put(d.el, '--a', f3(eo(p(a0, .45))));
        if (d.bars) d.bars.forEach(function (g, j) { grow(g, eo(p(a0 + .12 + j * .03, .45))); });
        else wipe(d.wipe, p(a0 + .12, 1.05));
        d.items.forEach(function (li, j) { put(li, '--a', f3(eo(p(a0 + .35 + j * .12, .35)))); });
        put(d.el, d.k === 'A' ? '--sel' : '--dim', f3(pick));
      });
      put(more, '--a', f3(eo(p(T.cards + 3 * T.cardGap + .5, .4))));
      travel(tok1, seg(t, T.tok1, T.tok1 + T.tok));

      /* 2. the agent fans out three analyses at once; the best prediction goes on to be implemented */
      put(agent, '--a', f3(eo(p(T.head, .45))));
      var fanP = eio(p(T.fan, .7));
      W.fan.forEach(function (w) { draw(w, fanP); });
      W.fanHeads.forEach(function (h) { put(h, 'opacity', f3(seg(fanP, .85, 1))); });
      /* values never count back down: during the rewind they keep their number and fade with K */
      var anaA = f3(eo(p(T.ana, .4))), labelA = f3(eo(p(T.label, .4))), count = eo(seg(t, T.count, T.count + T.countDur)), best = eio(p(T.best, .5));
      anas.forEach(function (d, i) {
        put(d.el, '--a', anaA);
        put(d.label, '--a', labelA);
        if (d.bars) {
          d.bars.forEach(function (g, j) { grow(g, eo(p(T.anaChart + j * .05, .5))); });
          var hiA = f3(p(T.anaChart + .85, .35));
          d.hi.forEach(function (h) { put(h, 'opacity', hiA); });
        } else wipe(d.wipe, p(T.anaChart, 1.1));
        say(d.num, count > 0 ? pct(d.pred * count) : '–');
        put(d.num, '--a', count > 0 ? f3(K) : 0);
        put(d.el, i ? '--dim' : '--sel', f3(best));
      });
      var convP = eio(p(T.conv, .5));
      W.conv.forEach(function (w) { draw(w, convP); });
      put(W.convHead, 'opacity', f3(seg(convP, .85, 1)));
      /* the winning analysis travels to the implementer: its branch turns blue under a moving dot */
      var run = eio(p(T.run, .65));
      draw(W.run, run);
      var rk = seg(t, T.run, T.run + .65);
      if (W.ok && rk > 0 && rk < 1) {
        var pt = W.run.getPointAtLength(W.len * eio(rk));
        attr(W.dot, 'cx', f2(pt.x)); attr(W.dot, 'cy', f2(pt.y));
        put(W.dot, 'opacity', f3(Math.min(1, rk * 8, (1 - rk) * 8)));
      } else put(W.dot, 'opacity', 0);
      put(impl, '--a', f3(eo(p(T.impl - .15, .4))));
      var pulse = seg(t, T.impl, T.impl + .8);
      put(implRing, 'opacity', pulse > 0 && pulse < 1 ? f3(1 - pulse) : 0);
      put(implRing, 'transform', 'scale(' + f3(1 + .06 * eo(pulse)) + ')');
      travel(tok2, seg(t, T.tok2, T.tok2 + T.tok));

      /* 3. the candidates arrive ranked by prediction; only Rank 1 is built and measured; then the expert and the score */
      put(cols, '--a', f3(eo(p(T.rows - .1, .4))));
      rows.forEach(function (d, j) {
        var a0 = T.rows + j * T.rowGap;
        put(d.el, '--a', f3(eo(p(a0, .4))));
        fillTo(d.pred, d.m.pred / SCALE * eo(p(a0 + .15, .7)));
        if (d.meas) {
          var m = eo(seg(t, T.measure, T.measure + 1.1));
          fillTo(d.meas, d.m.meas / SCALE * m * K);
          say(d.val, m > 0 ? pct(d.m.meas * m) : '');
          put(d.val, '--a', f3(K));
          put(d.el, '--sel', f3(eio(p(T.measure - .1, .4))));
        } else put(d.val, '--a', f3(eo(p(T.notBuilt + (j - 1) * .18, .4))));
      });
      put(ex.el, '--a', f3(eo(p(T.expert, .4))));
      var xp = eo(seg(t, T.expert + .2, T.expert + 1.2));
      fillTo(ex.bar, EXPERT.gain / SCALE * xp * K);
      say(ex.val, xp > 0 ? pct(EXPERT.gain * xp) : '');
      put(ex.val, '--a', f3(K));
      put(cmpA, '--p', f3(eio(p(T.cmp, .5))));
      put(formula, '--a', f3(eo(p(T.formula, .4))));
      /* the result is a ratio of two fixed numbers, so it appears whole rather than counting up */
      put(fLine2, '--a', f3(eo(p(T.result, .35))));
      put(legend, '--a', f3(eo(p(T.rows + .5, .4))));
    }

    /* ---------------------------------------------------------------- the loop: runs only while on screen and not paused */
    var t = 0, raf = 0, last = 0, running = false, visible = false, started = false, paused = false;
    var still = UI.reduced() || !!UI.revealAll;
    /* Stacked (1080px and below) the figure is taller than the screen, so the clock follows the reader. A stage plays
       while its panel is in view and waits at the next arrow until the next panel is; a stage the reader has already
       scrolled past plays out six times faster; and the finished figure stays until the reader is back on panel 1,
       where the next run starts. Side by side, the whole figure fits on screen and the clock just runs. */
    var stackQ = window.matchMedia('(max-width: 1080px)'), hasIO = 'IntersectionObserver' in window;
    var inView = [false, false, false], UNTIL = [T.tok1, T.tok2, Infinity];
    function advance(t0, dt) {
      if (!stackQ.matches || !hasIO) return (t0 + dt) % LOOP;
      if (t0 < T.end) {
        var k = t0 < T.tok1 ? 0 : t0 < T.tok2 ? 1 : 2, at = inView.lastIndexOf(true);
        if (at < k) return t0;                                        /* the reader is above this stage's panel */
        return Math.min(t0 + dt * (inView[k] ? 1 : 6), UNTIL[at]);    /* never past the lowest panel in view */
      }
      if (t0 <= REWIND && t0 + dt > REWIND && !inView[0]) return REWIND;
      return (t0 + dt) % LOOP;
    }
    function frame(ts) {
      raf = 0;
      if (!running) return;
      var dt = last ? Math.min(.05, (ts - last) / 1000) : 0;
      last = ts;
      var nt = advance(t, dt);
      /* waiting for the reader: stop until the panel observer starts the loop again */
      if (nt === t && dt > 0) { running = false; return; }
      t = nt;
      try { render(t); }
      catch (err) { running = false; if (window.console) console.warn('gap-glance:', err); return; }
      raf = requestAnimationFrame(frame);
    }
    function loop() {
      var go = started && visible && !paused && !still && !document.hidden;
      root.classList.toggle('is-still', still);
      if (go && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
      else if (!go && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    }
    function show() { if (still) render(STILL, true); else render(t); }
    function syncBtn() {
      playBtn.hidden = UI.reduced();
      var off = paused || still;
      playBtn.classList.toggle('is-paused', off);
      playBtn.setAttribute('aria-label', off ? 'Play animation' : 'Pause animation');
    }
    playBtn.addEventListener('click', function () {
      /* a still frame from ?reveal=all plays from the start; otherwise the button pauses and resumes */
      if (still) { still = false; paused = false; t = 0; started = true; }
      else paused = !paused;
      syncBtn(); show(); loop();
    });

    show();   /* a first frame off-DOM: if anything throws here, the static figure stays */
    host.textContent = '';
    host.appendChild(root);
    host.classList.add('gg-on');
    layoutWires();
    show(); syncBtn(); loop();

    /* a panel is in view when half of it is on screen below the nav, or it fills half the screen; the loop starts the
       first time one is */
    if (hasIO) {
      var panels = [p1, p2, p3], steps = [];
      for (var i = 0; i <= 20; i++) steps.push(i / 20);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var h = e.rootBounds ? e.rootBounds.height : window.innerHeight;
          inView[panels.indexOf(e.target)] = e.isIntersecting && e.intersectionRect.height >= .5 * Math.min(e.boundingClientRect.height, h);
        });
        if (inView.indexOf(true) >= 0) started = true;
        loop();
      }, { rootMargin: '-60px 0px 0px 0px', threshold: steps });
      panels.forEach(function (el) { io.observe(el); });
    } else started = true;
    if (stackQ.addEventListener) stackQ.addEventListener('change', loop); else if (stackQ.addListener) stackQ.addListener(loop);
    UI.watch(root, function (v) { visible = v; loop(); });
    document.addEventListener('visibilitychange', loop);
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (layoutWires()) show(); }).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (layoutWires()) show(); });
    UI.onTheme(show);
    UI.onReducedChange(function (r) {
      still = r || !!UI.revealAll;
      if (!still) { t = 0; paused = false; }
      syncBtn(); show(); loop();
    });
    window.addEventListener('beforeprint', function () { render(STILL, true); });
    window.addEventListener('afterprint', show);
  }
})();
