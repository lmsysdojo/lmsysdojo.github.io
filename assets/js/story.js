/* LMSysDojo project page: the story. A pinned, scroll-scrubbed visual abstract of one real playground (vLLM 4696,
 * Appendix F.2): a live trace, the located gap, three predictions, one implementation, and the measurement against the
 * expert. The stage is one persistent SVG laid out in CSS pixels (re-laid out on resize); every colour comes from a CSS
 * class, so a theme switch needs no redraw. Scroll sets a target t in [0, 1]; the stage eases toward it every frame.
 * Reduced motion (or a viewport too short to pin): a static snapshot of each scene beside its caption. Needs site.js. */
(function () {
  'use strict';
  var UI = window.LMSDUI;
  var sec = document.getElementById('story');
  var mount = sec && sec.querySelector('.story-stage[data-mount="story"]');
  if (!UI || !mount) return;
  var seg = UI.seg, lerp = UI.lerp, clamp = UI.clamp, eo = UI.easeOut, eio = UI.easeInOut;

  /* facts: LMSD_CASES.deep (Appendix F.2, Table qual-4696); the three predictions are structured attempts #1-#3 of
     Table qual-arms (#3, the delivered one, is the -30.1% of the deep case) */
  var deep = (window.LMSD_CASES && window.LMSD_CASES.deep) || {};
  var e2e = (deep.metrics || [])[0] || {};
  var F = {
    base: +(e2e.base || 0.758), agent: +(e2e.agent || 0.461), expert: +(e2e.expert || 0.587),
    ag: e2e.ag || 1.65, ex: e2e.ex || 1.29, gain: 221, share: 34.5, ms: 55, blocks: 938,
    bench: ['54.8', '0.33'], preds: [-25, -29, -30.1]
  };

  /* schematic engine cycle, arbitrary units: one new request (a short CPU step, then hash_of_block, then its prefill
     on the GPU) and three batched decode steps. Before the fix the GPU is busy 39 of 101 units (< 40%). */
  var C = { rest: 5, hash: 36, fixed: .3, pre: 12, cpu: 7, gpu: 9, dec: 3, period: 4 };
  function cycleLen(h) { return C.rest + h + C.pre + C.dec * (C.cpu + C.gpu); }

  function mk(parent, tag, attrs) { var n = UI.svg(tag, attrs); parent.appendChild(n); return n; }
  function txt(parent, x, y, s, cls, anchor) { return mk(parent, 'text', { x: x, y: y, class: cls, 'text-anchor': anchor, text: s }); }
  function set(n, a) { for (var k in a) n.setAttribute(k, a[k]); }
  function op(n, v) { v = v < .002 ? 0 : v > .998 ? 1 : v; if (n._o !== v) { n._o = v; n.style.opacity = v; } }
  function tr(n, x, y) { n.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')'); }
  function tx(n, s) { if (n._t !== s) { n._t = s; n.textContent = s; } }
  function cls(n, s) { if (n._c !== s) { n._c = s; n.setAttribute('class', s); } }
  function tw(n, guess) { try { var w = n.getComputedTextLength(); return w > 0 ? w : guess; } catch (e) { return guess; } }
  function pct(v, d) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(d || 0) + '%'; }
  var uid = 0;

  /* ================================================================ stage factory (one per SVG) */
  /* layout constants: compact (n) stages are below 560px wide or 450px tall. The height a scene needs is pad + hud +
     the trace's minimum + the gap + the lower zone + pad; a shorter stage is laid out at that height and scaled down. */
  function dims(n) { return n ? { pad: 14, hud: 56, th: [132, 196], zg: 32, zn: 170 } : { pad: 26, hud: 66, th: [168, 270], zg: 40, zn: 236 }; }
  function needH(n) { var D = dims(n); return 2 * D.pad + D.hud + D.th[0] + D.zg + D.zn; }

  function makeStage(host) {
    var svg = UI.svg('svg', { class: 'st-svg', 'aria-hidden': 'true', focusable: 'false' });
    var note = UI.el('span', { class: 'tag-note st-note', text: 'schematic' });
    host.appendChild(svg); host.appendChild(note);
    var id = 'st' + (++uid), g = {}, L = null, cw = 0, ch = 0;

    /* -------------------------------------------------------------- layout, in user units (CSS pixels unless scaled) */
    function layout(w, h, n) {
      var D = dims(n), pad = D.pad;
      var l = { w: w, h: h, n: n, m: w < 720, pad: pad, N: n ? 3 : 4 };
      l.x0 = pad + (n ? 0 : 118); l.x1 = w - pad; l.tw = l.x1 - l.x0;
      l.ppu = l.tw / (l.N * cycleLen(C.hash));
      l.top = pad + D.hud;
      // the trace takes what the lower zone's content (zn) leaves; spare height centres that content
      var zn = D.zn, zg = D.zg;
      l.th = clamp(h - l.top - pad - zn - zg, D.th[0], D.th[1]);
      l.lh = n ? 13 : 16; l.reqGap = n ? 6 : 8;
      l.reqY = l.top + l.th * (n ? .1 : .08);
      l.cpuY = l.top + l.th * (n ? .5 : .46); l.gpuY = l.top + l.th * (n ? .74 : .7); l.axY = l.top + l.th;
      l.zy = l.axY + zg; l.zy += Math.max(0, h - pad - l.zy - zn) * .45; l.zh = h - pad - l.zy;
      l.zx0 = pad; l.zx1 = l.x1; l.zw = l.zx1 - l.zx0;
      return l;
    }

    /* -------------------------------------------------------------- build: HUD + trace */
    function build() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      g = {};
      var l = L, defs = mk(svg, 'defs', {});
      var hat = mk(defs, 'pattern', { id: id + 'h', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
      mk(hat, 'rect', { width: 6, height: 6, class: 'st-hatch-bg' });
      mk(hat, 'line', { x1: 0, y1: 0, x2: 0, y2: 6, class: 'st-hatch' });
      var mg = mk(defs, 'linearGradient', { id: id + 'mg', gradientUnits: 'userSpaceOnUse', x1: l.x0, x2: l.x1, y1: 0, y2: 0 });
      g.stops = [0, .05, .95, 1].map(function (o) { return mk(mg, 'stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': o > 0 && o < 1 ? 1 : 0 }); });
      var mask = mk(defs, 'mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: l.w, height: l.h });
      mk(mask, 'rect', { x: l.x0 - 1, y: l.top - 8, width: l.tw + 2, height: l.th + 10, fill: 'url(#' + id + 'mg)' });
      var sg = mk(defs, 'linearGradient', { id: id + 'sg', x1: 0, x2: 1, y1: 0, y2: 0 });
      mk(sg, 'stop', { offset: 0, class: 'st-g0' }); mk(sg, 'stop', { offset: 1, class: 'st-g1' });
      var clip = mk(defs, 'clipPath', { id: id + 'c' });
      g.scanClip = mk(clip, 'rect', { x: l.x0, y: l.top - 8, width: 0, height: l.th + 10 });

      buildHud(l);
      buildTrace(l);
      buildZone(l);
    }

    function buildHud(l) {
      var hud = g.hud = mk(svg, 'g', { class: 'st-hud' });
      var y = l.pad + 14;
      var ttl = txt(hud, l.pad, y, 'vLLM 4696', 'st-v'), lx = l.pad + tw(ttl, 68) + 12;
      g.live = mk(hud, 'circle', { cx: lx + 3.5, cy: y - 4, r: 3.5, class: 'st-live' });
      g.liveTxt = txt(hud, lx + 12, y, 'live', 'st-k');
      txt(hud, l.pad, y + 19, l.n ? '400 requests · 1× H100' : l.m ? 'vLLM 0.4.2 · longchat-7b-16k' : 'vLLM 0.4.2 · longchat-7b-16k · prefix caching', 'st-sub');
      var slots = l.n ? [['E2E mean', 'e2e']] : [['E2E mean', 'e2e'], ['requests', '400'], ['hardware', '1× H100']];
      var x = l.x1;
      for (var i = slots.length - 1; i >= 0; i--) {
        var gx = mk(hud, 'g', {});
        var lb = txt(gx, x, y - 2, slots[i][0], 'st-k', 'end');
        if (slots[i][1] === 'e2e') g.e2eLbl = lb;
        var v = txt(gx, x, y + 17, slots[i][1] === 'e2e' ? F.base.toFixed(3) + ' s' : slots[i][1], 'st-v st-big', 'end');
        if (slots[i][1] === 'e2e') g.e2e = v;
        x -= l.m ? 84 : 92;
      }
      mk(hud, 'line', { x1: l.pad, x2: l.x1, y1: l.top - (l.n ? 18 : 22), y2: l.top - (l.n ? 18 : 22), class: 'st-rule' });
    }

    function buildTrace(l) {
      var lab = mk(svg, 'g', { class: 'st-lanes' });
      var lanes = [['requests', '4 streams', l.reqY - 2, 4 * l.reqGap], ['engine thread', 'CPU', l.cpuY, l.lh], ['GPU', '1× H100', l.gpuY, l.lh]];
      lanes.forEach(function (a, i) {
        if (i) mk(lab, 'rect', { x: l.x0, y: a[2], width: l.tw, height: a[3], rx: 4, class: 'st-lane' });
        if (l.n) txt(lab, l.x0, a[2] - 6, a[0] + ' · ' + a[1], 'st-k');
        else { txt(lab, l.pad, a[2] + a[3] / 2 - 1, a[0], 'st-lab'); txt(lab, l.pad, a[2] + a[3] / 2 + 13, a[1], 'st-k'); }
      });
      for (var x = l.x0, k = 0; x <= l.x1 + .5; x += l.tw / 40, k++) mk(lab, 'line', { x1: x, x2: x, y1: l.axY - (k % 5 ? 3 : 6), y2: l.axY, class: 'st-tick' });
      mk(lab, 'line', { x1: l.x0, x2: l.x1, y1: l.axY, y2: l.axY, class: 'st-rule' });
      txt(lab, l.x0, l.axY + 16, 'time →', 'st-k');

      var tg = mk(svg, 'g', { mask: 'url(#' + id + 'm)' });
      var reqL = mk(tg, 'g', {}), cpuL = mk(tg, 'g', {}), gpuL = mk(tg, 'g', {});
      var hi = mk(tg, 'g', { 'clip-path': 'url(#' + id + 'c)' });
      var idleL = g.idleL = mk(hi, 'g', {}), hotL = mk(hi, 'g', {});
      g.cyc = [];
      for (var j = -1; j < C.period + l.N + 2; j++) {
        var c = { j: j, req: mk(reqL, 'rect', { height: 5, rx: 2.5, y: l.reqY + (j % 4 + 4) % 4 * l.reqGap, class: 'st-req' }) };
        c.cpu = [0, 1, 2, 3, 4].map(function (i) { return mk(cpuL, 'rect', { y: l.cpuY + 2, height: l.lh - 4, rx: 2, class: i === 1 ? 'st-cpu st-cpuh' : 'st-cpu' }); });
        c.gpu = [0, 1, 2, 3].map(function () { return mk(gpuL, 'rect', { y: l.gpuY + 2, height: l.lh - 4, rx: 2, class: 'st-gpu' }); });
        c.idle = [0, 1, 2, 3].map(function () { return mk(idleL, 'rect', { y: l.gpuY + 1, height: l.lh - 2, rx: 2, fill: 'url(#' + id + 'h)', class: 'st-idle' }); });
        c.hot = mk(hotL, 'rect', { y: l.cpuY + 2, height: l.lh - 4, rx: 2, class: 'st-hot' });
        g.cyc.push(c);
      }
      g.endGhost = mk(svg, 'line', { y1: l.top - 6, y2: l.axY, class: 'st-endg' });
      g.saved = mk(svg, 'rect', { y: l.axY - 6, height: 6, class: 'st-saved' });
      g.end = mk(svg, 'line', { y1: l.top - 6, y2: l.axY, class: 'st-end' });
      g.soon = txt(svg, 0, l.axY - 12, 'same work, sooner', 'st-k st-blue', 'middle'); g.soonW = tw(g.soon, 118);
      g.scan = mk(svg, 'g', { class: 'st-scan' });
      mk(g.scan, 'rect', { x: -40, y: l.top - 8, width: 40, height: l.th + 8, fill: 'url(#' + id + 'sg)', class: 'st-scan-trail' });
      mk(g.scan, 'line', { x1: 0, x2: 0, y1: l.top - 12, y2: l.axY, class: 'st-scan-line' });
      txt(g.scan, 4, l.top - 14, 'py-spy', 'st-k st-blue');
      g.hashLbl = mk(svg, 'g', {});
      mk(g.hashLbl, 'line', { x1: 0, x2: 0, y1: -14, y2: -3, class: 'st-lead' });
      txt(g.hashLbl, 0, -18, 'hash_of_block', 'st-v st-sm', 'middle');
      g.busyLbl = mk(svg, 'g', {}); tr(g.busyLbl, l.x1, l.gpuY + l.lh + 15);
      txt(g.busyLbl, 0, 0, 'GPU busy < 40%', 'st-v st-sm', 'end');
      mk(g.busyLbl, 'rect', { x: -118, y: -8, width: 10, height: 10, rx: 2, fill: 'url(#' + id + 'h)', class: 'st-idle' });
    }

    /* trace geometry: off = live scroll in cycles, s = settle (0 live .. 1 captured), f = fix progress, k = scan 0..1 */
    function drawTrace(off, s, f, k) {
      var l = L, h = lerp(C.hash, C.fixed, f), len = cycleLen(h), p = l.ppu, base = C.period;
      var X = function (u) { return l.x0 + u * p; };
      var endU = l.N * len, xEnd = X(endU);
      g.cyc.forEach(function (c) {
        var u0 = (c.j - off) * len, inWin = c.j >= base && c.j < base + l.N;
        var v = inWin ? 1 : 1 - s;
        var spans = [[u0, C.rest], [u0 + C.rest, h]], gp = [[u0 + C.rest + h, C.pre]];
        for (var i = 0, u = u0 + C.rest + h + C.pre; i < C.dec; i++, u += C.cpu + C.gpu) { spans.push([u, C.cpu]); gp.push([u + C.cpu, C.gpu]); }
        c.cpu.forEach(function (r, i) { set(r, { x: X(spans[i][0]).toFixed(2), width: Math.max(0, spans[i][1] * p - (i === 0 ? 0 : 1)).toFixed(2) }); op(r, v); });
        c.gpu.forEach(function (r, i) { set(r, { x: (X(gp[i][0]) + .5).toFixed(2), width: Math.max(0, gp[i][1] * p - 1).toFixed(2) }); op(r, v); });
        var idle = [[u0, C.rest + h]].concat(spans.slice(2));
        c.idle.forEach(function (r, i) { set(r, { x: X(idle[i][0]).toFixed(2), width: Math.max(0, idle[i][1] * p - 1).toFixed(2) }); op(r, v); });
        set(c.hot, { x: X(spans[1][0]).toFixed(2), width: Math.max(0, h * p - 1).toFixed(2) }); op(c.hot, v);
        // request pills: alive from this cycle's arrival to the same stream's next arrival; cut at the captured end
        var r0 = X(u0) + 1, r1 = X(u0 + C.period * len) - 2;
        var alive = c.j + C.period > base && c.j < base + l.N;
        if (s > 0 && alive) r1 = Math.min(r1, lerp(r1, xEnd - 1, s));
        set(c.req, { x: r0.toFixed(2), width: Math.max(0, r1 - r0).toFixed(2) });
        op(c.req, alive ? 1 : 1 - s);
      });
      // live feed fades at both edges; a captured trace has hard edges
      g.stops[0].setAttribute('stop-opacity', s); g.stops[3].setAttribute('stop-opacity', s);
      var x0End = X(l.N * cycleLen(C.hash));
      set(g.end, { x1: xEnd, x2: xEnd }); op(g.end, s);
      set(g.endGhost, { x1: x0End, x2: x0End }); op(g.endGhost, s * clamp(f * 4));
      set(g.saved, { x: xEnd, width: Math.max(0, x0End - xEnd) }); op(g.saved, f);
      g.soon.setAttribute('x', Math.min((xEnd + x0End) / 2, l.x1 - g.soonW / 2 - 8).toFixed(2)); op(g.soon, seg(f, .6, 1));
      op(g.idleL, 1 - .65 * f);
      // scan: reveals idle hatch and hot hash blocks behind it
      var sx = l.x0 + l.tw * k;
      g.scanClip.setAttribute('width', Math.max(0, sx - l.x0 + (k >= 1 ? 4 : 0)));
      tr(g.scan, sx, 0); op(g.scan, k > 0 && k < 1 ? Math.min(1, k * 12, (1 - k) * 12) : 0);
      var hc = l.n ? 2 : 0, hx = X((base + hc - off) * len + C.rest + h / 2);
      var kx = (hx - l.x0) / l.tw;
      tr(g.hashLbl, hx, l.cpuY); op(g.hashLbl, seg(k, kx, kx + .1) * (1 - seg(f, 0, .3)));
      op(g.busyLbl, seg(k, .55, .75) * (1 - seg(f, 0, .5)));
    }

    function buildZone(l) {
      g.zone = mk(svg, 'g', { class: 'st-zone' });
      buildMatrix(l);
      buildPredict(l);
      buildMeasure(l);
    }

    /* scenes 1-2: one request is 938 blocks of 16 tokens (925 shared-prefix blocks, 13 unique); naming them is the gap */
    function buildMatrix(l) {
      var m = g.mx = mk(g.zone, 'g', {}), pitch = l.n ? 5 : 8, cell = pitch - (l.n ? 1.5 : 2.5);
      var cols = Math.floor((l.zw + pitch - cell) / pitch), rows = Math.ceil(F.blocks / cols), y0 = l.zy + (l.n ? 14 : 20);
      var shared = '', uniq = '', all = '';
      for (var i = 0; i < F.blocks; i++) {
        var x = l.zx0 + (i % cols) * pitch, y = y0 + Math.floor(i / cols) * pitch;
        var d = 'M' + x + ' ' + y + 'h' + cell + 'v' + cell + 'h-' + cell + 'z';
        if (i < 925) shared += d; else uniq += d;
        all += d;
      }
      txt(m, l.zx0, l.zy + (l.n ? 4 : 6), 'one request · ' + F.blocks + ' blocks of 16 tokens', 'st-k');
      mk(m, 'path', { d: shared, class: 'st-blk' });
      mk(m, 'path', { d: uniq, class: 'st-blk st-blk-u' });
      var cp = mk(svg.querySelector('defs'), 'clipPath', { id: id + 'n' });
      g.nmA = mk(cp, 'rect', { x: l.zx0 - 1, y: y0 - 1, width: 0, height: 0 });
      g.nmB = mk(cp, 'rect', { x: l.zx0 - 1, y: y0 - 1, width: 0, height: pitch });
      mk(m, 'path', { d: all, class: 'st-blk-n', 'clip-path': 'url(#' + id + 'n)' });
      g.mxGeo = { cols: cols, pitch: pitch, y0: y0 };
      var ly = y0 + rows * pitch + (l.n ? 14 : 18), lx = l.zx0;
      [['st-blk', '14,800 shared tokens'], ['st-blk st-blk-u', '200 unique'], [null, '→ 16 output tokens']].slice(0, l.n ? 2 : 3).forEach(function (a) {
        if (a[0]) { mk(m, 'rect', { x: lx, y: ly - 7, width: 7, height: 7, rx: 1, class: a[0] }); lx += 12; }
        lx += tw(txt(m, lx, ly, a[1], 'st-sub st-xs'), a[1].length * 6.3) + 18;
      });
      // scene 2 readouts: the time spent naming, and py-spy's share
      var r = g.py = mk(g.zone, 'g', {}), ry = ly + (l.n ? 24 : 40), half = l.n ? 0 : l.zw * (l.m ? .46 : .36);
      if (!l.n) {
        txt(r, l.zx0, ry, 'naming the prompt', 'st-k');
        var big = txt(r, l.zx0, ry + 24, F.ms + ' ms', 'st-v st-xl');
        txt(r, l.zx0 + tw(big, 56) + 10, ry + 24, 'per request, ' + F.blocks + ' blocks', 'st-sub');
      }
      var bx = l.n ? l.zx0 : l.zx0 + half + 24, by = ry, bw = l.zx1 - bx;
      txt(r, bx, by, 'py-spy · engine thread samples', 'st-k');
      mk(r, 'rect', { x: bx, y: by + 12, width: bw, height: 8, rx: 4, class: 'st-track' });
      g.pyFill = mk(r, 'rect', { x: bx, y: by + 12, width: 0, height: 8, rx: 4, class: 'st-hot' });
      var hl = txt(r, bx, by + 38, 'hash_of_block', 'st-v st-sm');
      g.pyTxt = txt(r, bx + tw(hl, 92) + 10, by + 38, '', 'st-v st-sm st-blue');
      g.pyTick = mk(r, 'line', { y1: by + 9, y2: by + 23, class: 'st-lead' });
      g.pyGeo = { x: bx, w: bw };
    }
    function drawMatrix(t, k) {
      var mg = g.mxGeo, n = Math.round(F.blocks * k), rr = Math.floor(n / mg.cols), cc = n % mg.cols;
      set(g.nmA, { width: mg.cols * mg.pitch + 2, height: rr * mg.pitch });
      set(g.nmB, { y: mg.y0 - 1 + rr * mg.pitch, width: cc * mg.pitch });
      var out = eio(seg(t, .395, .43));
      tr(g.mx, 0, -14 * out); op(g.mx, 1 - out);
      var pin = eo(seg(t, .23, .30)), fill = eo(seg(t, .27, .37));
      tr(g.py, 0, 8 * (1 - pin) - 14 * out); op(g.py, pin * (1 - out));
      g.pyFill.setAttribute('width', (g.pyGeo.w * F.share / 100 * fill).toFixed(2));
      var fx = (g.pyGeo.x + g.pyGeo.w * F.share / 100 * fill).toFixed(2);
      set(g.pyTick, { x1: fx, x2: fx }); op(g.pyTick, fill);
      tx(g.pyTxt, (F.share * fill).toFixed(1) + '% of samples');
    }

    /* scenes 3-4: the O(L^2) staircase and its chain; three predictions; the selected one becomes "Implement" */
    function buildPredict(l) {
      var p = g.pr = mk(g.zone, 'g', {}), n = l.n;
      var lw = n ? l.zw * .36 : l.zw * .42, rx0 = l.zx0 + (n ? l.zw * .40 : l.zw * .5), rw = l.zx1 - rx0;
      var rowP = n ? 9 : 15, rowH = n ? 5 : 8, y0 = l.zy + (n ? 16 : 26), u = (lw - 4) / 8, cu = n ? 10 : 14;
      var ky = l.zy + (n ? 4 : 6);
      g.kb = mk(p, 'g', {}); g.ka = mk(p, 'g', {});
      var kb = txt(g.kb, l.zx0, ky, 'before', 'st-k'), ka = txt(g.ka, l.zx0, ky, 'after', 'st-k st-blue');
      txt(g.kb, l.zx0 + tw(kb, 44) + 8, ky + .5, n ? 'O(L²)' : l.m ? 'block i hashes 0…16(i+1)' : 'block i hashes tokens 0…16(i+1)', 'st-sub st-xs');
      txt(g.ka, l.zx0 + tw(ka, 36) + 8, ky + .5, 'hᵢ = hash(hᵢ₋₁, blockᵢ)', 'st-v st-xs st-blue');
      g.rows = [];
      for (var i = 0; i < 7; i++) {
        var y = y0 + i * rowP;
        g.rows.push({ a: mk(p, 'rect', { x: l.zx0, y: y, height: rowH, rx: 1.5, class: 'st-stair' }), b: mk(p, 'rect', { x: l.zx0, y: y, height: rowH, rx: 1.5, class: 'st-chain' }), w: (i + 1) * u, cu: cu,
          ar: i ? mk(p, 'path', { d: 'M' + (l.zx0 + cu + 6) + ' ' + (y - rowP + rowH / 2 + 1) + 'V' + (y + rowH / 2 - 1) + 'm-2.2 -2.6l2.2 2.6l2.2 -2.6', class: 'st-arrow' }) : null });
      }
      var cy = y0 + 7 * rowP + (n ? 9 : 14);
      g.wb = txt(p, l.zx0, cy, n ? '≈7M tokens' : '⋮  work ∝ L², ≈7M tokens per request', 'st-sub st-xs');
      g.wa = txt(p, l.zx0, cy, n ? '≈15k tokens' : '⋮  work ∝ L, ≈15k tokens per request', 'st-sub st-xs');
      g.mb = mk(p, 'g', {});
      var my = cy + (n ? 22 : 36);
      txt(g.mb, l.zx0, my, n ? 'microbenchmark' : 'microbenchmark · Sequence class', 'st-k');
      var mv = txt(g.mb, l.zx0, my + (n ? 18 : 22), F.bench[0] + ' → ' + F.bench[1] + ' ms', 'st-v ' + (n ? 'st-big' : 'st-xl'));
      if (!n) txt(g.mb, l.zx0 + tw(mv, 150) + 10, my + 22, 'per request', 'st-sub');

      // cards: Analysis 1-3 with predicted E2E, as in the paper's overview figure
      g.kc = txt(p, rx0, l.zy + (n ? 4 : 6), n ? 'pred. E2E' : 'parallel analyzers · predicted E2E', 'st-k');
      var gap = n ? 6 : 12, cw = (rw - 2 * gap) / 3, ch = n ? 64 : Math.min(118, Math.max(96, l.zh * .34)), cy0 = y0 + (n ? 6 : 10);
      g.cards = F.preds.map(function (v, i) {
        var x = rx0 + i * (cw + gap), c = { g: mk(p, 'g', {}), x: x, y: cy0, w: cw, h: ch };
        c.box = mk(c.g, 'rect', { x: x, y: cy0, width: cw, height: ch, rx: n ? 9 : 12, class: 'st-card' });
        c.ring = mk(c.g, 'rect', { x: x - 1, y: cy0 - 1, width: cw + 2, height: ch + 2, rx: n ? 10 : 13, class: 'st-ring' });
        c.txt = mk(c.g, 'g', {}); c.rx = n ? 9 : 12;
        var cc = !n && cw < 104, hx = x + (n ? cw / 2 : 12), hy = cy0 + (n ? 20 : 24), nx = n ? hx : cc ? hx + 8 : hx + 66;
        if (!n && !cc) txt(c.txt, hx, hy, 'Analysis', 'st-lab');
        mk(c.txt, 'circle', { cx: nx, cy: hy - 4.5, r: 8, class: 'st-nb' });
        txt(c.txt, nx, hy - 1, String(i + 1), 'st-nbt', 'middle');
        if (!n) txt(c.txt, hx, cy0 + ch - (cc ? 34 : 38), cc ? 'pred.' : 'pred. E2E', 'st-k');
        c.valCls = 'st-v ' + (n ? 'st-md' : cc ? 'st-big' : 'st-xl');
        c.val = txt(c.txt, hx, cy0 + ch - 14, pct(v, i === 2 ? 1 : 0), c.valCls, n ? 'middle' : null);
        if (i === 2) {
          c.tab = mk(c.g, 'g', {}); tr(c.tab, x + cw / 2, cy0 - 1);
          var tw2 = n ? 25 : 31;
          mk(c.tab, 'rect', { x: -tw2, y: -8, width: 2 * tw2, height: 16, rx: 8, class: 'st-tabbg' });
          txt(c.tab, 0, 3.5, 'selected', 'st-tabt', 'middle');
        }
        return c;
      });
      // the implementer: a black pill grown out of the selected card
      var pw = Math.min(rw, n ? 150 : 230), ph = n ? 36 : 46, px = rx0 + (rw - pw) / 2, py = cy0 + (ch - ph) / 2 - (n ? 4 : 10);
      g.pill = { g: mk(p, 'g', {}), to: [px, py, pw, ph] };
      g.pill.box = mk(g.pill.g, 'rect', { class: 'st-pill' });
      g.pill.lbl = mk(g.pill.g, 'g', {}); tr(g.pill.lbl, px + pw / 2, py + ph / 2);
      var ic = txt(g.pill.lbl, 0, n ? 4.5 : 5, '</>', 'st-pillt st-pilli'), it = txt(g.pill.lbl, 0, n ? 4.5 : 5, 'Implement', 'st-pillt');
      var wi = tw(ic, 22), wt = tw(it, 80), x0 = -(wi + 9 + wt) / 2;
      ic.setAttribute('x', x0); it.setAttribute('x', x0 + wi + 9);
      g.ol = mk(p, 'g', {});
      txt(g.ol, px + pw / 2, py + ph + (n ? 18 : 26), n ? 'O(L²) → O(L)' : 'analysis 3 only · O(L²) → O(L)', 'st-k', 'middle');
    }
    function box(r, x, y, w, h, rx) { set(r, { x: x.toFixed(2), y: y.toFixed(2), width: Math.max(0, w).toFixed(2), height: Math.max(0, h).toFixed(2), rx: rx }); }
    function drawPredict(t, f) {
      var out = eio(seg(t, .80, .825)), vin = eo(seg(t, .435, .47)), vis = vin * (1 - out);
      op(g.pr, vis); tr(g.pr, 0, 10 * (1 - vin) - 14 * out);
      if (vis === 0) return;
      var fo = 1 - seg(f, 0, .4), fi = seg(f, .5, 1);
      op(g.kb, fo); op(g.ka, fi); op(g.wb, fo); op(g.wa, fi);
      g.rows.forEach(function (r, i) {
        var grow = eo(seg(t, .44 + i * .008, .505 + i * .008)), w = lerp(r.w, r.cu, f) * grow;
        set(r.a, { width: w.toFixed(2) }); set(r.b, { width: w.toFixed(2) }); op(r.b, f); op(r.a, 1 - f * .9);
        if (r.ar) op(r.ar, seg(f, .5 + i * .05, .8 + i * .03));
      });
      var mb = eo(seg(t, .46, .53)); op(g.mb, mb); tr(g.mb, 0, 8 * (1 - mb));
      // the selected card empties, its outline shrinks into the pill, then the pill fills: analysis -> implementer
      var sel = eio(seg(t, .555, .595)), im = seg(t, .60, .69), gm = eio(seg(im, .15, .8)), P = g.pill.to;
      op(g.kc, 1 - seg(im, 0, .3));
      g.cards.forEach(function (c, i) {
        var a = eo(seg(t, .47 + i * .022, .535 + i * .022));
        tr(c.g, 0, 10 * (1 - a));
        if (i < 2) { op(c.g, a * (1 - .45 * sel) * (1 - seg(im, 0, .35))); op(c.ring, 0); return; }
        op(c.g, a); op(c.txt, 1 - seg(im, 0, .3));
        var X = lerp(c.x, P[0], gm), Y = lerp(c.y, P[1], gm), Wd = lerp(c.w, P[2], gm), Ht = lerp(c.h, P[3], gm), R = lerp(c.rx, P[3] / 2, gm);
        box(c.box, X, Y, Wd, Ht, R); box(c.ring, X - 1, Y - 1, Wd + 2, Ht + 2, R + 1);
        op(c.box, 1 - seg(im, .8, 1)); op(c.ring, sel * (1 - seg(im, .85, 1)));
        if (c.tab) { op(c.tab, sel * (1 - seg(im, 0, .25))); tr(c.tab, c.x + c.w / 2, c.y - 1 + 4 * (1 - sel)); }
        cls(c.val, c.valCls + (sel > .5 ? ' st-sel' : ''));
      });
      box(g.pill.box, P[0], P[1], P[2], P[3], P[3] / 2);
      op(g.pill.box, seg(im, .72, .95)); op(g.pill.lbl, seg(im, .82, 1));
      var ol = eo(seg(t, .68, .75)); op(g.ol, ol); tr(g.ol, 0, 6 * (1 - ol));
    }

    /* scene 5: one deployment on the scoring node, three arms on the same hardware (Table qual-4696) */
    function buildMeasure(l) {
      var m = g.ms = mk(g.zone, 'g', {}), n = l.n;
      var ky = l.zy + (n ? 4 : 6), lab = n ? 62 : 76, bx = l.zx0 + lab, bw = (l.zw - lab) * (n ? .56 : l.m ? .4 : .5);
      var y0 = ky + (n ? 22 : 34), pitch = n ? 30 : 40, bh = n ? 11 : 14;
      mk(m, 'circle', { cx: l.zx0 + 3.5, cy: ky - 3.5, r: 3.5, class: 'st-vdot' });
      txt(m, l.zx0 + 13, ky, n ? 'measured once · E2E mean' : 'measured once on the scoring node · E2E mean', 'st-k');
      var arms = [['baseline', F.base, null, 'st-bar0'], ['expert', F.expert, F.ex, 'st-bar1'], ['agent', F.agent, F.ag, 'st-bar2']];
      g.bars = arms.map(function (a, i) {
        var y = y0 + i * pitch, w = bw * a[1] / F.base, r = { g: mk(m, 'g', {}), w: w, x: bx };
        txt(r.g, l.zx0, y + bh / 2 + 4, a[0], i === 2 ? 'st-lab' : 'st-sub');
        r.bar = mk(r.g, 'rect', { x: bx, y: y, height: bh, rx: 3, class: a[3] });
        r.val = mk(r.g, 'g', {});
        var v = txt(r.val, 0, bh / 2 + 4, a[1].toFixed(3) + ' s', 'st-v st-sm');
        if (a[2]) txt(r.val, tw(v, 50) + 10, bh / 2 + 4, a[2].toFixed(2) + '×', 'st-v st-sm ' + (i === 2 ? 'st-sel' : 'st-dim'));
        r.y = y; return r;
      });
      var ex = bx + g.bars[1].w;
      g.exLine = mk(m, 'line', { x1: ex, x2: ex, y1: y0 + pitch - 5, y2: y0 + 2 * pitch - 3, class: 'st-exl' });
      // the normalized gain: (speedup of the patch - 1) / (speedup of the expert's fix - 1)
      var gx = n ? l.zx0 : l.zx0 + l.zw * (l.m ? .72 : .7), gy = n ? y0 + 3 * pitch + 4 : y0 + 8;
      g.gain = mk(m, 'g', {}); tr(g.gain, gx, gy);
      if (n) {
        g.gainV = txt(g.gain, -1, 30, '0%', 'st-gainv');
        txt(g.gain, 104, 12, 'normalized gain', 'st-k');
        txt(g.gain, 104, 28, (F.gain / 100).toFixed(1) + '× the expert\'s gain', 'st-sub st-xs');
      } else {
        txt(g.gain, 0, 0, 'normalized gain', 'st-k');
        g.gainV = txt(g.gain, -2, 50, '0%', 'st-gainv');
        txt(g.gain, 0, 76, (F.gain / 100).toFixed(1) + '× the expert\'s gain', 'st-sub');
      }
    }
    function drawMeasure(t) {
      var vis = eo(seg(t, .825, .855)); op(g.ms, vis); tr(g.ms, 0, 10 * (1 - vis));
      if (vis === 0) return;
      g.bars.forEach(function (r, i) {
        var a = eio(seg(t, .83 + i * .025, .9 + i * .025)), w = r.w * a;
        set(r.bar, { width: w.toFixed(2) });
        tr(r.val, r.x + w + 10, r.y); op(r.val, seg(a, .55, 1)); op(r.g, seg(t, .825 + i * .02, .86 + i * .02));
      });
      op(g.exLine, seg(t, .9, .94));
      var c = eo(seg(t, .86, .965));
      op(g.gain, seg(t, .85, .88)); tx(g.gainV, Math.round(F.gain * c) + '%');
    }

    function drawZone(t, f, k) {
      drawMatrix(t, k);
      drawPredict(t, f);
      drawMeasure(t);
      var m = eio(seg(t, .84, .93));
      tx(g.e2e, lerp(F.base, F.agent, m).toFixed(3) + ' s');
      cls(g.e2e, 'st-v st-big' + (m > 0 ? ' st-violet' : ''));
      tx(g.e2eLbl, m > .5 ? 'measured E2E' : 'E2E mean'); cls(g.e2eLbl, 'st-k' + (m > .5 ? ' st-violet' : ''));
    }

    /* -------------------------------------------------------------- render(t): every scene is a function of t */
    var drift = 0, lastNow = 0;
    function render(t, now) {
      if (!L) return;
      var dt = lastNow ? Math.min(.05, (now - lastNow) / 1000) : 0; lastNow = now;
      // live: the trace drifts left; captured: it settles forward onto a whole period, so every reader sees one frame
      var s = eio(seg(t, .17, .25));
      if (s === 0 && now) drift = (drift + dt * .32) % C.period;
      var off = lerp(drift, C.period, s);
      var k = seg(t, .22, .36), f = eio(seg(t, .62, .72));
      drawTrace(off, s, f, k);
      tx(g.liveTxt, s < .5 ? 'live' : 'profile');
      op(g.live, s < .5 ? .55 + .45 * Math.cos(now / 380) : 1);
      drawZone(t, f, k);
    }
    function resize(w, h, force) {
      w = Math.round(w); h = Math.round(h);
      if (w < 10 || h < 10 || (!force && L && w === cw && h === ch)) return false;
      cw = w; ch = h;
      // too short for the scene: lay it out at the height it needs and let the viewBox scale it down uniformly (a short,
      // wide stage takes the compact layout, which needs less height and so stays larger)
      var n = w < 560 || h < 450, H = Math.max(h, needH(n)), W = Math.round(w * H / h), k = h / H;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('class', n ? 'st-svg st-n' : 'st-svg');
      L = layout(W, H, n); build();
      // the schematic note sits under the time axis, right-aligned, and scales with the drawing
      note.style.right = (L.pad * k).toFixed(2) + 'px'; note.style.top = ((L.axY + 3) * k).toFixed(2) + 'px';
      note.style.transform = k < 1 ? 'scale(' + k.toFixed(4) + ')' : '';
      return true;
    }
    return { svg: svg, render: render, resize: resize, isLive: function (t) { return t < .25; } };
  }

  /* ================================================================ controller */
  var track = sec.querySelector('.story-track'), ol = sec.querySelector('.story-steps');
  var steps = [].slice.call(sec.querySelectorAll('.story-step'));
  var kickers = steps.map(function (li) { var k = li.querySelector('.story-step-k'); return k ? k.textContent : ''; });
  var LAND = [.02, .375, .585, .775, .975], SHOT = [.12, .385, .595, .79, 1];
  function navH() { return parseFloat(UI.css('--nav-h')) || 60; }
  function restoreKickers() { steps.forEach(function (li, i) { var k = li.querySelector('.story-step-k'); if (k) k.textContent = kickers[i]; }); }

  /* pinned and scroll-scrubbed */
  function live() {
    var stage = makeStage(mount), alive = true;
    sec.classList.add('is-live');
    var t = 0, target = 0, raf = 0, onScreen = true, last = 0, active = -1;
    function measure() { target = UI.trackProgress(track, navH()); }
    function goTo(i) {
      var r = track.getBoundingClientRect(), span = r.height - (window.innerHeight - navH());
      window.scrollTo({ top: window.pageYOffset + r.top - navH() + span * LAND[i] + 1, behavior: UI.reduced() ? 'auto' : 'smooth' });
    }
    // each kicker becomes a button that scrolls to its scene; dots and a skip link follow the list
    steps.forEach(function (li, i) {
      var k = li.querySelector('.story-step-k');
      if (!k) return;
      k.textContent = '';
      k.appendChild(UI.el('button', { type: 'button', class: 'story-jump', text: kickers[i], 'aria-label': 'Show step ' + (i + 1) + ' of ' + steps.length + ': ' + kickers[i].replace(/^\d+\s*·\s*/, ''), onclick: function () { goTo(i); } }));
    });
    var dots = UI.el('div', { class: 'story-dots', 'aria-hidden': 'true' }, steps.map(function () { return UI.el('i'); }));
    var ctl = UI.el('div', { class: 'story-ctl' }, [dots, UI.el('a', { class: 'story-skip', href: '#overview', html: 'Skip the walkthrough <span aria-hidden="true">↓</span>' })]);
    if (ol) ol.parentNode.insertBefore(ctl, ol.nextSibling);
    function caption() {
      if (ol) ol.style.setProperty('--p', clamp(t * 1.25).toFixed(4));
      var a = Math.min(steps.length - 1, Math.floor(t * 5 + 1e-6));
      if (a === active) return;
      active = a;
      steps.forEach(function (li, i) {
        li.classList.toggle('is-active', i === a); li.classList.toggle('is-past', i < a);
        if (i === a) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      [].forEach.call(dots.children, function (d, i) { d.className = i === a ? 'on' : i < a ? 'past' : ''; });
    }
    function fit(force) { var r = mount.getBoundingClientRect(); if (stage.resize(r.width, r.height, force)) stage.render(t, last); }
    function frame(now) {
      raf = 0;
      if (!alive) return;
      var dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now;
      var d = target - t;
      t = Math.abs(d) < 1e-4 ? target : t + d * (1 - Math.exp(-dt * 6.5));
      stage.render(t, now);
      caption();
      if (onScreen && !document.hidden && (t !== target || stage.isLive(t))) raf = requestAnimationFrame(frame);
    }
    function kick() { if (alive && !raf && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    function onScroll() { if (onScreen) { measure(); kick(); } }
    function onResize() { measure(); fit(); kick(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', kick);
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { fit(); kick(); }) : null;
    if (ro) ro.observe(mount);
    // run only while the stage itself is in view (it is sticky, so that is the whole walkthrough). Entering or leaving,
    // snap to the scroll position: after a long jump the stage never eases through every scene in between, and a
    // reader coming back the way they left finds the right scene already drawn.
    UI.watch(mount, function (v) {
      onScreen = v;
      measure(); t = target; stage.render(t, performance.now()); caption();
      kick();
    }, '0px 0px -1px 0px');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (alive) { fit(true); kick(); } });
    measure(); t = target; fit(); caption(); kick();
    return function () {
      alive = false; if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', kick);
      if (ro) ro.disconnect();
      ctl.remove(); restoreKickers(); mount.textContent = '';
      sec.classList.remove('is-live');
      steps.forEach(function (li) { li.classList.remove('is-active', 'is-past'); li.removeAttribute('aria-current'); });
    };
  }

  /* stills: no pinning, a static snapshot of each scene beside its caption */
  function still() {
    var alive = true;
    sec.classList.add('is-still');
    var shots = steps.map(function (li, i) {
      var host = UI.el('div', { class: 'story-stage story-shot', 'aria-hidden': 'true' });
      li.appendChild(host);
      return { host: host, stage: makeStage(host), t: SHOT[i] };
    });
    function fit(force) {
      if (alive) shots.forEach(function (s) { var r = s.host.getBoundingClientRect(); if (s.stage.resize(r.width, r.height, force)) s.stage.render(s.t, 0); });
    }
    function onResize() { fit(); }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(onResize) : null;
    if (ro) shots.forEach(function (s) { ro.observe(s.host); });
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(true); });
    fit();
    return function () {
      alive = false;
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
      shots.forEach(function (s) { s.host.remove(); });
      sec.classList.remove('is-still');
    };
  }

  /* stills for reduced motion, and for viewports too short to pin the copy beside (or above) a legible stage */
  var short = window.matchMedia('(max-height: 600px), (max-width: 860px) and (max-height: 640px)'), stop = null, printing = false;
  function start() {
    try { stop = UI.reduced() || short.matches || printing ? still() : live(); }
    catch (err) { sec.classList.remove('is-live', 'is-still'); mount.textContent = ''; restoreKickers(); stop = null; if (window.console) console.warn('story:', err); }
  }
  function restart() { try { if (stop) stop(); } catch (e) {} start(); }
  /* print / save as PDF gets the five complete stills, not one frame of the pinned stage */
  window.addEventListener('beforeprint', function () { printing = true; restart(); });
  window.addEventListener('afterprint', function () { printing = false; restart(); });
  start();
  UI.onReducedChange(restart);
  if (short.addEventListener) short.addEventListener('change', restart);
})();
