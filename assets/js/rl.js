/* LMSysDojo project page: section 03, analysis RL. Why the analyzer is the role to train (rl-signal), a live
 * schematic of the training loop's three infrastructure challenges with the GPU fleet behind it (rl-pipeline), the
 * measured throughput and what each mechanism changed (rl-throughput), the trained analyzer against K (rl-results) and
 * its training curves (rl-train). Every number comes from window.LMSD.rl; the pipeline is a schematic with stage
 * durations in the paper's proportions. */
(function () {
  'use strict';
  var UI = window.LMSDUI, C = window.LMSDCharts, D = window.LMSD && window.LMSD.rl;
  var sec = document.getElementById('rl');
  if (!UI || !D || !sec) return;
  var E = UI.el;

  function mount(name) { return sec.querySelector('[data-mount="' + name + '"]'); }
  function safe(name, fn) {
    var host = mount(name);
    if (!host) return;
    try { fn(host); } catch (err) { if (window.console) console.warn('rl/' + name + ':', err); }
  }
  /* a segmented control with a sliding thumb, the same control as gap's: options [{key, label}], calls onPick(key) */
  function segmented(label, options, current, onPick) {
    var wrap = E('div', { class: 'rl-seg', role: 'group', 'aria-label': label });
    var thumb = E('span', { class: 'rl-seg-thumb', 'aria-hidden': 'true' });
    wrap.appendChild(thumb);
    function place() {
      var on = wrap.querySelector('button[aria-pressed="true"]');
      if (!on || !on.offsetWidth) return;
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }
    options.forEach(function (o) {
      var b = E('button', { type: 'button', 'aria-pressed': String(o.key === current), 'data-key': o.key, text: o.label });
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-pressed') === 'true') return;
        wrap.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        place();
        onPick(o.key);
      });
      wrap.appendChild(b);
    });
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(wrap);
    requestAnimationFrame(place);
    return wrap;
  }
  /* a chart card's head (the card is base.css .chart-card, as in #dojo and #gap): a 16px title, a one-line
     caption and an optional control on the right */
  function head(title, cap, ctrl) {
    return E('div', { class: 'rl-card-head' }, [
      E('div', null, [E('h4', { html: title }), cap ? E('p', { class: 'cap', html: cap }) : null]), ctrl || null]);
  }

  /* ---------------------------------------------------------------- rl-signal: why train the analyzer */
  safe('rl-signal', function (host) {
    var w = D.signal.whole, a = D.signal.analyzer, k1 = D.signal.gainK1;
    /* normalized gain at K = 1 with the same Opus 5 implementer, held-out splits: the Opus 5 analyzer's range
       ("55–62") spans its two splits; the whole solver's runs measured only "2 of 15" of its delivered patches */
    var op = String(k1.opusAnalyzer).match(/[\d.]+/g).map(Number);
    var meas = String(w.measuredOfDelivered).match(/\d+/g).map(Number);
    var SETUPS = {
      whole: { c: 'var(--ink-4)', label: 'Qwen3.8-27B alone', role: 'whole solver', n: w.rollouts + ' rollouts' },
      q9:    { c: 'var(--blue)', label: 'Qwen3.5-9B analyzer', role: '→ Opus 5 implementer', n: a.rollouts + ' rollouts' },
      opus:  { c: 'var(--violet)', label: 'Opus 5 analyzer', role: '→ Opus 5 implementer' }
    };
    function bar(setup, v, text, hi) {
      var s = SETUPS[setup];
      var b = E('div', { class: 'rls-bar', style: { '--c': s.c } }, [
        E('span', { class: 'rls-track', 'aria-hidden': 'true' }, [
          hi != null ? E('i', { class: 'rls-ext', style: { width: hi + '%' } }) : null,
          E('i', { class: 'rls-fill', style: { width: Math.max(v, 0) + '%' } })
        ]),
        E('b', { class: 'rls-v', style: { '--x-n': (hi != null ? hi : v) / 100 }, text: text })
      ]);
      b.appendChild(E('span', { class: 'sr-only', text: s.label + ': ' + text }));
      return b;
    }
    function row(label, bars) {
      return E('div', { class: 'rls-row' }, [E('span', { class: 'rls-l', text: label })].concat(bars));
    }
    function axis(title) {
      return E('div', { class: 'rls-axis', 'aria-hidden': 'true' }, [
        E('span', { class: 'rls-ticks' }, [0, 25, 50, 75, 100].map(function (t) {
          return E('i', { style: { left: t + '%' }, text: t === 100 ? '100%' : String(t) });
        })),
        E('span', { class: 'rls-at', text: title })
      ]);
    }
    function pct(v) { return (Math.round(v * 10) / 10) + '%'; }
    var legend = E('ul', { class: 'rls-legend', 'aria-label': 'Setups' }, ['whole', 'q9', 'opus'].map(function (k) {
      var s = SETUPS[k];
      return E('li', { style: { '--c': s.c } }, [E('i', { 'aria-hidden': 'true' }),
        E('span', null, [E('b', { text: s.label }), ' ' + s.role + ' ', s.n ? E('em', { text: s.n }) : null])]);
    }));
    var reach = E('div', { class: 'rls-panel' }, [
      E('p', { class: 'rls-k', html: '<span class="nb">1</span><span>What untrained rollouts reach</span>' }),
      row('a delivered patch', [bar('whole', w.delivered, pct(w.delivered)), bar('q9', a.delivered, pct(a.delivered))]),
      row('a group with reward spread', [bar('whole', w.spread, pct(w.spread)), bar('q9', a.spread, pct(a.spread))]),
      axis('share of rollouts'),
      E('p', { class: 'rls-note', text: 'As the whole solver, ' + meas[1] + ' of ' + w.rollouts + ' attempts delivered a patch, only ' + meas[0] +
        ' of them were measured, and no item showed reward spread. The two setups also differ in model, items and session clock.' })
    ]);
    var gain = E('div', { class: 'rls-panel' }, [
      E('p', { class: 'rls-k', html: '<span class="nb">2</span><span>Normalized gain at <i>K</i>&nbsp;=&nbsp;1, same Opus&nbsp;5 implementer</span>' }),
      row('9B analyzer', [bar('q9', k1.analyzer9B, pct(k1.analyzer9B))]),
      row('Opus 5 analyzer', [bar('opus', op[0], k1.opusAnalyzer + '%', op[1])]),
      axis("% of the expert's gain"),
      E('p', { class: 'rls-note', text: 'Without a good analyzer, even a strong implementer has little to build. Both on the held-out splits; the Opus 5 bar spans its two splits.' })
    ]);
    host.textContent = '';
    host.appendChild(E('div', { class: 'rls' }, [legend, E('div', { class: 'rls-grid' }, [reach, gain])]));
    if (UI.reduced() || UI.revealAll) host.classList.add('rls-in');
    else UI.onVisible(host, function () { host.classList.add('rls-in'); }, '0px 0px -18% 0px');
  });

  /* ---------------------------------------------------------------- rl-throughput: the loop against a synchronous one */
  /* build a chart into a fresh child, again whenever the host crosses about 480px (hbar narrows its labels below
     that); a little hysteresis keeps small resizes from rebuilding it */
  function byWidth(host, make) {
    var box = null, was = null;
    function go() {
      var w = host.clientWidth, narrow = was ? w < 492 : w < 472;
      if (narrow === was) return;
      was = narrow;
      var drawn = box && box.__drawn;   /* once drawn in, a rebuilt chart appears complete */
      if (box) box.remove();
      box = E('div'); host.appendChild(box);
      if (drawn) box.__drawn = true;
      host.classList.toggle('is-narrow', narrow);
      make(box, narrow);
    }
    if ('ResizeObserver' in window) new ResizeObserver(go).observe(host); else window.addEventListener('resize', go);
    go();
  }
  safe('rl-throughput', function (host) {
    if (!C) return;
    var CAT = { loop: ['loop', 'var(--s-structured)'], serving: ['serving', 'var(--blue)'], rollout: ['rollout', 'var(--ink-4)'],
      scoring: ['scoring', 'var(--violet)'], training: ['training', 'var(--blue-2)'] };
    /* the paper's stated ratio (Sec. 4, App. C.3); 29.7 / 6.2 of the rounded bars would print 4.8 */
    var SPEEDUP = '4.7×';
    /* the synchronous loop is computed on the nodes of the last bar (Appendix C.3, f-rl-throughput-main.py) */
    var SUB = ['computed, nodes of the last bar'];
    var a = E('div', { class: 'chart-card rl-card rlt-col' }, [head('Throughput against a synchronous loop', 'Groups with reward spread trained per hour.')]);
    var b = E('div', { class: 'chart-card rl-card rlt-col' }, [head('What each mechanism changed', 'Gain in the quantity each mechanism targets, on a log scale.')]);
    var ha = E('div', { class: 'rlt-chart' }), hb = E('div', { class: 'rlt-chart' });
    a.appendChild(ha); b.appendChild(hb);
    a.appendChild(E('p', { class: 'rlt-cap rlt-nodes', text: 'Overlapped batches and streaming ran on 1 trainer and 1 server; streaming, elastic on 1+2e trainers and 1+1e servers.' }));
    a.appendChild(E('p', { class: 'rlt-cap', text: 'The synchronous loop is computed from measured stage durations on the nodes of the last bar (e: an elastic node lent from the measurement pool); the last bar counts only groups completed in its window.' }));
    b.appendChild(E('ul', { class: 'rlt-legend', 'aria-label': 'Part of the loop' }, Object.keys(CAT).map(function (k) {
      return E('li', { style: { '--c': CAT[k][1] } }, [E('i', { 'aria-hidden': 'true' }), CAT[k][0]]);
    })));
    host.textContent = '';
    host.appendChild(E('div', { class: 'rlt' }, [a, b]));
    byWidth(ha, function (box, narrow) {
      C.hbar(box, {
        ariaLabel: 'Groups with reward spread trained per hour: ' + D.throughput.map(function (r, i) { return r[0] + (i ? ' ' : ', computed, ') + r[1].toFixed(1); }).join('; ') + ' (' + SPEEDUP + ' the synchronous loop)',
        rows: D.throughput.map(function (r, i) {
          /* the synchronous bar is always marked computed; the node counts move to a caption on narrow screens */
          return { label: r[0], value: r[1], sub: i ? (narrow ? null : r[2]) : (narrow ? 'computed' : SUB[0]), color: i ? 'var(--blue)' : 'var(--s-expert)',
            valueText: i === D.throughput.length - 1 ? r[1].toFixed(1) + '  ·  ' + SPEEDUP : r[1].toFixed(1) };
        }),
        domain: [0, 32], ticks: [0, 10, 20, 30], labelWidth: narrow ? 132 : 196, labelFixed: narrow, barH: 24, gap: narrow ? 16 : 30, valuePad: 92
      });
    });
    /* mechanisms: HTML bars on a log axis (1x-25x), so the long labels can stack above their bars on phones */
    var lx = function (v) { return Math.log(v) / Math.log(25); };
    var list = E('div', { class: 'rlm', role: 'list', 'aria-label': 'Gain from each mechanism, log scale' });
    list.appendChild(E('div', { class: 'rlm-grid', 'aria-hidden': 'true' }, [1, 2, 5, 10, 20].map(function (t) {
      return E('i', { style: { '--x': lx(t) } }, [E('span', { text: t + '×' })]);
    })));
    D.mechanisms.forEach(function (m) {
      list.appendChild(E('div', { class: 'rlm-row', role: 'listitem', style: { '--c': CAT[m[3]][1], '--x': lx(m[1]) } }, [
        E('span', { class: 'rlm-l' }, [E('b', { text: m[0] }), E('small', { text: m[2] })]),
        E('span', { class: 'rlm-bar' }, [E('i', { 'aria-hidden': 'true' }), E('em', { text: m[1] + '×' }),
          E('span', { class: 'sr-only', text: ', ' + CAT[m[3]][0] })])
      ]));
    });
    hb.appendChild(list);
    if (UI.reduced() || UI.revealAll) list.classList.add('rlm-in');
    else UI.onVisible(list, function () { list.classList.add('rlm-in'); }, '0px 0px -15% 0px');
  });

  /* ---------------------------------------------------------------- rl-results: the trained analyzer against K */
  safe('rl-results', function (host) {
    if (!C) return;
    var T = D.table, split = 'held', by = {};
    T.rows.forEach(function (r) { by[r.key] = r; });
    /* the untrained 27B is drawn last, dashed over the 9B lines with hollow markers: it is the reference the trained
       9B reaches, so it must stay visible where the two coincide */
    var ORDER = ['q9', 'q9rl', 'q27'], COL = { q27: 'var(--ink-3)', q9: 'var(--rlr-q9)', q9rl: 'var(--blue)' };
    var stage = E('div', { class: 'rlr-stage' });
    var note = E('p', { class: 'rlr-note' });
    function end(k) { return by[k][split][T.K.length - 1]; }
    function draw() {
      /* retire every chart still on stage, not just the first: a quick double toggle leaves two */
      var olds = [].slice.call(stage.querySelectorAll('.rlr-chart:not(.rlr-leave)')), box = E('div', { class: 'rlr-chart' });
      var tie = end('q9rl') === end('q27');   /* held-out: both reach 16.3 at K = 8, so the trained line's label serves both */
      C.line(box, {
        x: T.K, xDomain: [1, 8], xLog: true, xTicks: T.K, xFormat: function (k) { return 'K = ' + k; },
        yDomain: [0, 21], yTicks: [0, 5, 10, 15, 20], yFormat: function (v) { return v + '%'; },
        yTitle: "normalized gain (% of expert's)", height: 300, margin: { t: 10, l: 58, r: 56 },
        ariaLabel: 'Normalized gain against analyses per item K, ' + (split === 'held' ? 'held-out' : 'dev') + ' splits' +
          (tie ? '; the trained 9B and the untrained 27B both reach ' + end('q27') + '% at K = 8' : ''),
        series: ORDER.map(function (k) {
          var r = by[k], s = { key: k, label: k === 'q9rl' ? r.label : r.label + ', untrained', values: r[split], color: COL[k], width: 2.2, r: 3.5 };
          if (k === 'q9rl') { s.width = 3.2; s.r = 4.5; }
          if (k === 'q27') { s.dash = '5 6'; s.width = 2; s.r = 6; if (tie) s.endLabel = false; }
          return s;
        }),
        tipTitle: function (k) { return 'K = ' + k + ' analyses'; }
      });
      stage.appendChild(box);
      if (olds.length) {
        box.classList.add('rlr-enter');
        olds.forEach(function (o) {
          o.classList.add('rlr-leave');
          setTimeout(function () { o.remove(); }, UI.reduced() ? 0 : 420);
        });
        requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.remove('rlr-enter'); }); });
      }
      var rl = end('q9rl'), big = end('q27'), base = end('q9');
      note.innerHTML = split === 'held'
        ? 'At <i>K</i> = 8 on the held-out splits the trained 9B reaches <b>' + rl + '%</b>, the same as the untrained 27B (' + big + '%), up from ' + base + '%.'
        : 'On the dev split at <i>K</i> = 8: trained 9B <b>' + rl + '%</b>, untrained 27B ' + big + '%, untrained 9B ' + base + '%.';
    }
    var seg = segmented('Benchmark split', [{ key: 'held', label: 'Held-out' }, { key: 'dev', label: 'Dev' }], split,
      function (k) { split = k; draw(); });
    host.textContent = '';
    host.classList.add('chart-card', 'rl-card');
    host.appendChild(head('Gain against analyses per item', 'Parallel gap analysis, frozen Opus&nbsp;5 implementer.', seg));
    host.appendChild(stage);
    host.appendChild(note);
    draw();
    note.setAttribute('aria-live', 'polite');   /* announce the numbers when the split changes, not on load */
  });

  /* ---------------------------------------------------------------- rl-train: training curves */
  safe('rl-train', function (host) {
    if (!C) return;
    function small(title, cap, pts, fmt, dom, ticks, tipFmt) {
      var box = E('div', { class: 'rltr-chart' });
      host.appendChild(E('div', { class: 'rltr' }, [E('h5', { class: 'rltr-k' }, [title, E('span', { text: cap })]), box]));
      C.line(box, {
        xDomain: [0, 200], xTicks: [0, 50, 100, 150, 200], xTitle: 'effective training step',
        yDomain: dom, yTicks: ticks, yFormat: fmt, height: 196, margin: { t: 10, r: 52, b: 44, l: 48 }, legend: false,
        ariaLabel: title + ' against effective training step',
        series: [{ key: 'v', label: title, points: pts, color: 'var(--blue)', width: 2, endLabel: function (v) { return tipFmt(v); } }],
        tipTitle: function (x) { return 'step ' + Math.round(x); }, valueFormat: tipFmt
      });
    }
    host.textContent = '';
    host.classList.add('chart-card', 'rl-card');
    host.appendChild(head('Analysis RL training', 'Against effective steps, where groups are successfully trained.'));
    small('Training reward', 'median log speedup, clipped', D.reward, function (v) { return v ? v.toFixed(2) : '0'; },
      [0, 0.05], [0, 0.01, 0.02, 0.03, 0.04, 0.05], function (v) { return v.toFixed(3); });
    small('Normalized gain of training rollouts', "share of the expert's gain", D.gain, function (v) { return Math.round(v * 100) + '%'; },
      [0, 0.2], [0, 0.05, 0.1, 0.15, 0.2], function (v) { return (v * 100).toFixed(1) + '%'; });
    host.appendChild(E('p', { class: 'rltr-cap', text: 'Over 200 effective steps the training reward rises from about 0.01 to 0.046, and the normalized gain of training rollouts from 6% to about 15%.' }));
  });

  /* ---------------------------------------------------------------- rl-pipeline: a live schematic of the loop
   * Three switches, one per infrastructure challenge of the paper's Fig. rl-infra, each reading problem | fix:
   * (1) what one rollout must do (whole solver, or the analyzer with a frozen implementer), (2) how the GPU fleet is
   * split (fixed, or elastic nodes), (3) how the loop waits (synchronous or asynchronous). One seeded sim in sim minutes
   * drives everything: 384 seats at fleet scale (12 drawn as lanes), the buffer, the trainers and a fleet of 14 nodes x 8
   * GPUs, where server nodes set analysis speed, free pool cards set measurement waits and trainer nodes set step time.
   * Stage durations follow the paper's medians and p10-p90 (Table rl-rollout); the load drifts so the bottleneck moves
   * among serving, training and measurement, as rollouts of uneven length make it do. Allocations and the drift are
   * schematic; every printed number is the paper's. */
  safe('rl-pipeline', function (host) {
    var L = D.loop, SG = D.signal;
    var SPEED = 3;                   /* sim minutes per real second */
    var WINDOW = 100;                /* sim minutes of history across the lanes (less on narrow screens) */
    var N = 12, SLOTS = 12, TRAY = 3, GROUP = L.groupSize, STEP_MIN = L.stepValidMin;
    var FLY = 0.7 * SPEED, POP = 0.5 * SPEED, TRAVEL = 0.9 * SPEED;   /* animation lengths, in sim minutes */
    var mech = {};
    D.mechanisms.forEach(function (m) { mech[m[0]] = m[1]; });
    var X1 = mech['Elastic trainer ×1'] || 1.8, X2 = mech['Elastic trainer ×2'] || 2.8;
    var wm = String(SG.whole.measuredOfDelivered).match(/\d+/g).map(Number);   /* "2 of 15" */
    var P = {
      ACTIVE: 144,             /* seats the concurrency target keeps busy (schematic); the 12 drawn seats are among them */
      STEP_MAX: 15,            /* the schematic's smaller buffer trains on 8-15 valid groups a step */
      HOLD_F: 1.2 * SPEED,     /* a group without reward spread shows in the buffer this long, then drops into the tray */
      DUR: { stage: [L.stagingMinutes, 2.6, 7.5], ana: [L.analysisMinutes, 11.7, 34.7], build: [L.buildMinutes, 2.0, 7.9],
        meas: [L.measureMinutes, 3.3, 8.4], probe: [2, 1, 4] },
      DELIVER: SG.analyzer.delivered / 100, VALID: SG.analyzer.spread / 100,
      KS: 14.75,               /* sessions per replica at full speed: two server nodes run ~95% busy at nominal load */
      FEXP: 0.6,               /* analysis slowdown = (demand / capacity)^FEXP above capacity */
      PROBE_RATE: 0.165,       /* an agent's own measurements per analysis-minute */
      G3: 0.95,                /* trainer minutes per valid group on three nodes */
      SPEEDUP: [0, 1, X1, X2], /* compute speed with one, two, three trainer nodes (the paper's elastic trainers) */
      FMT: 1.0, LOAD: L.weightLoadSeconds / 60,   /* a format probe on one pool card, then the in-place load */
      PERIOD: 150, AMP: { tok: 0.45, rows: 0.55, probe: 0.6 },
      WS: { limit: 50, pTimeout: SG.whole.timedOut / SG.whole.rollouts, pDeliver: wm[1] / SG.whole.rollouts, pMeasured: wm[0] / wm[1], probe: 0.02 },
      PAUSE_HI: 12, PAUSE_LO: 8, MAXSTALE: L.maxStale, DRAIN_MAX: 9, COOLDOWN: 6, HOLD: 3, RELIEF: 6, QUIET: 8,
      SIG: { T: 9, M: 0.6, S: 1 }   /* the signals: valid groups waiting, deliveries waiting (smoothed), serving load */
    };

    /* ------------------------------------------------ the sim */
    function makeSim(o) {
      var seed = o.seed | 0;
      /* seeded randomness so a static frame is always the same frame */
      function rnd() { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
      function uni(a, b) { return a + (b - a) * rnd(); }
      function gauss() { return Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); }
      /* lognormal with the given median and p10-p90, clamped to a little past that range */
      function dur(k) {
        var d = P.DUR[k], sg = Math.log(d[2] / d[1]) / 2.563;
        return UI.clamp(d[0] * Math.exp(sg * gauss()), d[1] * 0.85, d[2] * 1.1);
      }
      function expo(mean) { return -Math.log(1 - rnd()) * mean; }
      var WHOLE = o.roll === 'whole', SYNC = o.loop === 'sync', MOVES = o.fleet === 'elastic' && !SYNC && !WHOLE;

      var S = {
        now: 0, version: 1, swaps: [], live: false, lanes: [], slots: [], extra: [], tray: [], leaving: [], flyers: [], fates: [], fateN: 0,
        T: { busy: false, t0: 0, t1: 0, n: 0, target: 2, nodes: 1 }, swapAt: null, pulse0: 0, nextVersion: 2,
        nodes: [], queue: [], groups: {}, gseq: 0, seats: [], off: [], paused: false, batch: null,
        qd: 0, qw: 0, bn: null, bnCand: undefined, bnSince: 0, quiet: 0, relief: null, move: null, cool: 0, f: 1, D: 0, C: 1
      };
      for (var i = 0; i < SLOTS; i++) S.slots.push(null);
      for (var j = 0; j < N; j++) S.lanes.push({ segs: [], marks: [], thin: null });

      /* the fleet: 14 nodes in 17 slots (S1-2, M1-12, T1-3); a lent node takes the label of the slot it fills */
      function node(id, role, slot) { return { id: id, role: role, slot: slot, home: slot, lent: false, st: 'on', t0: 0, t1: 0, from: null, to: null, cards: [] }; }
      function freshCards() { var c = []; for (var k = 0; k < 8; k++) c.push({ job: null, t1: 0, a: 0 }); return c; }
      S.nodes.push(node(0, 'S', 'S1'), node(1, 'T', 'T1'));
      for (var m = 1; m <= 12; m++) { var pn = node(m + 1, 'M', 'M' + m); pn.cards = freshCards(); S.nodes.push(pn); }
      function nodeAt(slot) { for (var k = 0; k < S.nodes.length; k++) if (S.nodes[k].slot === slot) return S.nodes[k]; return null; }
      /* the synchronous comparison runs on the nodes of the paper's last bar: two servers and three trainers */
      if (o.fleet === 'elastic' && SYNC && !WHOLE) [['M10', 'S2'], ['M11', 'T2'], ['M12', 'T3']].forEach(function (p) {
        var n = nodeAt(p[0]); n.role = p[1].charAt(0); n.slot = p[1]; n.lent = true; n.cards = [];
      });
      function count(role) { return S.nodes.filter(function (n) { return n.role === role; }).length; }
      function onNodes(role) { return S.nodes.filter(function (n) { return n.role === role && n.st === 'on'; }).length; }
      function cards(acceptOnly) {
        var out = [];
        S.nodes.forEach(function (n) {
          if (n.role !== 'M' || n.st === 'fly' || n.st === 'join' || acceptOnly && n.st !== 'on') return;
          n.cards.forEach(function (c) { out.push(c); });
        });
        return out;
      }

      /* the load drifts: serving, training and measurement demand each peak in turn */
      function drift(t) {
        var ph = 2 * Math.PI * t / P.PERIOD;
        return { tok: 1 + P.AMP.tok * Math.sin(ph), rows: 1 + P.AMP.rows * Math.sin(ph - 2.094), probe: 1 + P.AMP.probe * Math.sin(ph - 4.189) };
      }

      /* measurement pool: one job per card, first fit from M1, a format probe jumps the queue */
      function submit(job, front) { if (front) S.queue.unshift(job); else S.queue.push(job); }
      function assign(t) {
        if (!S.queue.length) return;
        var ns = S.nodes.filter(function (n) { return n.role === 'M' && n.st === 'on'; }).sort(function (a, b) { return +a.slot.slice(1) - +b.slot.slice(1); });
        for (var a = 0; a < ns.length && S.queue.length; a++) {
          ns[a].cards.forEach(function (c) {
            if (c.job || !S.queue.length) return;
            var job = S.queue.shift();
            c.job = job; c.a = t; c.t1 = t + job.dur;
            if (job.start) job.start(t);
          });
        }
      }
      function finishCards(t) {
        S.nodes.forEach(function (n) {
          if (n.role === 'M') n.cards.forEach(function (c) { if (c.job && t >= c.t1) { var jb = c.job; c.job = null; if (jb.done) jb.done(c.t1); } });
        });
      }

      /* lanes: only the 12 drawn seats record segments; an open segment ends at Infinity until closed */
      function seg(li, k, tr, a) { if (li == null) return null; var s = { k: k, tr: tr, a: a, b: Infinity }; S.lanes[li].segs.push(s); return s; }
      function close(s, t) { if (s) s.b = t; }
      function mark(li, k, t) { if (li != null) S.lanes[li].marks.push({ k: k, t: t }); }

      /* groups: every eight consecutive rollouts are one item's group; it enters the buffer when all eight are scored */
      function groupFor(r) {
        var g = S.groups[S.gseq];
        if (!g || g.n >= GROUP) { S.gseq++; g = S.groups[S.gseq] = { id: S.gseq, n: 0, done: 0, v: S.version }; }
        g.n++; r.g = g;
      }
      function rolloutDone(r, t) {
        var g = r.g;
        if (r.li != null && S.lanes[r.li].thin === r) { S.lanes[r.li].thin = null; S.lanes[r.li].freed = t; }
        if (++g.done >= GROUP) { delete S.groups[g.id]; addGroup(t, g); }
      }

      /* seats: a seat starts its next analysis as soon as one ends; build and measurement run off the seat */
      for (var s = 0; s < L.seats; s++) S.seats.push({ i: s, ro: null, active: s < P.ACTIVE, idle: null });
      function startRollout(seat, t) {
        var r = { li: seat.i < N ? seat.i : null, phase: 'stage', t1: t + dur('stage') };
        groupFor(r);
        if (WHOLE) {   /* one session must diagnose and build the fix; most run out the session clock */
          var u = rnd();
          r.out = u < P.WS.pTimeout ? 'timeout' : u < P.WS.pTimeout + P.WS.pDeliver ? 'deliver' : 'nopatch';
          r.work = r.out === 'timeout' ? P.WS.limit : uni(22, 46);
          r.slice = 0; r.left = uni(2, 6);
        } else { r.work = dur('ana'); r.deliver = rnd() < P.DELIVER; }
        r.seg = seg(r.li, 'stage', 0, t);
        if (seat.idle) { close(seat.idle, t); seat.idle = null; }
        seat.ro = r;
      }
      function scoreJob(r) {
        return { kind: 'score', dur: dur('meas'),
          start: function (ts) { close(r.tseg, ts); r.tseg = seg(r.li, 'meas', 1, ts); r.phase = 'meas'; },
          done: function (te) { close(r.tseg, te); mark(r.li, 'dot', te); r.phase = 'done'; rolloutDone(r, te); } };
      }
      function endOnSeat(seat, r, t) {
        seat.ro = null;
        if (WHOLE) {
          if (r.out === 'deliver' && rnd() < P.WS.pMeasured) {   /* rare: a measured delivery, still zero reward */
            r.phase = 'mwait'; r.tseg = seg(r.li, 'wait', 1, t); if (r.li != null) S.lanes[r.li].thin = r;
            S.off.push(r); submit(scoreJob(r));
          } else {
            if (r.out === 'timeout') mark(r.li, 'cap', t);
            mark(r.li, 'ring', t); rolloutDone(r, t);
          }
          return;
        }
        r.phase = 'bwait'; r.t1 = t + uni(0.6, 2.4); r.tEnd = t;
        S.off.push(r);
      }
      function offStep(t) {
        S.off.forEach(function (r) {
          if (r.phase === 'bwait') {
            /* a drawn seat's thin track holds one rollout's build and measurement at a time */
            var ln = r.li != null ? S.lanes[r.li] : null;
            if (ln && ln.thin && ln.thin !== r) return;
            if (ln && !ln.thin) { ln.thin = r; r.tseg = seg(r.li, 'wait', 1, Math.max(r.tEnd, ln.freed || 0)); }
            if (t >= r.t1) { close(r.tseg, t); r.phase = 'build'; r.tseg = seg(r.li, 'build', 1, t); r.t1 = t + dur('build'); }
          } else if (r.phase === 'build' && t >= r.t1) {
            close(r.tseg, r.t1);
            if (r.deliver) { r.phase = 'mwait'; r.tseg = seg(r.li, 'wait', 1, r.t1); submit(scoreJob(r)); }
            else { mark(r.li, 'ring', r.t1); r.phase = 'done'; rolloutDone(r, r.t1); }
          }
        });
        S.off = S.off.filter(function (r) { return r.phase !== 'done'; });
      }
      function seatStep(t, dt) {
        var dr = drift(t), nA = 0;
        S.seats.forEach(function (seat) {
          var r = seat.ro;
          if (!r) {
            if (seat.active && (SYNC ? S.batch && S.batch.left > 0 : !S.paused)) { startRollout(seat, t); if (SYNC) S.batch.left--; }
            else if (seat.i < N && !seat.idle) seat.idle = seg(seat.i, 'idle', 0, t);
            return;
          }
          if (r.phase === 'stage' && t >= r.t1) { close(r.seg, r.t1); r.phase = 'ana'; r.seg = seg(r.li, 'ana', 0, r.t1); }
          if (r.phase !== 'ana') return;
          nA++;
          var adv = dt / S.f;
          if (WHOLE) {   /* the solver's own coding slices interleave with its analysis */
            r.left -= adv;
            if (r.left <= 0) { close(r.seg, t); r.slice ^= 1; r.left = r.slice ? uni(1.6, 5) : uni(2, 6); r.seg = seg(r.li, r.slice ? 'code' : 'ana', 0, t); }
            if (rnd() < P.WS.probe * dt * dr.probe) submit({ kind: 'probe', dur: dur('probe') });
          } else if (rnd() < P.PROBE_RATE * dr.probe * dt) submit({ kind: 'probe', dur: dur('probe') });
          r.work -= adv;
          if (r.work <= 0) { close(r.seg, t); endOnSeat(seat, r, t); }
        });
        return nA;
      }

      /* the buffer: a group's eight rewards; about two thirds of analysis-RL groups have spread and survive the filter.
         A group without spread shows for a moment, then drops into the tray; valid groups wait for a step (those past
         the 12 drawn slots wait undrawn), and one left more than five versions behind drops too. */
      function fate(k) { S.fates.push(k); if (S.fates.length > 40) S.fates.shift(); }
      function addGroup(t, g) {
        var valid = !WHOLE && rnd() < P.VALID, r = [], k;
        for (k = 0; k < GROUP; k++) r.push(valid && rnd() < 0.74 ? (rnd() < 0.55 ? expo(0.12) : -expo(0.06)) : 0);
        if (valid && Math.max.apply(null, r) - Math.min.apply(null, r) < L.spreadFilter) r[GROUP - 1] = 0.08;
        var x = { t0: t, r: r, valid: valid, v: g.v, st: valid ? 'in' : 'filt', tx: valid ? 0 : t + P.HOLD_F, fate: ++S.fateN };
        fate(valid ? 'valid' : 'filt');
        var i = S.slots.indexOf(null);
        if (i >= 0) S.slots[i] = x;
        else if (valid) S.extra.push(x);
        else toTray(x, -1, t);
      }
      /* the tray keeps the last three dropped groups; a newer one pushes the oldest out */
      function toTray(x, from, t) {
        S.tray.forEach(function (e) { e.k0 = e.k; e.k++; e.ts = t; });
        S.tray.unshift({ g: x, from: from, k0: -1, k: 0, ts: t });
        S.tray = S.tray.filter(function (e) { if (e.k === TRAY && e.out == null) e.out = t; return e.k <= TRAY; });
      }
      function drop(x, t) {   /* a valid group dropped as stale turns its own tally pip gray */
        var k = S.fates.length - 1 - (S.fateN - x.fate), i = S.slots.indexOf(x);
        if (k >= 0 && S.fates[k] === 'valid') S.fates[k] = 'stale';
        x.st = 'gone';
        if (i >= 0) S.slots[i] = null; else S.extra.splice(S.extra.indexOf(x), 1);
        toTray(x, i, t);
      }
      function validReady() { return S.slots.filter(function (x) { return x && x.st === 'in'; }).concat(S.extra); }
      function startStep(t, t1, all) {
        var ready = validReady().sort(function (a, b) { return b.t0 - a.t0; });
        var take = all ? ready : ready.slice(0, P.STEP_MAX);
        /* taken groups free their slots at once and fly to the trainer from where they sat */
        take.forEach(function (x) {
          var k = S.slots.indexOf(x);
          x.st = 'fly'; x.tx = t;
          if (k >= 0) { S.leaving.push({ i: k, g: x }); S.slots[k] = null; } else S.extra.splice(S.extra.indexOf(x), 1);
        });
        var nt = onNodes('T');
        S.nodes.forEach(function (n) { if (n.role === 'T') n.inStep = n.st === 'on'; });
        S.T = { busy: true, t0: t, t1: t1, n: take.length, target: S.version + (S.swapAt != null ? 2 : 1), nodes: nt };
      }
      function finishStep(t) {
        S.T.busy = false;
        S.nodes.forEach(function (n) { n.inStep = false; });
        /* a format probe checks the export on one pool card, then the servers load it in place */
        submit({ kind: 'fmt', dur: P.FMT }, true);
        S.swapAt = t + P.FMT + P.LOAD; S.pulse0 = t; S.nextVersion = S.T.target;
      }
      function stepMinutes(n, t) { return n * P.G3 * (X2 / P.SPEEDUP[Math.max(1, onNodes('T'))]) * drift(t).rows; }

      /* the synchronous loop: a batch fills one whole step of the paper's 24 groups, so the active seats run a second,
         partial wave while the rest idle; the trainer waits for the batch's last score, then the weights load */
      function batchStart(t) {
        S.batch = { t0: t, phase: 'roll', left: GROUP * L.stepGroups };
        S.seats.forEach(function (seat) { if (seat.active && S.batch.left > 0) { startRollout(seat, t); S.batch.left--; } });
      }
      function syncStep(t) {
        var b = S.batch;
        if (!b) { batchStart(t); return; }
        if (b.phase === 'roll') {
          if (!b.left && !S.seats.some(function (x) { return !!x.ro; }) && !S.off.length) { b.end = t; b.phase = WHOLE ? 'next' : 'gap'; b.tr0 = t + 1.2; b.next = t + 2; }
        } else if (b.phase === 'gap' && t >= b.tr0) { b.phase = 'train'; startStep(t, t + stepMinutes(validReady().length, t), true); }
        else if (b.phase === 'train' && t >= S.T.t1) { finishStep(S.T.t1); b.phase = 'load'; }
        else if (b.phase === 'load' && S.swapAt == null) { b.phase = 'next'; b.next = t + 0.4; }
        else if (b.phase === 'next' && t >= b.next) batchStart(t);
      }

      /* load on the servers and the pool */
      function ema(prev, x, dt, tau) { return prev + (x - prev) * (1 - Math.exp(-dt / tau)); }
      function load(t, dt, nA) {
        S.D = nA * drift(t).tok; S.C = 8 * Math.max(1, onNodes('S')) * P.KS;
        S.f = Math.pow(Math.max(1, S.D / S.C), P.FEXP);
        S.qw = S.queue.filter(function (j) { return j.kind === 'score'; }).length;
        S.qd = ema(S.qd, S.qw, dt, 1.5);
        S.full = cards(false).filter(function (c) { return c.job; }).length >= 0.95 * cards(true).length;
      }
      /* the bottleneck, read from signals the frame shows: a growing buffer marks training (the paper's trainer
         signal), deliveries waiting for a card mark measurement, and replicas past capacity, which slow every analysis,
         mark serving. A new reading shows once it has held for three minutes; the label clears when no signal holds, and
         a job that has just gained a node is not named again until the node has had time to help. */
      function signal(t) {
        var vr = validReady().length, c = null;
        if (vr >= P.SIG.T) c = 'T';
        else if (S.qd >= P.SIG.M && (S.qw > 0 || S.full)) c = 'M';
        else if (S.D >= P.SIG.S * S.C) c = 'S';
        return S.relief && t - S.relief.t < P.RELIEF && c === S.relief.role ? null : c;
      }
      function bottleneck(t) {
        if (WHOLE || SYNC) { S.bn = null; return; }
        if (S.move && S.move.role === S.bn) return;   /* the job stays short until the node sent to it lands */
        var c = signal(t);
        if (c === S.bn) { S.bnCand = undefined; return; }
        if (S.bnCand !== c) { S.bnCand = c; S.bnSince = t; return; }
        if (t - S.bnSince >= (c ? P.HOLD : 0.5)) { S.bn = c; S.bnCand = undefined; }   /* a label clears faster than it shows */
      }

      /* the elastic controller: one move at a time; a node drains, travels, and joins the job falling behind */
      function lentIn(role) { return S.nodes.filter(function (n) { return n.lent && n.role === role && n.st === 'on'; }); }
      /* whether a job can give up a node: serving keeps its replicas under 80% busy, the trainer has little to train,
         the pool keeps under 90% of its cards busy */
      function spare(role) {
        if (role === 'S') return S.D < 0.8 * 8 * (onNodes('S') - 1) * P.KS;
        if (role === 'T') return !S.T.busy && validReady().length < 5;
        var busy = cards(false).filter(function (c) { return c.job; }).length;
        return S.qd < 0.5 && busy + S.queue.length < 0.9 * (cards(true).length - 8);
      }
      function controller(t) {
        if (!MOVES || S.move || t < S.cool) return;
        var b = S.bn;
        if (b) S.quiet = 0;
        if (b === 'S' || b === 'T') {
          if (count(b) >= (b === 'S' ? 2 : 3)) return;
          var other = b === 'S' ? 'T' : 'S', lo = lentIn(other), donor = null;
          if (lo.length && spare(other)) donor = lo[lo.length - 1];   /* serving and training nodes can swap */
          else if (count('M') > 9 && spare('M'))
            donor = S.nodes.filter(function (n) { return n.role === 'M' && n.st === 'on'; }).sort(function (x, y) { return +y.slot.slice(1) - +x.slot.slice(1); })[0];
          if (donor) startMove(donor, b, t);
        } else if (b === 'M') {
          var back = lentIn('T').concat(lentIn('S')).sort(function (x, y) { return spare(y.role) - spare(x.role); })[0];
          if (back) startMove(back, 'M', t);
        } else {   /* nothing has been short for a while: a lent node whose job has room goes home */
          var q = lentIn('S').concat(lentIn('T')).filter(function (n) { return spare(n.role); })[0];
          if (q) { S.quiet = S.quiet || t; if (t - S.quiet >= P.QUIET) { S.quiet = 0; startMove(q, 'M', t); } } else S.quiet = 0;
        }
      }
      function freeSlot(role) {
        var ids = role === 'S' ? ['S2'] : ['T2', 'T3'];
        for (var k = 0; k < ids.length; k++) if (!nodeAt(ids[k]) && !S.nodes.some(function (n) { return n.to === ids[k]; })) return ids[k];
        return null;
      }
      function startMove(n, toRole, t) {
        var to = toRole === 'M' ? n.home : freeSlot(toRole);
        if (!to) return;
        n.st = 'drain'; n.t0 = t; n.from = n.slot; n.to = to; n.drainEnd = t + (n.role === 'S' ? 2 : P.DRAIN_MAX);
        S.move = { n: n, from: n.slot, to: to, role: toRole };
      }
      function moveStep(t) {
        var mv = S.move;
        if (!mv) return;
        var n = mv.n;
        if (n.st === 'drain' && mv.role === 'M' && S.bn === n.role) { n.st = 'on'; n.from = n.to = null; S.move = null; S.cool = t + P.COOLDOWN; return; }
        if (n.st === 'drain') {
          /* a pool node takes no new jobs and waits for its cards to finish; a trainer leaves when its step ends */
          var done = n.role === 'M' ? n.cards.every(function (c) { return !c.job; }) : n.role === 'T' ? !(S.T.busy && n.inStep) : t >= n.drainEnd;
          if (n.role === 'M' && !done && t >= n.drainEnd) { n.cards.forEach(function (c) { if (c.job) { S.queue.unshift(c.job); c.job = null; } }); done = true; }
          if (done) { n.st = 'fly'; n.t0 = t; n.t1 = t + TRAVEL; }
        } else if (n.st === 'fly' && t >= n.t1) {
          n.slot = n.to; n.role = mv.role; n.lent = n.slot !== n.home; n.t0 = n.t1; n.cards = [];
          if (n.role === 'M') { n.cards = freshCards(); n.st = 'on'; n.land = n.t1; finishMove(n.t1); }
          else { n.st = 'join'; n.t1 = n.role === 'S' ? n.t0 + P.LOAD : Infinity; }   /* a server loads the weights; a trainer joins the next step */
        } else if (n.st === 'join' && n.role === 'S' && t >= n.t1) { n.st = 'on'; n.land = n.t1; finishMove(n.t1); }
      }
      function finishMove(t) {
        var n = S.move.n;
        if (n.role !== 'M') { S.relief = { role: n.role, t: t }; if (S.bn === n.role) S.bn = null; }
        n.from = null; n.to = null; S.move = null; S.cool = t + P.COOLDOWN;
      }

      /* ------------------------------------------------ the clock */
      function step(dt) {
        var t = S.now + dt, nA;
        S.now = t;
        finishCards(t);
        if (SYNC) { syncStep(t); nA = seatStep(t, dt); }
        else {
          /* the concurrency controller pauses new analyses when the buffer holds more groups than training can take */
          var vr = validReady().length;
          if (!S.paused && vr >= P.PAUSE_HI) S.paused = true;
          if (S.paused && vr < P.PAUSE_LO) S.paused = false;
          nA = seatStep(t, dt);
          if (!WHOLE && !S.T.busy && S.swapAt == null && vr >= STEP_MIN) {
            S.nodes.forEach(function (n) { if (n.role === 'T' && n.st === 'join') { n.st = 'on'; n.land = t; if (S.move && S.move.n === n) finishMove(t); } });
            startStep(t, t + stepMinutes(Math.min(vr, P.STEP_MAX), t), false);
          }
          if (S.T.busy && t >= S.T.t1) finishStep(S.T.t1);
        }
        offStep(t);
        assign(t);
        if (S.swapAt != null && t >= S.swapAt) {
          S.version = S.nextVersion; S.swaps.push({ t: S.swapAt, v: S.version }); S.swapAt = null;
          /* groups more than five versions behind drop as stale */
          validReady().forEach(function (x) { if (S.version - x.v > P.MAXSTALE) drop(x, t); });
        }
        load(t, dt, nA);
        bottleneck(t);
        controller(t);
        moveStep(t);
        /* rewards land: on screen they fly into the buffer */
        S.lanes.forEach(function (ln, li) {
          ln.marks.forEach(function (mk) {
            if (mk.flown || mk.t > t || mk.k === 'cap') return;
            mk.flown = true;
            if (S.live) S.flyers.push({ li: li, k: mk.k, t0: mk.t });
          });
        });
        /* retire what has left the window or finished animating */
        var cut = t - WINDOW - 30;
        S.lanes.forEach(function (ln) {
          if (ln.segs.length > 50) ln.segs = ln.segs.filter(function (x) { return x.b > cut; });
          if (ln.marks.length > 16) ln.marks = ln.marks.filter(function (x) { return x.t > cut; });
        });
        S.swaps = S.swaps.filter(function (x) { return x.t > cut; });
        S.flyers = S.flyers.filter(function (x) { return t - x.t0 < FLY; });
        S.leaving = S.leaving.filter(function (x) { return t < x.g.tx + FLY * 1.4; });
        S.tray = S.tray.filter(function (e) { return e.out == null || t < e.out + POP * 2; });
        for (var k = 0; k < SLOTS; k++) {
          var x = S.slots[k];
          if (x && x.st === 'filt' && t >= x.tx) { S.slots[k] = null; toTray(x, k, t); }
          else if (!x && S.extra.length) S.slots[k] = S.extra.shift();
        }
      }
      S.step = step;
      S.warm = function (minutes) { var end = S.now + minutes; while (end - S.now > 1e-6) step(Math.min(0.25, end - S.now)); };
      /* a still frame must not catch a node in transit */
      S.settle = function () {
        var k = 0, w;
        while (k++ < 600 && (S.move || S.leaving.length || S.swapAt != null || (w = S.swaps[S.swaps.length - 1]) && S.now - w.t < 1.1 * SPEED)) step(0.25);
      };
      S.validReady = validReady; S.nodeAt = nodeAt; S.onNodes = onNodes;
      return S;
    }

    /* ------------------------------------------------ DOM: the switches, panels and text; the canvas draws every moving mark */
    var SUBS = '₀₁₂₃₄₅₆₇₈₉';
    function sub(n) { return String(n).replace(/\d/g, function (d) { return SUBS[d]; }); }
    function lg(cls, text) { return E('li', null, [E('i', { class: 'lg-' + cls, 'aria-hidden': 'true' }), text]); }
    function lgCell(c, text) { return E('li', null, [E('i', { class: 'lg-cell' + (c ? '' : ' idle'), style: c ? { '--c': c } : null, 'aria-hidden': 'true' }), text]); }
    var pct = function (a, b) { return Math.round(100 * a / b) + '%'; };
    /* the three challenges of the paper's Fig. rl-infra; each switch reads problem | fix and starts on the fix, and each
       caption describes the current setup (whole-solver runs never train, so they get their own) */
    var CH = [
      { key: 'roll', name: 'Difficult rollouts', opts: [['whole', 'Whole solver'], ['ana', 'Analysis RL']], fix: 'ana', text: {
        whole: 'One rollout must diagnose and build the fix: <b>' + pct(SG.whole.timedOut, SG.whole.rollouts) + '</b> time out, and <b>' + SG.whole.spread + '%</b> fall in groups with reward spread.',
        ana: 'Only the analyzer trains: <b>' + SG.analyzer.delivered + '%</b> of rollouts deliver a patch and <b>' + SG.analyzer.spread + '%</b> fall in groups with reward spread.' } },
      { key: 'fleet', name: 'GPU contention', opts: [['fixed', 'Fixed split'], ['elastic', 'Elastic nodes']], fix: 'elastic', text: {
        fixed: 'Always one server node and one trainer node; when either falls behind, idle pool cards cannot help.',
        elastic: 'Pool nodes drain and join the job falling behind, then return; one lent trainer gives <b>' + X1 + '×</b> compute speed, two give <b>' + X2 + '×</b>.',
        elasticSync: 'As in the paper’s synchronous comparison, lent nodes stay put: two server nodes and three trainer nodes.',
        wholeFixed: 'Always one server node and one trainer node; with no group to train, the trainer node sits idle.',
        wholeElastic: 'Nodes can drain and join a job that falls behind, but more GPUs cannot create reward spread.' } },
      { key: 'loop', name: 'Long, uneven rollouts', opts: [['sync', 'Synchronous'], ['async', 'Asynchronous']], fix: 'async', text: {
        sync: 'A batch waits for its slowest rollout while the rest idle: <b>' + L.syncBatchHours + '&nbsp;h</b> from first rollout to new weights.',
        syncFixed: 'A batch waits for its slowest rollout while the rest idle, and one trainer node makes each step longer.',
        async: 'Groups train as soon as they are scored while other rollouts continue: a step every <b>' + L.stepMinutes + '&nbsp;min</b>.',
        asyncFixed: 'Groups train as soon as they are scored while other rollouts continue; a median rollout takes <b>' + L.medianMinutes + '&nbsp;min</b>.',
        wholeSync: 'A batch waits for its slowest rollout while the rest idle, and no group in it can be trained.',
        wholeAsync: 'Groups would train as soon as they are scored, but none has reward spread.' } }
    ];
    function caption(c) {
      var k = cfg[c.key], T = c.text, whole = cfg.roll === 'whole';
      if (c.key === 'fleet') return whole ? T[k === 'fixed' ? 'wholeFixed' : 'wholeElastic'] : k === 'elastic' && cfg.loop === 'sync' ? T.elasticSync : T[k];
      if (c.key === 'loop') return whole ? T[k === 'sync' ? 'wholeSync' : 'wholeAsync'] : cfg.fleet === 'fixed' ? T[k + 'Fixed'] : T[k];
      return T[k];
    }
    /* what each setup trained in the paper: groups with reward spread per hour (Fig. rl-throughput) */
    var TH = D.throughput, RATIO = '4.7×';   /* the paper's stated ratio (Sec. 4, App. C.3); 29.7 / 6.2 of the rounded bars would print 4.8 */
    function readout() {
      var per = 'groups with reward spread trained per hour';
      if (cfg.roll === 'whole') return ['0%', 'of rollouts in groups with reward spread', 'whole solver: ' + wm[1] + ' patches in ' + SG.whole.rollouts + ' attempts, ' + wm[0] + ' measured'];
      if (cfg.loop === 'sync') return [TH[0][1].toFixed(1), per, cfg.fleet === 'elastic' ? 'a synchronous loop on 3 trainer and 2 server nodes' : 'the paper’s synchronous loop ran on 3 trainer and 2 server nodes'];
      if (cfg.fleet === 'fixed') return [TH[2][1].toFixed(1), per, 'streaming on 1 trainer and 1 server node'];
      return [TH[3][1].toFixed(1), per, RATIO + ' a synchronous loop on the same nodes'];
    }
    var cfg = { roll: 'ana', fleet: 'elastic', loop: 'async' };
    var TITLE = { ana: 'One run of analysis RL, time\u2011compressed', whole: 'One run of whole-solver RL, time\u2011compressed' };

    var canvas = E('canvas', { class: 'rlp-canvas', 'aria-hidden': 'true' });
    var lanesArea = E('div', { class: 'rlp-area' });
    var grid = E('div', { class: 'rlp-grid' });
    var pips = E('div', { class: 'rlp-pips' });
    var tArea = E('div', { class: 'rlp-tarea' });
    var GATE = { async: '≥' + L.stepValidMin + '<br>valid<br>groups', sync: 'whole<br>batch' };
    var gate = E('div', { class: 'rlp-gate', html: GATE.async });
    var status = E('p', { class: 'rlp-status' });
    var eq = E('code', { class: 'rlp-eq' });
    var railNote = E('p', { class: 'rlp-rail' });
    var fstat = E('p', { class: 'rlp-fstat' });
    var card = E('span', { class: 'rlp-bnc', 'aria-hidden': 'true' }, [E('span', { class: 'rlp-bnc-tab', text: 'bottleneck' })]);
    var roN = E('b', { class: 'rlp-ro-n' }), roL1 = E('span'), roL2 = E('small');
    var ro = E('p', { class: 'rlp-ro' }, [roN, E('span', { class: 'rlp-ro-t' }, [roL1, roL2])]);
    var SLOTIDS = { S: ['S1', 'S2'], M: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'], T: ['T1', 'T2', 'T3'] };
    var ROLE = { S: ['Policy servers', '8 replicas per node', 'var(--rlp-serve)'], M: ['Measurement pool', 'one job per card', 'var(--rlp-score)'],
      T: ['Trainers', 'HSDP, one step at a time', 'var(--rlp-train)'] };
    var slotEls = {}, headEls = {}, queueEl = null;
    function region(r) {
      var h = E('p', { class: 'rlp-frh' }, [E('i', { style: { '--c': ROLE[r][2] }, 'aria-hidden': 'true' }), E('span', { class: 'rlp-frn', text: ROLE[r][0] }), E('em', { text: ROLE[r][1] }),
        r === 'M' ? (queueEl = E('span', { class: 'rlp-frq' })) : null]);
      headEls[r] = h;
      /* the slot labels only name boxes the canvas fills; the status line says what the fleet is doing */
      return E('div', { class: 'rlp-fr', 'data-role': r }, [h, E('div', { class: 'rlp-slots', 'aria-hidden': 'true' }, SLOTIDS[r].map(function (id) {
        return (slotEls[id] = E('div', { class: 'rlp-slot' }, [E('span', { class: 'rlp-sl', text: id }), E('i', { class: 'rlp-sb' })]));
      }))]);
    }
    var rollLg, buildLg = lg('build', 'build (frozen Opus 5)'), capLg = lg('cap', 'timeout'), swapLg = lg('swap', 'weight swap'), lentLg = lg('lent', 'lent pool node');
    var fleetGroups = E('div', { class: 'rlp-fg' }, [region('S'), region('M'), region('T')]);
    var fleet = E('div', { class: 'rlp-fleet' }, [
      E('div', { class: 'rlp-fh' }, [E('p', { class: 'rlp-h', text: 'One GPU pool, three jobs' }), E('span', { class: 'rlp-fsub', text: L.gpus + ' GPUs on ' + L.nodes + ' nodes, held for the whole run' }), fstat]),
      card, fleetGroups,
      E('ul', { class: 'rlp-legend rlp-flegend', 'aria-label': 'Legend: GPUs' }, [
        lgCell('var(--rlp-serve)', 'serving the policy'), lgCell('var(--rlp-train)', 'training'), lgCell('var(--rlp-score)', 'scoring a delivery'),
        lgCell('var(--rlp-probe)', 'an agent’s own measurement'), lgCell('var(--rlp-fmt)', 'format probe'), lgCell(null, 'idle, kept reserved'), lentLg])
    ]);
    var stage = E('div', { class: 'rlp-stage' }, [
      E('div', { class: 'rlp-lanes' }, [lanesArea,
        E('p', { class: 'rlp-cap', html: '<b>Rollout&nbsp;seats</b>&nbsp;· one&nbsp;sealed&nbsp;playground&nbsp;each&nbsp;· ' + N + '&nbsp;of&nbsp;' + L.seats + '&nbsp;shown' })]),
      E('div', { class: 'rlp-buf' }, [
        E('p', { class: 'rlp-h', text: 'Buffer' }),
        E('p', { class: 'rlp-sub', text: 'complete groups of ' + GROUP + '; shade: reward' }),
        grid,
        E('div', { class: 'rlp-tally' }, [E('span', { class: 'rlp-tally-k', text: 'recent groups' }), pips]),
        E('p', { class: 'rlp-sub', text: 'dashed: reward spread below ' + L.spreadFilter + '; gray: stale' })]),
      gate,
      E('div', { class: 'rlp-train' }, [
        E('p', { class: 'rlp-h', text: 'Trainers' }),
        E('p', { class: 'rlp-sub', text: 'full-parameter GRPO' }),
        tArea, status, eq]),
      railNote, fleet, canvas
    ]);
    var title = E('span', { text: TITLE.ana });
    var pauseBtn = E('button', { type: 'button', class: 'rlp-play', 'aria-label': 'Pause animation',
      html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-pause" d="M5 3.5v9M11 3.5v9"/><path class="i-play" d="M5.5 3.2v9.6L12.8 8z"/></svg>' });
    var chEls = {}, chText = {}, chLast = {};
    var bar = E('div', { class: 'rlp-bar', role: 'group', 'aria-label': 'Three infrastructure challenges' }, CH.map(function (c, i) {
      chText[c.key] = E('p', { class: 'rlp-ch-t' });
      return (chEls[c.key] = E('div', { class: 'rlp-ch' }, [
        E('p', { class: 'rlp-ch-h' }, [E('span', { class: 'nb', text: String(i + 1) }), E('span', { text: c.name })]),
        segmented(c.name, c.opts.map(function (o) { return { key: o[0], label: o[1] }; }), cfg[c.key], function (k) {
          cfg[c.key] = k; setMode();
          if (!UI.reduced() && canvas.animate) canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
        }),
        chText[c.key]]));
    }));
    host.textContent = '';
    host.appendChild(E('div', { class: 'rlp' }, [
      E('div', { class: 'rlp-top' }, [
        E('p', { class: 'rlp-title' }, [E('span', { class: 'tag-note', text: 'schematic' }), title]),
        E('div', { class: 'rlp-ctrl' }, [ro, pauseBtn])]),
      bar, stage,
      /* stages on the first row, the marks that end a rollout on the second */
      rollLg = E('ul', { class: 'rlp-legend', 'aria-label': 'Legend: rollouts' }, [
        lg('ana', 'analysis, by weights version'), buildLg, lg('meas', 'measurement (GPU)'), lg('wait', 'setup and waits'), lg('idle', 'idle'),
        E('li', { class: 'lg-break', 'aria-hidden': 'true' }),
        lg('dot', 'reward'), lg('ring', 'no measured delivery (0)'), capLg, swapLg])
    ]));
    /* on narrower screens the fleet switch moves into the fleet panel, next to what it changes, and on phones the
       rollout legend moves up under the lanes it explains */
    var mid = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null, phone = window.matchMedia ? window.matchMedia('(max-width: 760px)') : null;
    function placeSwitch() {
      var c = chEls.fleet;
      if (mid && mid.matches) { if (c.parentNode !== fleet) fleet.insertBefore(c, fleetGroups); }
      else if (c.parentNode !== bar) bar.insertBefore(c, chEls.loop);
      if (phone && phone.matches) { if (rollLg.parentNode !== stage) stage.insertBefore(rollLg, bufEl0); }
      else if (rollLg.parentNode !== root0) root0.appendChild(rollLg);
    }
    var bufEl0 = grid.parentNode, root0 = host.firstChild;
    placeSwitch();

    /* ------------------------------------------------ drawing */
    var S = null, ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, R = {}, col = {}, ramp = [];
    var bufEl = grid.parentNode, trainEl = tArea.parentNode;
    function rect(el) {
      var a = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
      return { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height };
    }
    function layout() {
      W = stage.clientWidth; H = stage.clientHeight;
      if (!W || !H) return false;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      R = { lanes: rect(lanesArea), grid: rect(grid), pips: rect(pips), t: rect(tArea), buf: rect(bufEl), train: rect(trainEl), fleet: rect(fleet), slot: {} };
      Object.keys(slotEls).forEach(function (id) { R.slot[id] = rect(slotEls[id].lastChild); });
      R.side = R.buf.x > R.lanes.x + R.lanes.w;
      var win = R.lanes.w < 560 ? 64 : 100;
      if (win !== WINDOW) { WINDOW = win; lanesArea.parentNode.style.setProperty('--rlp-window', String(WINDOW)); lanesArea.parentNode.classList.toggle('is-narrow', WINDOW < 100); }
      /* the rail note ends just left of where the return wire turns up into the lanes (x1 in drawRail) */
      stage.style.setProperty('--rlp-rail-r', Math.round(W - (R.lanes.x + R.lanes.w - 10) + 14) + 'px');
      placeCard(true);
      return R.lanes.w > 40;
    }
    function rgb(c) {
      if (c.charAt(0) === '#') { var n = parseInt(c.length === 4 ? c.replace(/(\w)/g, '$1$1').slice(1) : c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
      var m = c.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]];
    }
    function colors() {
      ['ink-2', 'ink-3', 'ink-4', 'line', 'line-2', 'bg', 'blue', 'blue-2', 'blue-3', 'violet', 'block', 'rlp-wait', 'rlp-cell', 'rlp-tile',
        'rlp-serve', 'rlp-train', 'rlp-score', 'rlp-probe', 'rlp-fmt', 'rlp-idle', 'rlp-lent', 'rlp-slot', 'rlp-lift']
        .forEach(function (k) { col[k] = UI.css('--' + k, host) || '#888'; });
      ramp = [0, 1, 2, 3].map(function (i) { return rgb(UI.css('--rlp-v' + i, host) || '#007FFF'); });
    }
    /* analysis shade by age of its weights: 0 newest (darkest in light mode) .. 3 oldest */
    function shade(age) {
      var i = UI.clamp(age, 0, 3), lo = Math.floor(i), hi = Math.min(3, lo + 1), f = i - lo, a = ramp[lo], b = ramp[hi];
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
    }
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      if (!(w > 0 && h > 0)) return;
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else ctx.rect(x, y, w, h);
    }
    function versionAt(t) { var v = S.version; S.swaps.forEach(function (s) { if (s.t > t) v--; }); return v; }
    function geo() {
      var g = R.lanes, top = g.y + 24, bot = g.y + g.h - 2, P = (bot - top) / N;
      var hm = Math.max(5, Math.round(P * 0.34)), ht = Math.max(2.5, Math.round(P * 0.14 * 2) / 2);
      return { top: top, bot: bot, P: P, hm: hm, ht: ht, right: g.x + g.w - 10, left: g.x, ppm: (g.w - 10) / WINDOW };
    }

    function drawLanes(G) {
      var now = S.now, last = S.swaps[S.swaps.length - 1], whole = cfg.roll === 'whole';
      var ease = last ? UI.easeOut(UI.seg(now, last.t, last.t + 1.1 * SPEED)) : 1;
      function X(t) { return G.right - (now - t) * G.ppm; }
      ctx.save();
      ctx.beginPath(); ctx.rect(G.left, G.top - 26, G.right - G.left + 12, G.bot - G.top + 30); ctx.clip();
      S.lanes.forEach(function (ln, i) {
        var ym = G.top + i * G.P + G.P * 0.5, yt = ym - G.ht - 2.5;
        ln.segs.forEach(function (s) {
          var a = Math.max(s.a, now - WINDOW - 4), b = Math.min(s.b, now);
          if (b <= a) return;
          var x0 = X(a), x1 = X(b), y = s.tr ? yt : ym, h = s.tr ? G.ht : G.hm;
          if (s.k === 'ana') {
            var cuts = [a];
            S.swaps.forEach(function (w) { if (w.t > a && w.t < b) cuts.push(w.t); });
            cuts.push(b);
            for (var c = 0; c < cuts.length - 1; c++) {
              /* the whole solver never trains, so its analysis keeps one shade */
              ctx.fillStyle = whole ? shade(1) : shade(S.version - versionAt((cuts[c] + cuts[c + 1]) / 2) - (1 - ease));
              ctx.fillRect(X(cuts[c]), y, X(cuts[c + 1]) - X(cuts[c]) + (c < cuts.length - 2 ? 0.5 : 0), h);
            }
          } else if (s.k === 'code') {   /* the whole solver's own coding, on the seat */
            ctx.fillStyle = col.block; ctx.fillRect(x0, y, x1 - x0, h);
          } else if (s.k === 'idle') {
            ctx.fillStyle = col['ink-4'];
            for (var d = Math.ceil(x0 / 5) * 5; d < x1; d += 5) ctx.fillRect(d, y + h / 2 - 0.5, 1.5, 1);
          } else {
            var thin = s.k === 'stage' || s.k === 'wait';
            ctx.fillStyle = thin ? col['rlp-wait'] : s.k === 'build' ? col.block : col.violet;
            var hh = thin ? Math.max(2, Math.round(h * 0.6)) : h;
            rr(x0, y + (h - hh) / 2, x1 - x0, hh, 1); ctx.fill();
          }
        });
        ln.marks.forEach(function (m) {
          if (m.t > now || m.t < now - WINDOW - 4) return;
          var x = X(m.t), r = G.ht + 0.6;
          if (m.k === 'cap') { ctx.fillStyle = col['ink-2']; rr(x - 1, ym - 3, 2, G.hm + 6, 1); ctx.fill(); return; }   /* the session clock ran out */
          ctx.beginPath(); ctx.arc(x, yt + G.ht / 2, r, 0, 7);
          if (m.k === 'dot') { ctx.fillStyle = col.block; ctx.fill(); }
          else { ctx.fillStyle = col['rlp-tile']; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = col.block; ctx.stroke(); }
        });
      });
      /* weight swaps: a dashed line that sweeps up the lanes when new weights land */
      var fs = UI.css('--sans'), fm = UI.css('--mono');
      S.swaps.forEach(function (w) {
        var x = Math.round(X(w.t)) + 0.5;
        if (x < G.left + 8) return;
        var p = UI.easeOut(UI.seg(now, w.t, w.t + 0.8 * SPEED)), y0 = G.bot - (G.bot - G.top + 14) * p;
        ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = col['ink-3'];
        ctx.beginPath(); ctx.moveTo(x, G.bot); ctx.lineTo(x, y0); ctx.stroke(); ctx.restore();
        ctx.globalAlpha = p; ctx.fillStyle = col['ink-2'];
        var lx = x + 26 > G.right + 10 ? x - 6 - 8 - 7 * String(w.v).length : x + 5;
        ctx.font = 'italic 500 14px ' + fs; ctx.fillText('π', lx, G.top - 9);
        ctx.font = '600 10px ' + fm; ctx.fillText(String(w.v), lx + 8, G.top - 5.5);
        ctx.globalAlpha = 1;
      });
      /* history fades out on the left */
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      var fg = ctx.createLinearGradient(G.left, 0, G.left + 64, 0);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg; ctx.fillRect(G.left - 2, G.top - 26, 66, G.bot - G.top + 30);
      ctx.restore();
      ctx.restore();
      /* a scale bar, so the stage lengths read in the paper's minutes */
      var sx1 = Math.round(G.right - 22) + 0.5, sx0 = Math.round(G.right - 22 - 20 * G.ppm) + 0.5, sy = Math.round(R.lanes.y + R.lanes.h + 19) + 0.5;
      ctx.strokeStyle = col['ink-3']; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx0, sy - 3); ctx.lineTo(sx0, sy + 3); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.moveTo(sx1, sy - 3); ctx.lineTo(sx1, sy + 3); ctx.stroke();
      ctx.font = '500 11px ' + fm; ctx.fillStyle = col['ink-3']; ctx.textAlign = 'right';
      ctx.fillText('20 min', sx0 - 7, sy + 4); ctx.textAlign = 'left';
    }

    function cellColor(r) { return r <= 0 ? col['rlp-cell'] : r < 0.05 ? col['blue-3'] : r < 0.15 ? col['blue-2'] : col.blue; }
    /* the grid: four rows of three slots, then a hairline labelled "dropped" over the tray's row */
    function tileGeo() {
      var g = R.grid, gx = 8, gy = 8, band = 18, w = (g.w - gx * 2) / 3;
      return { g: g, gx: gx, gy: gy, w: w, h: Math.min((g.h - band - gy * 4) / 5, w * 0.5), band: band };
    }
    function slotBox(i) { var c = tileGeo(); return { x: c.g.x + (i % 3) * (c.w + c.gx), y: c.g.y + Math.floor(i / 3) * (c.h + c.gy), w: c.w, h: c.h }; }
    function trayBox(k) { var c = tileGeo(); return { x: c.g.x + k * (c.w + c.gx), y: c.g.y + 4 * (c.h + c.gy) + c.band - c.gy, w: c.w, h: c.h }; }
    function drawBuffer() {
      var i, b, c = tileGeo(), fm = UI.css('--mono');
      for (i = 0; i < SLOTS; i++) {
        if (S.slots[i]) { groupAt(S.slots[i], slotBox(i)); continue; }
        b = slotBox(i);
        rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 4); ctx.strokeStyle = col.line; ctx.lineWidth = 1; ctx.stroke();
      }
      /* valid groups past the drawn slots wait off the grid */
      if (S.extra.length) {
        b = slotBox(SLOTS - 1);
        ctx.font = '600 10px ' + fm; ctx.fillStyle = col['ink-3']; ctx.textAlign = 'right';
        ctx.fillText('+' + S.extra.length, b.x + b.w, b.y + b.h + 11); ctx.textAlign = 'left';
      }
      var ly = Math.round(c.g.y + 4 * (c.h + c.gy) - c.gy + c.band / 2) + 0.5;
      ctx.font = '500 10px ' + fm; ctx.fillStyle = col['ink-3']; ctx.fillText('dropped', c.g.x, ly + 3.5);
      var tw = ctx.measureText('dropped').width + 6;
      ctx.strokeStyle = col['line-2']; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.g.x + tw, ly); ctx.lineTo(c.g.x + c.g.w, ly); ctx.stroke();
      for (i = 0; i < TRAY; i++) {
        b = trayBox(i);
        rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 4); ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = col.line; ctx.stroke(); ctx.restore();
      }
      /* tray tiles slide in from their slot, shift along, and the oldest fades out */
      for (i = S.tray.length - 1; i >= 0; i--) {
        var e = S.tray[i], p = UI.easeInOut(UI.seg(S.now, e.ts, e.ts + 0.4 * SPEED));
        var a = e.k0 < 0 ? (e.from >= 0 ? slotBox(e.from) : trayBox(0)) : trayBox(Math.min(e.k0, TRAY - 1)), z = trayBox(Math.min(e.k, TRAY - 1));
        groupAt(e.g, { x: UI.lerp(a.x, z.x, p), y: UI.lerp(a.y, z.y, p), w: z.w, h: z.h }, e.out != null ? 1 - UI.seg(S.now, e.out, e.out + POP * 2) : 1, e.from < 0 && e.k0 < 0 ? e.ts : null);
      }
      S.leaving.forEach(function (l) { groupAt(l.g, slotBox(l.i)); });
    }
    /* one group: a tile with its eight rewards (dashed: no spread; gray: dropped as stale); a taken group's squares fly to
       the trainer. A still frame draws every entrance finished. */
    function groupAt(g, b, alpha, born) {
      var now = S.now, tc = { x: R.t.x + R.t.w / 2, y: R.t.y + R.t.h / 2 }, t0 = UI.reduced() ? -1e9 : born != null ? born : g.t0;
      var q = Math.floor(Math.min((b.w - (b.w < 50 ? 10 : 18)) / 4, (b.h - (b.h < 24 ? 5 : 12)) / 2)), fade = alpha == null ? 1 : alpha;
      var ox = b.x + (b.w - (q * 4 + 6)) / 2, oy = b.y + (b.h - (q * 2 + 2)) / 2;
      if (g.st !== 'fly') {
        rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 4);
        ctx.globalAlpha = fade * UI.seg(now, t0, t0 + POP);
        ctx.fillStyle = col['rlp-tile']; ctx.fill();
        if (!g.valid) { ctx.save(); ctx.setLineDash([3, 2.5]); ctx.strokeStyle = col['ink-4']; ctx.stroke(); ctx.restore(); }
        else { ctx.strokeStyle = g.st === 'gone' ? col['ink-4'] : col.line; ctx.stroke(); }
      }
      for (var k = 0; k < GROUP; k++) {
        var sx = ox + (k % 4) * (q + 2), sy = oy + Math.floor(k / 4) * (q + 2);
        var p = UI.easeOut(UI.seg(now, t0 + k * 0.035 * SPEED, t0 + k * 0.035 * SPEED + POP)), a = p * fade, s = 0.55 + 0.45 * p;
        if (g.st === 'fly') {
          var f = UI.easeInOut(UI.seg(now, g.tx + k * 0.03 * SPEED, g.tx + k * 0.03 * SPEED + FLY));
          sx = UI.lerp(sx, tc.x - q / 2, f); sy = UI.lerp(sy, tc.y - q / 2, f); a = 1 - UI.seg(f, 0.75, 1); s = 1 - 0.4 * f;
        }
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = g.valid && g.st !== 'gone' ? cellColor(g.r[k]) : col['rlp-cell'];
        rr(sx + q * (1 - s) / 2, sy + q * (1 - s) / 2, q * s, q * s, 1.5); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    /* the last 24 groups in arrival order, newest at the bottom right: blue kept, dashed filtered, gray dropped */
    function drawTally() {
      var a = R.pips, q = 8, gp = 3, per = 12, n = 24, o = S.fates.slice(-n);
      for (var i = 0; i < n; i++) {
        var k = o[i - (n - o.length)], x = a.x + (i % per) * (q + gp) + 0.5, y = a.y + Math.floor(i / per) * (q + gp) + 0.5;
        rr(x, y, q - 1, q - 1, 1.6);
        if (!k) { ctx.strokeStyle = col.line; ctx.lineWidth = 1; ctx.stroke(); }
        else if (k === 'valid') { ctx.fillStyle = col.blue; ctx.fill(); }
        else if (k === 'stale') { ctx.fillStyle = col['ink-4']; ctx.fill(); }
        else { ctx.fillStyle = col['rlp-cell']; ctx.fill(); ctx.save(); ctx.setLineDash([2, 1.5]); ctx.strokeStyle = col['ink-3']; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
      }
    }
    function drawTrainer() {
      var T = S.T, a = R.t, p = T.busy ? UI.seg(S.now, T.t0, T.t1) : 0, q = 7, gp = 3, per = Math.max(1, Math.floor((a.w + gp) / (q + gp)));
      ctx.fillStyle = col['line-2']; ctx.fillRect(a.x, a.y + a.h - 2, a.w, 2);
      if (!T.busy) return;
      ctx.fillStyle = col.blue; ctx.fillRect(a.x, a.y + a.h - 2, a.w * p, 2);
      /* the step's groups: they arrive with the flyers and darken as the step works through them */
      var arrive = UI.seg(S.now, T.t0 + FLY * 0.6, T.t0 + FLY * 1.3);
      for (var i = 0; i < T.n; i++) {
        var x = a.x + (i % per) * (q + gp), y = a.y + Math.floor(i / per) * (q + gp);
        ctx.globalAlpha = arrive * (i / T.n < p ? 1 : 0.38);
        ctx.fillStyle = col.blue; rr(x, y, q, q, 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    /* the way back: trainer -> servers, in the strip between the stage and the fleet; a pulse carries each export */
    function drawRail(G) {
      if (!R.side) return;
      var x0 = Math.round(R.train.x + R.train.w / 2) + 0.5, y0 = R.train.y + R.train.h, x1 = Math.round(G.right) + 0.5, y1 = R.lanes.y + R.lanes.h + 6;
      var yr = Math.round(R.lanes.y + R.lanes.h + (R.fleet.y - R.lanes.y - R.lanes.h) * 0.62) + 0.5;
      ctx.strokeStyle = col.blue; ctx.lineWidth = 1.25; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, yr); ctx.lineTo(x1, yr); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1 - 4, y1 + 5); ctx.lineTo(x1, y1); ctx.lineTo(x1 + 4, y1 + 5); ctx.stroke();
      ctx.globalAlpha = 1;
      if (S.swapAt == null) return;
      var len1 = yr - y0, len2 = x0 - x1, len3 = yr - y1, tot = len1 + len2 + len3;
      var d = UI.easeInOut(UI.seg(S.now, S.pulse0, S.swapAt)) * tot, px, py;
      if (d < len1) { px = x0; py = y0 + d; } else if (d < len1 + len2) { px = x0 - (d - len1); py = yr; } else { px = x1; py = yr - (d - len1 - len2); }
      ctx.fillStyle = col.blue;
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(px, py, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    function drawFlyers(G) {
      if (R.side) {
        var ax = R.buf.x - 9, ay = Math.round(R.lanes.y + R.lanes.h / 2);
        ctx.fillStyle = col['ink-3']; ctx.beginPath(); ctx.moveTo(ax, ay - 4); ctx.lineTo(ax + 5, ay); ctx.lineTo(ax, ay + 4); ctx.fill();
      }
      if (!S.flyers.length) return;
      var ix = R.side ? R.buf.x - 10 : R.buf.x + R.buf.w / 2, iy = R.side ? R.lanes.y + R.lanes.h / 2 : R.buf.y - 2;
      S.flyers.forEach(function (f) {
        var p = UI.easeInOut(UI.seg(S.now, f.t0, f.t0 + FLY)), ym = G.top + f.li * G.P + G.P * 0.5, y0 = ym - G.ht / 2 - 2.5, x0 = G.right;
        var cx = R.side ? x0 + 26 : x0, cy = R.side ? y0 : iy - 30;
        var x = (1 - p) * (1 - p) * x0 + 2 * (1 - p) * p * cx + p * p * ix, y = (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * cy + p * p * iy;
        ctx.globalAlpha = 1 - UI.seg(p, 0.7, 1);
        ctx.beginPath(); ctx.arc(x, y, (G.ht + 0.6) * (1 - 0.35 * p), 0, 7);
        if (f.k === 'dot') { ctx.fillStyle = col.block; ctx.fill(); } else { ctx.lineWidth = 1.2; ctx.strokeStyle = col.block; ctx.stroke(); }
      });
      ctx.globalAlpha = 1;
    }

    /* ------------------------------------------------ the fleet: 14 nodes of 8 GPUs in 17 slots */
    function cellGeo(b) {
      var pad = 3, gp = b.w >= 112 ? 3 : 2, c = Math.floor(Math.min((b.w - 2 * pad - 7 * gp) / 8, b.h - 2 * pad));
      return { pad: pad, gp: gp, c: c, w: 8 * c + 7 * gp + 2 * pad, h: c + 2 * pad };
    }
    /* a node's frame: dashed blue for a lent node (drawn on clockwise as it starts to drain), lifted while it travels */
    function frame(x, y, w, h, kind, p) {
      rr(x + 0.5, y + 0.5, w - 1, h - 1, 4);
      if (kind === 'lift') {
        ctx.save(); ctx.shadowColor = col['rlp-lift']; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
        ctx.fillStyle = col.bg; ctx.fill(); ctx.restore();
        kind = 'lent';
      }
      ctx.save(); ctx.lineWidth = kind === 'lent' ? 1.3 : 1; ctx.strokeStyle = col[kind === 'lent' ? 'rlp-lent' : 'rlp-slot'];
      ctx.setLineDash(kind === 'lent' ? (p != null && p < 1 ? [2 * (w + h) * p, 2 * (w + h)] : [4, 3]) : [3, 3]);
      ctx.stroke(); ctx.restore();
    }
    function cells(x, y, gq, fill) {
      for (var i = 0; i < 8; i++) {
        var cx = x + gq.pad + i * (gq.c + gq.gp), cy = y + gq.pad, f = fill(i);
        if (f) {
          ctx.globalAlpha = f.a == null ? 1 : f.a; ctx.fillStyle = f.c; rr(cx, cy, gq.c, gq.c, 2); ctx.fill();
          if (f.flash) { ctx.globalAlpha = f.flash; ctx.fillStyle = col.bg; rr(cx, cy, gq.c, gq.c, 2); ctx.fill(); }
          ctx.globalAlpha = 1;
        } else {   /* idle, kept reserved */
          ctx.save(); ctx.setLineDash([2, 1.6]); ctx.lineWidth = 1; ctx.strokeStyle = col['rlp-idle'];
          rr(cx + 0.5, cy + 0.5, gq.c - 1, gq.c - 1, 1.6); ctx.stroke(); ctx.restore();
        }
      }
    }
    var JOBC = { score: 'rlp-score', probe: 'rlp-probe', fmt: 'rlp-fmt' };
    function nodeFill(n) {
      var now = S.now;
      if (n.role === 'M') return function (i) {
        var c = n.cards[i];
        return c && c.job ? { c: col[JOBC[c.job.kind]], a: 0.4 + 0.6 * UI.seg(now, c.a, c.a + 0.25 * SPEED) } : null;
      };
      if (n.role === 'T') return function (i) {
        return S.T.busy && n.inStep ? { c: col['rlp-train'], a: UI.seg(now, S.T.t0 + i * 0.03 * SPEED, S.T.t0 + (i * 0.03 + 0.25) * SPEED) } : null;
      };
      /* serving: replicas fill with the load; new weights sweep across them as they load in place */
      var load = n.st === 'on' ? Math.min(1, S.D / Math.max(1, S.C)) * 8 : 0, w = S.swaps[S.swaps.length - 1];
      return function (i) {
        var on = n.st === 'join' ? 0.35 * UI.seg(now, n.t0 + i * 0.03 * SPEED, n.t0 + (i * 0.03 + 0.25) * SPEED) : UI.clamp(load - i, 0, 1);
        if (on <= 0.02) return null;
        var t0 = w ? w.t + i * 0.05 * SPEED : 0, fl = w && now >= t0 ? 1 - UI.seg(now, t0, t0 + 0.45 * SPEED) : 0;
        return { c: col['rlp-serve'], a: 0.35 + 0.65 * on, flash: fl * 0.55 };
      };
    }
    function drawFleet() {
      var now = S.now, at = {}, fm = UI.css('--mono'), flying = null;
      S.nodes.forEach(function (n) { if (n.st === 'fly') flying = n; else at[n.slot] = n; });
      /* empty slots: room for a lent node, or the hole a lent node left in the pool */
      Object.keys(R.slot).forEach(function (id) {
        if (at[id]) return;
        var b = R.slot[id], gq = cellGeo(b), y = b.y + (b.h - gq.h) / 2;
        frame(b.x, y, gq.w, gq.h, 'empty');
        var away = id.charAt(0) === 'M' && S.nodes.filter(function (n) { return n.home === id && n.slot !== id && n.st !== 'fly'; })[0];
        if (away) { ctx.font = '500 10px ' + fm; ctx.fillStyle = col['ink-3']; ctx.textAlign = 'center'; ctx.fillText('lent to ' + away.slot, b.x + gq.w / 2, y + gq.h / 2 + 3.5); ctx.textAlign = 'left'; }
      });
      S.nodes.forEach(function (n) {
        if (n === flying) return;
        var b = R.slot[n.slot];
        if (!b) return;
        var gq = cellGeo(b), y = b.y + (b.h - gq.h) / 2;
        if (n.lent || n.st === 'drain' && n.to && n.to.charAt(0) !== 'M') frame(b.x, y, gq.w, gq.h, 'lent', n.st === 'drain' && n.role === 'M' ? UI.easeOut(UI.seg(now, n.t0, n.t0 + 0.4 * SPEED)) : 1);
        if (n.role === 'M' && n.land && !n.lent && now < n.land + 0.4 * SPEED) frame(b.x, y, gq.w, gq.h, 'lent', 1 - UI.seg(now, n.land, n.land + 0.4 * SPEED));   /* back home: the outline undraws */
        cells(b.x, y, gq, nodeFill(n));
      });
      if (!flying) return;
      /* a moving node lifts and travels its arc; a faint dashed path marks the role change, as in the paper's figure */
      var a = R.slot[flying.from], z = R.slot[flying.to];
      if (!a || !z) return;
      var gq = cellGeo(a), p = UI.easeInOut(UI.seg(now, flying.t0, flying.t1));
      var ax = a.x, ay = a.y + (a.h - gq.h) / 2, zx = z.x, zy = z.y + (z.h - gq.h) / 2;
      var cx = (ax + zx) / 2, cy = Math.min(ay, zy) - UI.clamp(Math.abs(zx - ax) * 0.05 + Math.abs(zy - ay) * 0.25, 8, 26);
      var x = (1 - p) * (1 - p) * ax + 2 * (1 - p) * p * cx + p * p * zx, y = (1 - p) * (1 - p) * ay + 2 * (1 - p) * p * cy + p * p * zy;
      ctx.save(); ctx.globalAlpha = 0.45 * (1 - UI.seg(p, 0.8, 1)); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.strokeStyle = col['rlp-lent'];
      ctx.beginPath(); ctx.moveTo(ax + gq.w / 2, ay + gq.h / 2); ctx.quadraticCurveTo(cx + gq.w / 2, cy + gq.h / 2, zx + gq.w / 2, zy + gq.h / 2); ctx.stroke(); ctx.restore();
      var s = 1 + 0.05 * Math.sin(Math.PI * p);
      ctx.save(); ctx.translate(x + gq.w / 2, y + gq.h / 2); ctx.scale(s, s); ctx.translate(-gq.w / 2, -gq.h / 2);
      frame(0, 0, gq.w, gq.h, 'lift'); cells(0, 0, gq, function () { return null; });
      ctx.restore();
    }

    /* ------------------------------------------------ text that follows the sim, written only when it changes */
    var last = {};
    function put(key, el, prop, val) { if (last[key] !== val) { last[key] = val; el[prop] = val; } }
    function fleetStatus() {
      var mv = S.move, b = S.bn, J = { S: 'Serving', T: 'Training', M: 'Measurement' }, nT = S.onNodes('T');
      if (cfg.roll === 'whole') return 'No group has reward spread, so the trainers sit idle and the pool has almost nothing to measure.';
      if (cfg.loop === 'sync') {
        var ph = S.batch && S.batch.phase;
        if (ph === 'train') return 'While the batch trains, the servers and the measurement pool sit idle.';
        if (ph === 'load' || ph === 'next') return 'Everything waits while the new weights load.';
        return 'The trainers sit idle until the slowest rollout is scored.';
      }
      if (mv && !(mv.role === 'M' && b && b !== 'M')) {
        var pool = mv.from.charAt(0) === 'M';
        if (mv.role === 'M') return b === 'M' ? '<b>Measurement is the bottleneck:</b> a lent node drains and returns to the pool.'
          : '<b>' + J[mv.from.charAt(0)] + ' has room again:</b> its lent node drains and returns to the pool.';
        if (mv.role === 'T') return '<b>Training is the bottleneck:</b> ' + (pool ? 'a pool node drains, then joins the next step as a helper.' : 'the lent server node drains, then joins training.');
        return '<b>Serving is the bottleneck:</b> ' + (pool ? 'a pool node drains, then serves the policy as eight more replicas.' : 'a lent trainer node drains, then serves the policy.');
      }
      if (!b && S.relief && S.now - S.relief.t < P.RELIEF) return S.relief.role === 'S' ? '<b>Serving has room again:</b> the lent node serves as eight more replicas.'
        : '<b>Training has room again:</b> with ' + (nT >= 3 ? 'two helpers, a step runs ' + X2 : 'one helper, a step runs ' + X1) + '× faster.';
      if (!b) return 'Serving, training and measurement all have room.';
      var why = { S: 'every replica is busy, so analyses slow down',
        T: 'valid groups arrive faster than steps take them, so ' + (S.paused ? 'new analyses pause' : 'the buffer grows'), M: 'deliveries wait for a free pool card' }[b];
      return '<b>' + J[b] + ' is the bottleneck:</b> ' + why + (cfg.fleet === 'fixed' && b !== 'M' ? '; no node can join it.' : '.');
    }
    /* the bottleneck: a raised card that glides behind the job under most pressure, like the switches' sliding thumb */
    function placeCard(jump) {
      var b = S && S.bn, on = !!b && cfg.loop === 'async' && cfg.roll === 'ana', was = placeCard.was;
      placeCard.was = on ? b : null;
      card.classList.toggle('on', on);
      Object.keys(headEls).forEach(function (r) { headEls[r].classList.toggle('is-bn', on && r === b); });
      clearTimeout(placeCard.tm);
      if (!on) return;
      /* frame the heading and the slots actually drawn, not the whole stretched column */
      function put() {
        var fr = fleet.getBoundingClientRect(), reg = headEls[b].parentNode, rg = reg.getBoundingClientRect(), sl = reg.querySelector('.rlp-slots');
        var slots = reg.querySelectorAll('.rlp-slot'), bottom = slots[slots.length - 1].getBoundingClientRect().bottom;
        card.style.transform = 'translate(' + Math.round(rg.left - fr.left - 8) + 'px,' + Math.round(rg.top - fr.top - 6) + 'px)';
        card.style.width = Math.round(Math.max(headEls[b].scrollWidth, sl.scrollWidth) + 16) + 'px';
        card.style.height = Math.round(bottom - rg.top + 15) + 'px';
      }
      function snap() { card.style.transition = 'none'; put(); void card.offsetWidth; card.style.transition = ''; card.style.opacity = ''; }
      if (jump) snap();
      else if (was && was !== b && was !== 'M' && b !== 'M') {   /* servers <-> trainers: fade out, jump, fade in, rather than sweep across the pool */
        card.style.opacity = '0';
        placeCard.tm = setTimeout(snap, UI.reduced() ? 0 : 300);
      } else put();
    }
    function updateDom() {
      var T = S.T, sync = cfg.loop === 'sync', whole = cfg.roll === 'whole', b = S.batch, ready = S.validReady().length, txt, on;
      if (whole) txt = 'waiting for a group with reward spread';
      else if (T.busy) txt = sync ? 'training on the whole batch' : 'training a step' + (T.nodes === 2 ? ' · 1 helper, ' + X1 + '× speed' : T.nodes === 3 ? ' · 2 helpers, ' + X2 + '× speed' : '');
      else if (S.swapAt != null) txt = sync ? 'loading the new weights' : 'loading weights in place · ' + L.weightLoadSeconds + ' s';
      else txt = sync ? 'idle until the whole batch is scored' : 'waiting for ' + STEP_MIN + ' valid groups';
      put('st', status, 'textContent', txt);
      on = !whole && (sync ? !!(b && b.phase === 'gap') : ready >= STEP_MIN) || T.busy && S.now < T.t0 + FLY;
      put('gate', gate, 'className', 'rlp-gate' + (on ? ' on' : ''));
      put('busy', trainEl, 'className', 'rlp-train' + (T.busy ? ' busy' : '') + (whole ? ' is-idle' : ''));
      var v = whole ? S.version + 1 : T.busy || S.swapAt != null ? T.target : S.version;   /* the whole solver: the step that never comes */
      put('eq', eq, 'textContent', 'π' + sub(v) + ' = π' + sub(v - 1) + ' + η∇J');
      /* the status line changes at once with its subject (bottleneck, move, phase), otherwise at most every 8 sim minutes */
      var subj = [S.bn, S.bn === 'T' && S.paused, S.move && S.move.to, S.relief && S.now - S.relief.t < P.RELIEF && S.relief.t, b && b.phase].join('|');
      if (subj !== last.subj || S.now - last.fsT >= 8) { last.subj = subj; last.fsT = S.now; put('fs', fstat, 'innerHTML', fleetStatus()); }
      /* the pool heading counts deliveries waiting for a card */
      put('mq', queueEl, 'textContent', S.qw ? '· ' + S.qw + (S.qw > 1 ? ' deliveries' : ' delivery') + ' waiting' : '');
      if (last.bn !== (S.bn || '')) { last.bn = S.bn || ''; placeCard(false); }
      Object.keys(slotEls).forEach(function (id) {
        var n = S.nodeAt(id), k = !n || n.st === 'fly';
        if (last['s' + id] !== k) { last['s' + id] = k; slotEls[id].classList.toggle('is-empty', k); }
      });
    }
    function draw() {
      if (!W || !S) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var G = geo();
      drawLanes(G); drawBuffer(); drawTally(); drawTrainer(); drawRail(G); drawFlyers(G); drawFleet();
      updateDom();
    }

    /* ------------------------------------------------ loop, modes, controls */
    var still = false, shown = false, near = false, EV = {};
    /* where a setup's run is first worth watching: with elastic nodes, just before its first node move; in the
       synchronous loop, just before the second batch's last score. The run is deterministic, so that time is found once
       per setup and each switch replays the run to a little before it: the event comes about a second after a switch
       (three on first view, as the section scrolls in), and a still frame shows it done. */
    function eventTime(o) {
      var key = o.roll + o.fleet + o.loop, k = 0, seen = 0, ph, prev = null, T;
      if (key in EV) return EV[key];
      T = makeSim(o);
      if (o.loop === 'sync') {
        T.warm(1);
        while (k++ < 6000) {
          T.step(0.25); ph = T.batch && T.batch.phase;
          if (ph !== prev && (ph === 'gap' || o.roll === 'whole' && ph === 'next') && ++seen === 2) break;
          prev = ph;
        }
      } else {
        T.warm(170);
        if (o.fleet === 'elastic' && o.roll === 'ana') while (!T.move && k++ < 600) T.step(0.25);
      }
      return (EV[key] = T.now);
    }
    function setMode() {
      var o = { roll: cfg.roll, fleet: cfg.fleet, loop: cfg.loop, seed: (cfg.roll === 'whole' ? 23 : 7) + (cfg.loop === 'sync' ? 12 : 0) + (cfg.fleet === 'fixed' ? 5 : 0) };
      var lead = still || cfg.loop === 'async' && !(cfg.fleet === 'elastic' && cfg.roll === 'ana') ? 0 : cfg.loop === 'sync' ? 8 : shown ? 3 : 9;
      var te = eventTime(o);
      S = makeSim(o);
      S.warm(Math.max(1, te - lead));
      if (still) S.settle();
      S.live = true;
      title.textContent = TITLE[cfg.roll];
      /* captions are rewritten only when they change, so a switch announces just its own */
      CH.forEach(function (c) {
        var t = caption(c);
        if (chLast[c.key] !== t) { chLast[c.key] = t; chText[c.key].innerHTML = t; }
        chEls[c.key].classList.toggle('is-fix', cfg[c.key] === c.fix);
        if (!shown) chText[c.key].setAttribute('aria-live', 'polite');
      });
      shown = true;
      var r = readout();
      roN.textContent = r[0]; roL1.textContent = r[1]; roL2.textContent = r[2];
      gate.innerHTML = GATE[cfg.roll === 'whole' ? 'async' : cfg.loop];
      railNote.textContent = cfg.roll === 'whole' ? 'no step has run, so the servers keep the first weights'
        : cfg.loop === 'async' ? 'new weights load in place in ' + L.weightLoadSeconds + ' s; sessions in flight continue on them' : 'new weights load only after the whole batch has trained';
      buildLg.lastChild.textContent = cfg.roll === 'whole' ? 'coding (the solver itself)' : 'build (frozen Opus 5)';
      capLg.hidden = cfg.roll !== 'whole'; swapLg.hidden = cfg.roll === 'whole'; lentLg.hidden = cfg.roll === 'whole' || cfg.fleet === 'fixed';
      last = {};
      draw(); placeCard(true); loop();
    }
    function frameFn(ts) {
      raf = 0;
      if (!running) return;
      var dt = t0 ? Math.min(0.05, (ts - t0) / 1000) : 0;
      t0 = ts;
      try { S.step(dt * SPEED); draw(); }
      catch (err) { running = false; if (window.console) console.warn('rl/rl-pipeline:', err); return; }
      raf = requestAnimationFrame(frameFn);
    }
    var running = false, visible = false, paused = false, raf = 0, t0 = 0, root = host.firstChild;
    function loop() {
      var go = !!S && visible && !paused && !document.hidden && !UI.reduced();
      root.classList.toggle('is-still', !go);
      if (go && !running) { running = true; t0 = 0; raf = requestAnimationFrame(frameFn); }
      else if (!go && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    }
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.classList.toggle('is-paused', paused);
      pauseBtn.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
      loop();
    });
    function reducedUI() { pauseBtn.hidden = UI.reduced(); still = UI.reduced() || !!UI.revealAll; }
    colors(); reducedUI();
    /* the sim is built when the section comes near, or at once for a still frame, a full-page view or print */
    function start() { near = true; if (!S && layout()) setMode(); }
    if (still) start(); else UI.onVisible(stage, start, '1000px 0px');
    window.addEventListener('beforeprint', start);
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (near && layout()) { if (S) draw(); else setMode(); } }).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (S && layout()) draw(); });
    [mid, phone].forEach(function (q) { if (q) { if (q.addEventListener) q.addEventListener('change', placeSwitch); else q.addListener(placeSwitch); } });
    UI.watch(stage, function (v) { visible = v; loop(); });
    document.addEventListener('visibilitychange', loop);
    UI.onTheme(function () { colors(); if (S) draw(); });
    UI.onReducedChange(function () { reducedUI(); if (S) setMode(); loop(); });
  });
})();
