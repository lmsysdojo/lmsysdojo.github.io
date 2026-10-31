/* pillars: the overview's three cards as one loop. Adds a card-wide button and a "selected" tag to each card, a detail
 * panel for the active card (auto-advancing while in view and idle), three code-drawn mini illustrations, and an SVG
 * overlay whose connectors carry particles between the cards. Every number shown comes from the paper (data.js). */
(function () {
  'use strict';
  var UI = window.LMSDUI;
  var host = document.querySelector('#overview .pillars[data-mount="pillars"]');
  if (!UI || !host) return;
  var cards = Array.prototype.slice.call(host.querySelectorAll('.pillar'));
  if (cards.length !== 3) return;

  /* a failure anywhere leaves the static cards exactly as the HTML wrote them */
  try { build(); } catch (err) {
    host.classList.remove('pl-on', 'pl-pre');
    Array.prototype.forEach.call(document.querySelectorAll('#overview .pillar-hit, #overview .pillar-tag, #overview .pl-loop, #pl-detail'), function (n) { n.parentNode.removeChild(n); });
  }

  function build() {
    var S = UI.svg, E = UI.el;
    var L = window.LMSD || {};
    var dojo = L.dojo || {}, rl = L.rl || {}, checks = L.checks || {};

    function pick(get, fallback) { try { var v = get(); return v == null ? fallback : v; } catch (e) { return fallback; } }
    var funnel = pick(function () {
      var f = dojo.funnel.map(function (x) { return x.total; });
      return f.length === 3 && f.every(isFinite) ? f : null;
    }, [39411, 900, 100]);
    var rlRows = pick(function () { return rl.table.rows; }, null);
    var rlBase = pick(function () { return rlRows[1].held[3]; }, 7.4);
    var rlTrained = pick(function () { return rlRows[2].held[3]; }, 16.3);

    /* the detail panel's content, one entry per card; wording follows the paper */
    var DETAIL = [
      {
        title: 'Real performance PRs, rebuilt as sealed playgrounds',
        nums: [
          [UI.fmt(funnel[0]), 'merged vLLM and SGLang PRs scanned'],
          [UI.fmt(funnel[1]), 'measured, reproducible setups'],
          [UI.fmt(funnel[2]), 'items in LMSysDojo-100']
        ],
        text: 'Each merged PR is used only offline, to rebuild the pre-PR deployment into a playground driven by GuideLLM on real GPUs. With no internet access and the PR text, git history and expert fix sealed away, the agent sees the baseline source, a setup card, pre-recorded profiles and the node’s GPUs. Filtering the measured setups for clean measurement and headroom above the ' + pick(function () { return dojo.noiseFloor.toFixed(3); }, '1.075') + '× noise floor, then keeping every qualifying post-cutoff item and a stratified sample of earlier ones, yields LMSysDojo-100.',
        href: '#dojo', link: 'Explore the environment'
      },
      {
        title: 'Predict the gain before building it',
        nums: [
          ['73–83%', 'of the expert’s gain on the held-out splits, from 57–60% for a single agent'],
          ['K = 10', 'parallel analyses per item; only the highest predicted gain is built and measured'],
          [pick(function () { return checks.stopped; }, 48) + '%', 'of held-out candidates rejected by the checks before anything is built']
        ],
        text: 'An analyzer locates where the deployment loses performance, proposes a mechanism and predicts its gain; a separate implementer builds the mechanism from the analysis alone. Structured analyses ship the prediction as a program, analyze(C, E, A), over profile queries, the analyzer’s own evidence and stated assumptions, and a sensitivity check and an assumption audit examine it first.',
        code: 'analyze(C, E, A)',
        href: '#gap', link: 'Explore gap analysis'
      },
      {
        title: 'Train the analyzer on measured gains',
        nums: [
          [pick(function () { return rl.loop.medianMinutes; }, 42) + ' min', 'median time for one reward: analysis, build and GPU measurement'],
          ['4.7×', 'groups trained per hour versus a synchronous loop'],
          [rlBase + '% → ' + rlTrained + '%', 'of the expert’s gain at K = 8 on LMSysDojo-100’s held-out items as RL trains the 9B analyzer, matching an untrained Qwen3.5-27B of the same family']
        ],
        text: 'Analysis RL trains only the analyzer with GRPO, while a frozen Opus 5 implementer builds each analysis as written. The reward comes from the measured speedup; the predicted gain never enters it, so over-claiming cannot raise it. An asynchronous infrastructure lets acting, scoring and learning each run at its own pace.',
        href: '#rl', link: 'Explore analysis RL'
      }
    ];
    var ROLES = cards.map(function (c, i) {
      var r = c.querySelector('.pillar-role'), t = c.querySelector('.pillar-title');
      return { no: '0' + (i + 1), role: r ? r.textContent.trim() : '', title: t ? t.textContent.trim() : '' };
    });

    /* ---------------------------------------------------------------- cards: one button each, plus the tag */
    var active = 0, stopped = false, reduced = UI.reduced();
    var hits = cards.map(function (c, i) {
      var b = E('button', {
        class: 'pillar-hit', type: 'button', 'aria-controls': 'pl-detail', 'aria-pressed': 'false',
        'aria-label': 'Show details: ' + ROLES[i].no + ' ' + ROLES[i].role + ', ' + ROLES[i].title
      });
      c.insertBefore(b, c.firstChild);
      c.appendChild(E('span', { class: 'pillar-tag', 'aria-hidden': 'true', text: 'selected' }));
      b.addEventListener('click', function () { setActive(i, true); });
      b.addEventListener('focus', function () { setActive(i, true); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        hits[(i + d + 3) % 3].focus();
      });
      /* a short hover intent, so sweeping across the row does not flicker the card in between */
      c.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { setActive(i, true); }, 90);
      });
      c.addEventListener('pointerleave', function () { clearTimeout(hoverTimer); });
      return b;
    });
    var hoverTimer = 0;
    host.classList.add('pl-on');

    /* ---------------------------------------------------------------- detail panel */
    var tabs = [];
    var dBody = E('div', { class: 'pl-d-body', 'aria-live': 'polite' });
    var dKick = E('span', { class: 'pl-d-k' });
    var dTabs = E('div', { class: 'pl-d-tabs', role: 'group', 'aria-label': 'Choose a part' });
    ROLES.forEach(function (r, i) {
      var t = E('button', { class: 'pl-d-tab', type: 'button', 'aria-controls': 'pl-detail', 'aria-pressed': 'false', 'aria-label': r.no + ' ' + r.role + ': ' + r.title }, [
        E('span', { class: 'pl-d-tab-no', text: r.no }),
        E('span', { class: 'pl-d-bar', 'aria-hidden': 'true' }, [E('i')])
      ]);
      t.addEventListener('click', function () { setActive(i, true); });
      dTabs.appendChild(t);
      tabs.push(t);
    });
    var detail = E('div', { class: 'pl-detail', id: 'pl-detail', role: 'region', 'aria-label': 'Details of the selected part' }, [
      E('div', { class: 'pl-d-head' }, [dKick, dTabs]),
      dBody,
      E('p', { class: 'pl-d-note' }, [E('span', { class: 'tag-note', text: 'schematic' }), E('span', { text: 'Card illustrations explain the idea; every number shown is from the paper.' })])
    ]);
    host.parentNode.insertBefore(detail, host.nextSibling);

    function richText(d) {
      var p = E('p', { class: 'pl-d-text' });
      var parts = d.code ? d.text.split(d.code) : [d.text];
      parts.forEach(function (s, k) {
        if (k) p.appendChild(E('code', { text: d.code }));
        p.appendChild(document.createTextNode(s));
      });
      return p;
    }
    function renderDetail(i) {
      var d = DETAIL[i];
      dBody.textContent = '';
      dBody.appendChild(E('div', { class: 'pl-d-main' }, [
        E('h3', { class: 'pl-d-title', text: d.title }),
        richText(d),
        E('a', { class: 'pl-d-link', href: d.href }, [d.link + ' ', E('span', { 'aria-hidden': 'true', text: '→' })])
      ]));
      dBody.appendChild(E('dl', { class: 'pl-d-nums' }, d.nums.map(function (n) {
        return E('div', { class: 'pl-d-num' }, [E('dt', { text: n[1] }), E('dd', { text: n[0] })]);
      })));
    }

    var swapTimer = 0;
    function setActive(i, byUser) {
      if (byUser) { idle = 0; stopped = true; dBody.setAttribute('aria-live', 'polite'); }
      if (i === active && detail.__ready) return;
      active = i;
      detail.__ready = true;
      cards.forEach(function (c, k) {
        c.classList.toggle('is-active', k === i);
        hits[k].setAttribute('aria-pressed', k === i ? 'true' : 'false');
        tabs[k].setAttribute('aria-pressed', k === i ? 'true' : 'false');
      });
      flow.setActive(i);
      progress(fill());
      dKick.textContent = ROLES[i].no + ' · ' + ROLES[i].role + ' · ' + ROLES[i].title;
      clearTimeout(swapTimer);
      if (reduced || !dBody.firstChild) { renderDetail(i); return; }
      dBody.classList.add('pl-out');
      swapTimer = setTimeout(function () { renderDetail(active); dBody.classList.remove('pl-out'); }, 170);
    }

    /* ---------------------------------------------------------------- the loop: connectors with flowing particles */
    var flow = (function () {
      var FLOWS = [
        { from: 0, to: 1, label: ['setup + profiles'], c: '--blue', t: '--blue-ink' },
        { from: 1, to: 0, label: ['one patch,', 'one measurement'], c: '--block', t: '--ink' },
        { from: 0, to: 2, label: ['measured reward'], c: '--violet', t: '--violet' },
        { from: 2, to: 1, label: ['trained analyzer'], c: '--blue', t: '--blue-ink' }
      ];
      var svg = S('svg', { class: 'pl-loop', 'aria-hidden': 'true', focusable: 'false' });
      host.insertBefore(svg, host.firstChild);
      FLOWS.forEach(function (f) {
        f.g = S('g', { class: 'pl-flow', style: { '--c': 'var(' + f.c + ')', '--t': 'var(' + f.t + ')' } });
        f.path = S('path', { class: 'pl-path', pathLength: 1 });
        f.port = S('circle', { class: 'pl-port', r: 2.6 });
        f.arrow = S('path', { class: 'pl-arrow' });
        f.plate = S('rect', { class: 'pl-plate', rx: 4 });
        f.text = S('text', { class: 'pl-label' });
        f.dots = [];
        f.speed = 30; f.glow = 0; f.s = 0;
        [f.path, f.arrow, f.port, f.plate, f.text].forEach(function (n) { f.g.appendChild(n); });
        svg.appendChild(f.g);
      });
      var hot = -1, stacked = false, shown = 1, showTo = 1;

      /* an orthogonal connector with rounded corners: out of one card edge, along a lane, into another */
      function elbow(x0, y0, x1, y1, ly, r) {
        var sy = ly < y0 ? -1 : 1, sx = x1 > x0 ? 1 : -1;
        r = Math.min(r, Math.abs(x1 - x0) / 2, Math.abs(ly - y0));
        return 'M' + x0 + ' ' + y0 + 'V' + (ly - sy * r) + 'Q' + x0 + ' ' + ly + ' ' + (x0 + sx * r) + ' ' + ly +
          'H' + (x1 - sx * r) + 'Q' + x1 + ' ' + ly + ' ' + x1 + ' ' + (ly - sy * r) + 'V' + y1;
      }
      function chevron(x, y, dx, dy) {
        var a = 4.6, px = -dy, py = dx;
        return 'M' + (x - dx * a + px * a) + ' ' + (y - dy * a + py * a) + 'L' + x + ' ' + y + 'L' + (x - dx * a - px * a) + ' ' + (y - dy * a - py * a);
      }
      function setLabel(f, x, y, anchor, lines) {
        f.text.textContent = '';
        f.text.setAttribute('text-anchor', anchor);
        var lh = 13, y0 = y - (lines.length - 1) * lh / 2;
        lines.forEach(function (s, k) { f.text.appendChild(S('tspan', { x: x, y: y0 + k * lh, text: s })); });
        /* a plate under the label, so the line and its particles pass behind the words */
        var b = { x: x, y: y, width: 0, height: 0 };
        try { b = f.text.getBBox(); } catch (e) {}
        set(f.plate, 'x', (b.x - 6).toFixed(1)); set(f.plate, 'y', (b.y - 2).toFixed(1));
        set(f.plate, 'width', (b.width + 12).toFixed(1)); set(f.plate, 'height', (b.height + 4).toFixed(1));
      }

      function layout() {
        var c = cards.map(function (n) { return { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight }; });
        if (!c[0].w) return;
        stacked = c[1].y > c[0].y + 10;
        var g = 7, r = 12;
        var geo = stacked ? stackGeo(c, g, r) : rowGeo(c, g, r);
        FLOWS.forEach(function (f, k) {
          var q = geo[k];
          f.path.setAttribute('d', q.d);
          f.arrow.setAttribute('d', chevron(q.ex, q.ey, q.dx, q.dy));
          f.port.setAttribute('cx', q.sx); f.port.setAttribute('cy', q.sy);
          setLabel(f, q.lx, q.ly, q.anchor, stacked && f.label.length > 1 ? f.label : [f.label.join(' ')]);
          sample(f);
        });
      }
      function rowGeo(c, g, r) {
        var top = c[0].y, bot = c[0].y + c[0].h, w = c[0].w;
        var ax = function (i, p) { return Math.round(c[i].x + p * w) + .5; };
        var lane1 = top - 30, lane2 = bot + 30, lane3 = bot + 62;
        var mid = function (a, b) { return (a + b) / 2; };
        return [
          { d: elbow(ax(0, .62), top, ax(1, .38), top - g, lane1, r), sx: ax(0, .62), sy: top, ex: ax(1, .38), ey: top - g, dx: 0, dy: 1, lx: mid(ax(0, .62), ax(1, .38)), ly: lane1, anchor: 'middle' },
          { d: elbow(ax(1, .38), bot, ax(0, .62), bot + g, lane2, r), sx: ax(1, .38), sy: bot, ex: ax(0, .62), ey: bot + g, dx: 0, dy: -1, lx: mid(ax(1, .38), ax(0, .62)), ly: lane2, anchor: 'middle' },
          { d: elbow(ax(0, .30), bot, ax(2, .50), bot + g, lane3, r), sx: ax(0, .30), sy: bot, ex: ax(2, .50), ey: bot + g, dx: 0, dy: -1, lx: ax(1, .5), ly: lane3, anchor: 'middle' },
          { d: elbow(ax(2, .38), top, ax(1, .62), top - g, lane1, r), sx: ax(2, .38), sy: top, ex: ax(1, .62), ey: top - g, dx: 0, dy: 1, lx: mid(ax(2, .38), ax(1, .62)), ly: lane1, anchor: 'middle' }
        ];
      }
      function stackGeo(c, g, r) {
        var W = c[0].w, x0 = c[0].x, xa = Math.round(x0 + W * .34) + .5, xb = Math.round(x0 + W * .66) + .5;
        var gx = Math.round(x0) - 10.5;
        var b0 = c[0].y + c[0].h, t1 = c[1].y, b1 = c[1].y + c[1].h, t2 = c[2].y;
        var m01 = (b0 + t1) / 2, m12 = (b1 + t2) / 2;
        var cy0 = c[0].y + c[0].h - 44, cy2 = c[2].y + 44;
        return [
          { d: 'M' + xa + ' ' + b0 + 'V' + (t1 - g), sx: xa, sy: b0, ex: xa, ey: t1 - g, dx: 0, dy: 1, lx: xa - 10, ly: m01, anchor: 'end' },
          { d: 'M' + xb + ' ' + t1 + 'V' + (b0 + g), sx: xb, sy: t1, ex: xb, ey: b0 + g, dx: 0, dy: -1, lx: xb + 10, ly: m01, anchor: 'start' },
          { d: 'M' + x0 + ' ' + cy0 + 'H' + (gx + r) + 'Q' + gx + ' ' + cy0 + ' ' + gx + ' ' + (cy0 + r) + 'V' + (cy2 - r) + 'Q' + gx + ' ' + cy2 + ' ' + (gx + r) + ' ' + cy2 + 'H' + (x0 - 1),
            sx: x0, sy: cy0, ex: x0 - 1, ey: cy2, dx: 1, dy: 0, lx: x0 + 8, ly: m12, anchor: 'start' },
          { d: 'M' + xb + ' ' + t2 + 'V' + (b1 + g), sx: xb, sy: t2, ex: xb, ey: b1 + g, dx: 0, dy: -1, lx: xb + 10, ly: m12, anchor: 'start' }
        ];
      }

      /* a lookup table along each path (getPointAtLength once per layout, not per frame) */
      function sample(f) {
        var len = f.path.getTotalLength(), n = Math.max(2, Math.ceil(len / 3));
        f.len = len; f.pts = [];
        for (var k = 0; k <= n; k++) { var p = f.path.getPointAtLength(len * k / n); f.pts.push(p.x, p.y); }
        var want = Math.max(2, Math.round(len / 84));
        while (f.dots.length < want) { var d = S('polyline', { class: 'pl-dot' }); f.g.insertBefore(d, f.plate); f.dots.push(d); }
        while (f.dots.length > want) f.g.removeChild(f.dots.pop());
      }
      function at(f, s) {
        var n = f.pts.length / 2 - 1, u = UI.clamp(s / f.len) * n, k = Math.min(n - 1, Math.floor(u)), t = u - k;
        return [f.pts[2 * k] + (f.pts[2 * k + 2] - f.pts[2 * k]) * t, f.pts[2 * k + 1] + (f.pts[2 * k + 3] - f.pts[2 * k + 1]) * t];
      }
      /* each particle is a short capsule whose tail stretches with its speed */
      function draw(f) {
        if (!f.len) return;
        var n = f.dots.length, gap = f.len / n, tail = .1 + Math.max(0, f.speed - 26) * .1;
        f.dots.forEach(function (d, k) {
          var s = (f.s + k * gap) % f.len, p = at(f, s), m = at(f, Math.max(0, s - tail / 2)), q = at(f, Math.max(0, s - tail));
          var fade = Math.min(1, s / 14, (f.len - s) / 18);
          set(d, 'points', p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' ' + m[0].toFixed(1) + ',' + m[1].toFixed(1) + ' ' + q[0].toFixed(1) + ',' + q[1].toFixed(1));
          set(d, 'opacity', (Math.max(0, fade) * (.42 + .58 * f.glow) * shown).toFixed(3));
        });
      }
      return {
        layout: layout,
        setActive: function (i) {
          hot = i;
          FLOWS.forEach(function (f) { f.g.classList.toggle('is-hot', f.from === i); });
        },
        /* particles wait for the connectors to draw in (CSS), then fade up */
        hide: function () { shown = showTo = 0; },
        reveal: function () { showTo = 1; },
        frame: function (dt) {
          shown += (showTo - shown) * Math.min(1, dt * 2.5);
          FLOWS.forEach(function (f) {
            var on = f.from === hot ? 1 : 0;
            f.glow += (on - f.glow) * Math.min(1, dt * 5);
            f.speed += ((on ? 78 : 26) - f.speed) * Math.min(1, dt * 3);
            f.s = (f.s + f.speed * dt) % (f.len || 1);
            draw(f);
          });
        },
        still: function () { shown = showTo = 1; FLOWS.forEach(function (f) { f.glow = f.from === hot ? 1 : 0; f.s = f.len ? (f.len / f.dots.length) * .45 : 0; draw(f); }); }
      };
    })();

    /* ---------------------------------------------------------------- mini illustrations (viewBox 260 x 150) */
    function stage(i) {
      var box = cards[i].querySelector('.pillar-visual');
      var svg = S('svg', { viewBox: '0 0 260 150', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false' });
      if (box) { box.textContent = ''; box.appendChild(svg); }
      return svg;
    }
    function add(parent, tag, attrs) { var n = S(tag, attrs); parent.appendChild(n); return n; }
    function txt(parent, x, y, s, cls, anchor) { return add(parent, 'text', { x: x, y: y, class: cls, 'text-anchor': anchor || 'middle', text: s }); }
    function rnd(seed) { var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    function set(n, k, v) { n.setAttribute(k, v); }

    /* 01 environment: merged PRs stream into a filter; one in a few passes as a setup into the sealed playground,
       where the GPU measures it (violet) */
    function envVis(svg) {
      var LANES = [30, 50, 70, 90, 110], MOUTH = 96, NECK = 150, SPEED = 30;
      add(svg, 'path', { class: 'pv-wall', d: 'M100 14C126 14 134 54 150 61.5H166M100 126C126 126 134 86 150 78.5H166' });
      add(svg, 'rect', { class: 'pv-room', x: 176.5, y: 22.5, width: 76, height: 95, rx: 13 });
      var lock = add(svg, 'g', { class: 'pv-lock', transform: 'translate(240 14)' });
      add(lock, 'rect', { x: -5, y: 6, width: 10, height: 8, rx: 2 });
      add(lock, 'path', { d: 'M-2.8 6V3.6a2.8 2.8 0 0 1 5.6 0V6' });
      txt(svg, 186, 15, 'sealed', 'pv-cap', 'start');
      var chip = add(svg, 'g', { class: 'pv-chip', transform: 'translate(214.5 70)' });
      var ring = add(chip, 'circle', { class: 'pv-ring', r: 18, opacity: 0 });
      var pins = '';
      for (var k = -1; k <= 1; k++) {
        var o = k * 6.5;
        pins += 'M' + o + ' -15V-19M' + o + ' 15V19M-15 ' + o + 'H-19M15 ' + o + 'H19';
      }
      add(chip, 'path', { class: 'pv-pins', d: pins });
      add(chip, 'rect', { class: 'pv-die', x: -14, y: -14, width: 28, height: 28, rx: 5 });
      var core = add(chip, 'rect', { class: 'pv-core', x: -6.5, y: -6.5, width: 13, height: 13, rx: 2.5 });
      txt(svg, 46, 140, UI.fmt(funnel[0]), 'pv-num');
      txt(svg, 150, 140, UI.fmt(funnel[1]), 'pv-num');
      txt(svg, 214.5, 140, UI.fmt(funnel[2]), 'pv-num pv-num-hi');
      var layer = add(svg, 'g', {});

      var pool = [], spawn = 0, count = 0, pulse = 0;
      function card() {
        var g = add(layer, 'g', { class: 'pv-pr' });
        add(g, 'rect', { class: 'pv-pr-bg', x: -11, y: -7.5, width: 22, height: 15, rx: 3.5 });
        add(g, 'path', { class: 'pv-pr-ln', d: 'M-6.5 -2.5H6.5M-6.5 2.5H2' });
        var hi = add(g, 'rect', { class: 'pv-setup', x: -11, y: -7.5, width: 22, height: 15, rx: 3.5, opacity: 0 });
        return { g: g, hi: hi, live: false };
      }
      function launch(c, x) {
        count++;
        c.live = true; c.x = x; c.lane = LANES[[2, 0, 3, 1, 4, 0, 2, 4, 1, 3][count % 10]];
        c.keep = count % 5 === 2; c.t = 0; c.drift = rnd(count + .5) < .5 ? -1 : 1;
      }
      function place(c) {
        var x = c.x, y = c.lane, s = 1, a = 1, h = 0;
        if (x > MOUTH - 10 && !c.keep) {
          var u = UI.clamp((x - (MOUTH - 10)) / 24);
          y += c.drift * 9 * UI.easeOut(u); s = 1 - .25 * u; a = 1 - u;
        } else if (c.keep && x > MOUTH - 14) {
          var v = UI.clamp((x - (MOUTH - 14)) / (NECK - MOUTH + 14));
          y = UI.lerp(c.lane, 70, UI.easeInOut(v)); s = 1 - .45 * v; h = v;
          if (x > 190) { var w = UI.clamp((x - 190) / 12); a = 1 - w; }
        } else if (x < 6) a = UI.clamp((x + 14) / 20);
        set(c.g, 'transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + s.toFixed(3) + ')');
        set(c.g, 'opacity', a.toFixed(3)); set(c.hi, 'opacity', h.toFixed(3));
        if (c.keep && x > 202 && !c.hit) { c.hit = true; pulse = 1; }
        if ((!c.keep && x > MOUTH + 16) || x > 204) c.live = false;
      }
      function glow(p) {
        set(ring, 'opacity', (p * .9).toFixed(3));
        set(ring, 'r', (16 + (1 - p) * 9).toFixed(2));
        core.classList.toggle('on', p > .35);
      }
      for (var j = 0; j < 14; j++) pool.push(card());
      return {
        frame: function (dt) {
          spawn -= dt;
          if (spawn <= 0) {
            spawn = .52;
            for (var q = 0; q < pool.length; q++) if (!pool[q].live) { pool[q].hit = false; launch(pool[q], -14); break; }
          }
          pool.forEach(function (c) {
            if (!c.live) { set(c.g, 'opacity', 0); return; }
            c.x += SPEED * dt * (c.keep && c.x > MOUTH ? 1.25 : 1);
            place(c);
          });
          pulse = Math.max(0, pulse - dt * 1.1);
          glow(pulse);
        },
        still: function () {
          count = 0;
          [[6, 1], [26, 3], [44, 0], [62, 4], [84, 2], [128, 1]].forEach(function (p, k) {
            var c = pool[k]; c.live = true; c.x = p[0]; c.lane = LANES[p[1]]; c.keep = k === 5; c.drift = 1; c.hit = true; place(c);
          });
          for (var k = 6; k < pool.length; k++) { pool[k].live = false; set(pool[k].g, 'opacity', 0); }
          glow(.8);
        }
      };
    }

    /* 02 agent: K analyzers each predict a gain; the highest is selected (blue) and only it is implemented */
    var HEAD = 'M6 19v-3.8C3.6 14.8 2 12.4 2 9.4 2 5 5.5 1.6 10 1.6c4.2 0 7.4 3 7.6 6.8l1.7 3c.3.5 0 1-.6 1h-1.1v2.1c0 1.2-1 2.1-2.1 2.1H13V19z';
    var SPARK = 'M9.6 4.6c.5 2.6 1.4 3.5 4 4-2.6.5-3.5 1.4-4 4-.5-2.6-1.4-3.5-4-4 2.6-.5 3.5-1.4 4-4z';
    function agentVis(svg) {
      var ROWS = [33, 59, 85, 111], X0 = 46, MAXW = 96, P = 5.8;
      txt(svg, X0, 15, 'pred. gain', 'pv-cap pv-cap-b', 'start');
      var pill = add(svg, 'g', { class: 'pv-impl', transform: 'translate(215 72)' });
      add(pill, 'rect', { x: -36, y: -12, width: 72, height: 24, rx: 12 });
      txt(pill, 0, 3.6, 'Implement', 'pv-impl-t');
      var wire = add(svg, 'path', { class: 'pv-wire', pathLength: 1, 'stroke-dasharray': '1 2' });
      var tip = add(svg, 'path', { class: 'pv-wire-tip', d: 'M-4.5 -4L0 0L-4.5 4', transform: 'translate(176 72)' });
      var rows = ROWS.map(function (y) {
        var g = add(svg, 'g', { transform: 'translate(0 ' + y + ')' });
        var ring = add(g, 'circle', { class: 'pv-ring-b', cx: 25, cy: 0, r: 15 });
        var head = add(g, 'g', { class: 'pv-head', transform: 'translate(15 -10.5)' });
        add(head, 'path', { d: HEAD });
        add(head, 'path', { class: 'pv-spark', d: SPARK });
        var track = add(g, 'rect', { class: 'pv-track', x: X0, y: -3.5, width: MAXW, height: 7, rx: 3.5 });
        var bar = add(g, 'rect', { class: 'pv-bar', x: X0, y: -3.5, width: 0, height: 7, rx: 3.5 });
        return { g: g, ring: ring, head: head, track: track, bar: bar, y: y };
      });
      var t = 0, cycle = -1, lens = [], win = 0;
      function deal(c) {
        lens = ROWS.map(function (_, k) { return .34 + .6 * rnd(c * 7 + k * 3 + 1); });
        win = 0;
        lens.forEach(function (l, k) { if (l > lens[win]) win = k; });
        lens[win] = Math.max(lens[win], .9);
        /* the wire from the winning bar to the Implement pill */
        var wy = ROWS[win], wx = X0 + MAXW * lens[win] + 7, dn = 72 > wy ? 1 : -1;
        set(wire, 'd', 'M' + wx.toFixed(1) + ' ' + wy + 'H161Q166 ' + wy + ' 166 ' + (wy + 5 * dn) + 'V' + (72 - 5 * dn) + 'Q166 72 171 72H176');
      }
      function render(u) {
        var pickT = UI.seg(u, .47, .56), wireT = UI.seg(u, .55, .68), popT = UI.seg(u, .64, .74), out = UI.seg(u, .9, 1);
        rows.forEach(function (r, k) {
          var grow = UI.easeOut(UI.seg(u, .08 + k * .06, .3 + k * .06));
          var isWin = k === win;
          set(r.bar, 'width', (MAXW * lens[k] * grow * (1 - UI.easeInOut(out))).toFixed(2));
          r.bar.classList.toggle('win', isWin && pickT > .5);
          r.g.setAttribute('opacity', (isWin ? 1 : 1 - .55 * pickT * (1 - out)).toFixed(3));
          set(r.ring, 'opacity', (isWin ? pickT * (1 - out) : 0).toFixed(3));
        });
        set(wire, 'stroke-dashoffset', (1 - UI.easeInOut(wireT)).toFixed(4));
        set(wire, 'opacity', (1 - out).toFixed(3));
        set(tip, 'opacity', (wireT > .96 ? 1 - out : 0).toFixed(3));
        var s = .86 + .14 * UI.easeOut(popT);
        set(pill, 'transform', 'translate(215 72) scale(' + s.toFixed(3) + ')');
        set(pill, 'opacity', (UI.easeOut(popT) * (1 - out)).toFixed(3));
      }
      return {
        frame: function (dt) {
          t += dt;
          var c = Math.floor(t / P);
          if (c !== cycle) { cycle = c; deal(c); }
          render((t % P) / P);
        },
        still: function () { deal(3); render(.8); }
      };
    }

    /* 03 training: asynchronous rollout lanes. Each analysis is shaded by the policy version that wrote it, then built
       (black), measured (violet) and rewarded (dot); rewards fill a group, and the update returns to the policy */
    function rlVis(svg) {
      var LANES = [38, 58, 78, 98], X0 = 50, GROUP = 8;
      var pol = add(svg, 'g', { class: 'pv-pol' });
      add(pol, 'rect', { x: 6.5, y: 28.5, width: 34, height: 80, rx: 9 });
      var pi = add(pol, 'text', { x: 23.5, y: 66, class: 'pv-pi', 'text-anchor': 'middle' });
      pi.appendChild(document.createTextNode('π'));
      var piSub = add(pi, 'tspan', { class: 'pv-pi-sub', dy: 3.5, text: '1' });
      var verDot = add(pol, 'rect', { class: 'pv-ver v0', x: 15.5, y: 80, width: 16, height: 5, rx: 2.5 });
      var tr = add(svg, 'g', { class: 'pv-trn' });
      add(tr, 'rect', { x: 205.5, y: 28.5, width: 48, height: 80, rx: 9 });
      txt(tr, 229.5, 43, 'GRPO', 'pv-cap pv-cap-b');
      var cells = [];
      for (var k = 0; k < GROUP; k++) {
        cells.push(add(tr, 'rect', { class: 'pv-cell', x: 216.5 + (k % 2) * 14, y: 52.5 + Math.floor(k / 2) * 12.5, width: 10, height: 9, rx: 2 }));
      }
      add(svg, 'path', { class: 'pv-upd', d: 'M229.5 109V122Q229.5 129 222.5 129H30.5Q23.5 129 23.5 122V115' });
      add(svg, 'path', { class: 'pv-upd-tip', d: 'M19 118.5L23.5 113.5L28 118.5' });
      txt(svg, 126.5, 129, 'update', 'pv-cap pv-upd-t');
      var upd = add(svg, 'path', { class: 'pv-upd-run', d: 'M229.5 109V122Q229.5 129 222.5 129H30.5Q23.5 129 23.5 122V113.5' });
      var updLen = 0;

      var lanes = LANES.map(function (y, i) {
        var g = add(svg, 'g', { transform: 'translate(0 ' + y + ')' });
        return {
          g: g, y: y, i: i, n: 0,
          bar: add(g, 'rect', { class: 'pv-ana v0', x: X0, y: -3.5, height: 7, rx: 2, width: 0 }),
          build: add(g, 'rect', { class: 'pv-build', y: -1.75, height: 3.5, rx: 1.75, width: 0 }),
          meas: add(g, 'rect', { class: 'pv-meas', y: -1.75, height: 3.5, rx: 1.75, width: 0 }),
          dot: add(svg, 'circle', { class: 'pv-rew', r: 3.2, opacity: 0 })
        };
      });
      var version = 0, filled = 0, run = -1;
      function begin(l, t0) {
        l.n++; l.t = t0 || 0; l.v = version;
        l.len = 46 + 52 * rnd(l.i * 13 + l.n * 1.7);
        l.ta = 1.3 + 1.2 * rnd(l.i * 5 + l.n * 2.3);
        l.zero = rnd(l.i * 3 + l.n * 7.1) < .18;
        l.sent = false;
        l.bar.setAttribute('class', 'pv-ana v' + (l.v % 4));
      }
      function cellsTo(n) {
        cells.forEach(function (c, k) { c.classList.toggle('on', k < n); });
      }
      function drawLane(l) {
        var t = l.t, ta = l.ta, a = UI.seg(t, 0, ta), b = UI.seg(t, ta + .05, ta + .4), m = UI.seg(t, ta + .45, ta + .8);
        var fly = UI.seg(t, ta + 1, ta + 1.5), fade = UI.seg(t, ta + 1.55, ta + 1.9);
        var bx = X0 + l.len + 3, mx = bx + 13, dx = mx + 16;
        set(l.bar, 'width', (l.len * UI.easeOut(a)).toFixed(2));
        set(l.build, 'x', bx); set(l.build, 'width', (11 * b).toFixed(2));
        set(l.meas, 'x', mx); set(l.meas, 'width', (11 * m).toFixed(2));
        set(l.g, 'opacity', (1 - fade).toFixed(3));
        var pop = UI.seg(t, ta + .82, ta + .95);
        var cell = cells[Math.min(GROUP - 1, filled)];
        var cx = cell ? +cell.getAttribute('x') + 5 : 229, cy = cell ? +cell.getAttribute('y') + 4.5 : 70;
        var e = UI.easeInOut(fly), x = UI.lerp(dx, cx, e), y = UI.lerp(l.y, cy, e) - Math.sin(e * Math.PI) * 12;
        set(l.dot, 'cx', x.toFixed(2)); set(l.dot, 'cy', y.toFixed(2));
        set(l.dot, 'opacity', (pop * (1 - UI.seg(fly, .8, 1))).toFixed(3));
        l.dot.classList.toggle('zero', l.zero);
        return fly >= 1;
      }
      function update(dt) {
        if (run < 0) return;
        run += dt / .95;
        var p = UI.easeInOut(UI.clamp(run));
        set(upd, 'stroke-dashoffset', (updLen * (1 - p) + 0).toFixed(1));
        set(upd, 'opacity', (1 - UI.seg(run, 1, 1.4)).toFixed(3));
        if (run >= 1 && filled >= GROUP) {
          version++; filled = 0; cellsTo(0);
          piSub.textContent = String(version + 1);
          verDot.setAttribute('class', 'pv-ver v' + (version % 4));
          pol.classList.add('flash'); setTimeout(function () { pol.classList.remove('flash'); }, 420);
        }
        if (run >= 1.4) run = -1;
      }
      function prime() {
        updLen = upd.getTotalLength ? upd.getTotalLength() : 300;
        set(upd, 'stroke-dasharray', '26 ' + updLen.toFixed(1));
        set(upd, 'stroke-dashoffset', updLen.toFixed(1));
        set(upd, 'opacity', 0);
      }
      lanes.forEach(function (l, i) { begin(l, -i * .7 - rnd(i) * .5); });
      return {
        frame: function (dt) {
          if (!updLen) prime();
          lanes.forEach(function (l) {
            l.t += dt;
            if (drawLane(l) && !l.sent) {
              l.sent = true;
              if (filled < GROUP) { filled++; cellsTo(filled); cells[filled - 1].classList.toggle('zero', l.zero); }
              if (filled >= GROUP && run < 0) run = 0;
            }
            if (l.t > l.ta + 2.05) begin(l, 0);
          });
          update(dt);
        },
        still: function () {
          prime();
          version = 2; piSub.textContent = '3'; verDot.setAttribute('class', 'pv-ver v2');
          filled = 5; cellsTo(5);
          var ts = [.5, 1.1, 1.0, .2];
          lanes.forEach(function (l, i) { l.n = i; begin(l, 0); l.v = i === 3 ? 2 : 1 + (i % 2); l.bar.setAttribute('class', 'pv-ana v' + l.v); l.t = l.ta * ts[i] + (ts[i] >= 1 ? .9 : 0); drawLane(l); });
        }
      };
    }

    var vis = [envVis(stage(0)), agentVis(stage(1)), rlVis(stage(2))];
    /* pre-roll the streaming scenes so they are already full when first seen */
    if (!UI.reduced()) for (var w = 0; w < 64; w++) { vis[0].frame(.05); vis[2].frame(.03); }

    /* ---------------------------------------------------------------- one clock for the section */
    /* auto-advance only where a mouse can hover to hold it, and never again once the reader has chosen a part
       (a touch reader would otherwise see the paragraph swap out mid-read) */
    var ADVANCE = 7;                       // seconds per card while idle
    var idle = 0, inView = false, held = false, raf = 0, last = 0, played = false;
    var hoverMq = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
    function rotating() { return !stopped && !!(hoverMq && hoverMq.matches); }
    /* the active tab's bar: time to the next card while rotating, full otherwise */
    function fill() { return !reduced && rotating() ? idle / ADVANCE : 1; }
    function holdOn() { held = true; }
    function holdOff() { held = host.matches(':hover') || detail.matches(':hover') || host.contains(document.activeElement) || detail.contains(document.activeElement); }
    [host, detail].forEach(function (n) {
      n.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') holdOn(); });
      n.addEventListener('pointerleave', function () { setTimeout(holdOff, 0); });
      n.addEventListener('focusin', holdOn);
      n.addEventListener('pointerdown', function () { stopped = true; });
      n.addEventListener('focusout', function () { setTimeout(holdOff, 0); });
    });

    function progress(p) {
      tabs.forEach(function (t, k) {
        var bar = t.querySelector('i');
        bar.style.transform = 'scaleX(' + (k === active ? p : 0).toFixed(4) + ')';
      });
    }
    function tick(now) {
      raf = 0;
      if (!inView || document.hidden || reduced) { last = 0; return; }
      var dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now; played = true;
      flow.frame(dt);
      vis.forEach(function (v) { v.frame(dt); });
      if (!held && rotating()) {
        idle += dt;
        if (idle >= ADVANCE) { idle = 0; dBody.setAttribute('aria-live', 'off'); setActive((active + 1) % 3, false); }
      }
      progress(fill());
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf && inView && !document.hidden && !reduced) raf = requestAnimationFrame(tick); }
    function still() {
      flow.still();
      vis.forEach(function (v) { v.still(); });
      progress(1);
    }

    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { flow.layout(); if (reduced) still(); }) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', function () { flow.layout(); if (reduced) still(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { flow.layout(); if (reduced) still(); });

    UI.watch(host.parentNode, function (on) { inView = on; if (on) start(); });
    document.addEventListener('visibilitychange', start);
    /* printed before the section was ever seen: show each scene's representative frame, not its unplayed first one */
    window.addEventListener('beforeprint', function () { if (!played) vis.forEach(function (v) { v.still(); }); });
    UI.onReducedChange(function (r) {
      reduced = r;
      if (r) { host.classList.remove('pl-pre'); flow.reveal(); still(); } else start();
    });

    /* the entrance: cards rise in turn, then the loop draws itself and the particles start */
    if (!reduced && !UI.revealAll) {
      host.classList.add('pl-pre');
      flow.hide();
      UI.onVisible(host, function () {
        host.classList.add('pl-in');
        setTimeout(flow.reveal, 1100);
      }, '0px 0px -18% 0px');
    }
    cards.forEach(function (c, k) { c.style.setProperty('--d', (k * .09).toFixed(2) + 's'); });

    flow.layout();
    setActive(0, false);
    if (reduced) still(); else { flow.frame(0); start(); }
  }
})();
