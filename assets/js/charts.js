/* LMSysDojo project page: the shared SVG chart helper (window.LMSDCharts). Line charts with a crosshair tooltip and
 * toggleable legend, horizontal bars (linear or log), and donuts. Charts render at the host's pixel width, so text
 * stays at its CSS size, re-render on resize, take their colours from CSS variables (so a theme switch needs no
 * redraw), and draw themselves in the first time they scroll into view. Depends on site.js (LMSDUI). */
(function () {
  'use strict';
  var UI = window.LMSDUI;
  var S = UI.svg, E = UI.el;

  function ticksFor(lo, hi, n) {
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / n)));
    var err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function scale(d0, d1, r0, r1, log) {
    if (log) {
      var l0 = Math.log(d0), l1 = Math.log(d1);
      return function (v) { return r0 + (Math.log(v) - l0) / (l1 - l0) * (r1 - r0); };
    }
    return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
  }
  /* run render(width) now and whenever the host's width changes */
  function responsive(host, render) {
    var last = 0;
    function go() {
      var w = Math.round(host.clientWidth);
      if (!w || w === last) return;
      last = w; render(w);
    }
    if ('ResizeObserver' in window) new ResizeObserver(go).observe(host);
    else window.addEventListener('resize', go);
    go();
  }
  /* show a chart's final state at once (print, ?reveal=all) */
  function finish(svg) {
    svg.querySelectorAll('path.line, .bar-anim, .pt, .end, .val-anim, .donut-label').forEach(function (n) {
      n.style.transition = 'none'; n.style.strokeDashoffset = 0; n.style.opacity = 1;
      if (n.classList.contains('bar-anim')) n.style.transform = 'scaleX(1)';
    });
    svg.querySelectorAll('circle[data-dash]').forEach(function (c) { c.style.transition = 'none'; c.style.strokeDasharray = c.getAttribute('data-dash'); });
  }
  window.addEventListener('beforeprint', function () { document.querySelectorAll('.chart svg').forEach(finish); });
  function drawIn(host, svg) {
    if (UI.reduced() || UI.revealAll) return;
    var lines = svg.querySelectorAll('path.line, .bar-anim');
    if (host.__drawn) return;
    lines.forEach(function (p) {
      if (p.classList.contains('bar-anim')) { p.style.transform = 'scaleX(0)'; return; }
      if (p.style.strokeDasharray) { p.style.opacity = 0; p.__fade = true; return; }   /* dashed series fade, keeping their dash */
      var L = p.getTotalLength(); p.style.strokeDasharray = L + ' ' + L; p.style.strokeDashoffset = L;
    });
    svg.querySelectorAll('.pt, .end, .val-anim').forEach(function (n) { n.style.opacity = 0; });
    UI.onVisible(host, function () {
      host.__drawn = true;
      lines.forEach(function (p, i) {
        if (p.classList.contains('bar-anim')) {
          p.style.transition = 'transform 1.1s cubic-bezier(.16,1,.3,1) ' + (i * 0.06) + 's';
          requestAnimationFrame(function () { p.style.transform = 'scaleX(1)'; });
          return;
        }
        if (p.__fade) {
          p.style.transition = 'opacity .9s ease ' + (i * 0.12) + 's';
          requestAnimationFrame(function () { p.style.opacity = 1; });
          return;
        }
        p.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.65,0,.35,1) ' + (i * 0.12) + 's';
        requestAnimationFrame(function () { p.style.strokeDashoffset = 0; });
      });
      svg.querySelectorAll('.pt, .end, .val-anim').forEach(function (n) {
        n.style.transition = 'opacity .6s ease ' + (lines.length * 0.12 + .9) + 's';
        requestAnimationFrame(function () { n.style.opacity = 1; });
      });
    }, '0px 0px -15% 0px');
  }

  /* ------------------------------------------------------------------ line chart
   * opts: {
   *   x: [..] shared x values (or give each series `points: [[x,y],..]`), xDomain, xTicks, xTitle, xLog, xFormat,
   *   yDomain, yTicks, yTitle, yFormat, height (px, default 340), margin {t,r,b,l},
   *   series: [{key, label, values | points, color: 'var(--s-gap)', dash, marker: true, endLabel: true|'label'|fn, width}],
   *   refs: [{y, label}], bands: [{y0, y1, label}], legend: true, tooltip: true,
   *   tipTitle: function (x) {}, valueFormat: function (v) {}, onHover: function (xIndex|null) {}
   * } -> { setVisible(keys), highlight(key|null), host }
   */
  function line(host, o) {
    host.classList.add('chart');
    var visible = {};
    o.series.forEach(function (s) { visible[s.key] = s.hidden ? false : true; });
    var legend = null, tip = null, api = { host: host };
    if (o.legend !== false) {
      legend = E('div', { class: 'chart-legend', role: 'group', 'aria-label': 'Toggle series' });
      o.series.forEach(function (s) {
        var b = E('button', { type: 'button', 'aria-pressed': String(visible[s.key]), style: { '--c': s.color } },
          [E('i', { class: s.dash ? 'dash' : '' }), s.label]);
        b.addEventListener('click', function () {
          visible[s.key] = !visible[s.key];
          b.setAttribute('aria-pressed', String(visible[s.key]));
          render(host.clientWidth, true);
        });
        b.addEventListener('mouseenter', function () { api.highlight(s.key); });
        b.addEventListener('mouseleave', function () { api.highlight(null); });
        legend.appendChild(b);
      });
      host.appendChild(legend);
    }
    var holder = E('div', { style: { position: 'relative' } });
    host.appendChild(holder);
    if (o.tooltip !== false) { tip = E('div', { class: 'chart-tip', role: 'status', 'aria-live': 'polite' }); holder.appendChild(tip); }
    var svg = null;
    var yFmt = o.yFormat || function (v) { return v; };
    var xFmt = o.xFormat || function (v) { return v; };
    var vFmt = o.valueFormat || function (v) { return (Math.round(v * 10) / 10).toFixed(1); };

    function pts(s) {
      if (s.points) return s.points;
      return o.x.map(function (x, i) { return [x, s.values[i]]; }).filter(function (p) { return p[1] != null; });
    }
    function render(W, keepDrawn) {
      if (!W) return;
      var H = o.height || 340;
      var m = Object.assign({ t: 16, r: 64, b: 48, l: 52 }, o.margin || {});
      if (W < 520) { m.r = Math.min(m.r, 44); H = Math.round(H * .9); }
      var iw = Math.max(20, W - m.l - m.r), ih = Math.max(20, H - m.t - m.b);
      var xs = scale(o.xDomain[0], o.xDomain[1], m.l, m.l + iw, o.xLog);
      var ys = scale(o.yDomain[0], o.yDomain[1], m.t + ih, m.t);
      if (svg) svg.remove();
      svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': o.ariaLabel || o.yTitle || 'chart' });
      var grid = S('g', { class: 'grid' }), ticks = S('g', { class: 'tick' });
      (o.yTicks || ticksFor(o.yDomain[0], o.yDomain[1], 5)).forEach(function (v) {
        grid.appendChild(S('line', { x1: m.l, x2: m.l + iw, y1: ys(v), y2: ys(v) }));
        ticks.appendChild(S('text', { x: m.l - 10, y: ys(v) + 4, 'text-anchor': 'end', text: yFmt(v) }));
      });
      (o.xTicks || ticksFor(o.xDomain[0], o.xDomain[1], 6)).forEach(function (v) {
        ticks.appendChild(S('text', { x: xs(v), y: m.t + ih + 20, 'text-anchor': 'middle', text: xFmt(v) }));
      });
      svg.appendChild(grid);
      svg.appendChild(S('line', { class: 'axis-line', x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih }));
      svg.appendChild(ticks);
      if (o.xTitle) svg.appendChild(S('text', { class: 'axis-title', x: m.l + iw / 2, y: H - 6, 'text-anchor': 'middle', text: o.xTitle }));
      if (o.yTitle) svg.appendChild(S('text', { class: 'axis-title', x: 14, y: m.t + ih / 2, 'text-anchor': 'middle', transform: 'rotate(-90 ' + 14 + ' ' + (m.t + ih / 2) + ')', text: o.yTitle }));
      (o.bands || []).forEach(function (b) {
        svg.appendChild(S('rect', { x: m.l, width: iw, y: ys(b.y1), height: ys(b.y0) - ys(b.y1), style: { fill: b.color || 'var(--panel)' } }));
        if (b.label) svg.appendChild(S('text', { class: 'ref-label', x: m.l + 8, y: ys(b.y1) + 15, text: b.label }));
      });
      (o.refs || []).forEach(function (r) {
        svg.appendChild(S('line', { class: 'ref-line', x1: m.l, x2: m.l + iw, y1: ys(r.y), y2: ys(r.y) }));
        if (r.label) svg.appendChild(S('text', { class: 'ref-label', x: m.l + 8, y: ys(r.y) - 7, text: r.label }));
      });
      var endLabels = [];
      o.series.forEach(function (s) {
        if (!visible[s.key]) return;
        var P = pts(s), g = S('g', { class: 'series', 'data-key': s.key });
        var d = P.map(function (p, i) { return (i ? 'L' : 'M') + xs(p[0]).toFixed(1) + ' ' + ys(p[1]).toFixed(1); }).join('');
        g.appendChild(S('path', { class: 'line', d: d, style: { stroke: s.color, 'stroke-dasharray': s.dash || null, 'stroke-width': s.width ? s.width + 'px' : null } }));
        if (s.marker !== false && !s.points) P.forEach(function (p) {
          g.appendChild(S('circle', { class: 'pt', cx: xs(p[0]), cy: ys(p[1]), r: s.r || 4, style: { fill: s.color } }));
        });
        if (s.endLabel !== false) {
          var last = P[P.length - 1];
          var txt = typeof s.endLabel === 'function' ? s.endLabel(last[1]) : (s.endLabel === 'label' ? s.label : vFmt(last[1]));
          endLabels.push({ y: ys(last[1]), x: xs(last[0]) + 10, txt: txt, color: s.color, g: g });
        }
        svg.appendChild(g);
      });
      /* keep end labels from overlapping: nudge apart top to bottom */
      endLabels.sort(function (a, b) { return a.y - b.y; });
      for (var i = 1; i < endLabels.length; i++) if (endLabels[i].y - endLabels[i - 1].y < 15) endLabels[i].y = endLabels[i - 1].y + 15;
      endLabels.forEach(function (l) {
        l.g.appendChild(S('text', { class: 'end', x: l.x, y: l.y + 4, text: l.txt, style: { fill: l.color } }));
      });
      /* hover layer */
      var cross = S('line', { class: 'cross', y1: m.t, y2: m.t + ih, x1: -10, x2: -10, style: { visibility: 'hidden' } });
      var dots = S('g');
      svg.appendChild(cross); svg.appendChild(dots);
      var hit = S('rect', { class: 'hit', x: m.l, y: m.t, width: iw, height: ih });
      svg.appendChild(hit);
      function nearestX(px) {
        if (o.x) {
          var best = 0, bd = 1e9;
          o.x.forEach(function (x, i) { var dd = Math.abs(xs(x) - px); if (dd < bd) { bd = dd; best = i; } });
          return { i: best, x: o.x[best] };
        }
        var inv = o.xDomain[0] + (px - m.l) / iw * (o.xDomain[1] - o.xDomain[0]);
        return { i: null, x: inv };
      }
      function move(ev) {
        var r = svg.getBoundingClientRect();
        var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
        var n = nearestX(cx * (W / r.width));
        var X = xs(n.x);
        cross.setAttribute('x1', X); cross.setAttribute('x2', X); cross.style.visibility = 'visible';
        while (dots.firstChild) dots.removeChild(dots.firstChild);
        var rows = [];
        o.series.forEach(function (s) {
          if (!visible[s.key]) return;
          var P = pts(s), p = null;
          if (n.i != null && !s.points) p = P[n.i];
          else { var bd = 1e9; P.forEach(function (q) { var dd = Math.abs(q[0] - n.x); if (dd < bd) { bd = dd; p = q; } }); }
          if (!p) return;
          dots.appendChild(S('circle', { cx: xs(p[0]), cy: ys(p[1]), r: 5.5, style: { fill: s.color, stroke: 'var(--bg)', 'stroke-width': '2px' } }));
          rows.push({ s: s, v: p[1], x: p[0] });
        });
        if (tip) {
          rows.sort(function (a, b) { return b.v - a.v; });
          var title = o.tipTitle ? o.tipTitle(rows.length ? rows[0].x : n.x) : 'x = ' + n.x;
          tip.innerHTML = '<div class="tt">' + title + '</div>' + rows.map(function (r) {
            return '<div class="row" style="--c:' + r.s.color + '"><span><i></i>' + r.s.label + '</span><b>' + vFmt(r.v) + '</b></div>';
          }).join('');
          var tw = tip.offsetWidth, left = X * (r.width / W) + 16;
          if (left + tw > r.width) left = X * (r.width / W) - tw - 16;
          tip.style.left = Math.max(0, left) + 'px'; tip.style.top = (m.t + 6) + 'px';
          tip.classList.add('show');
        }
        if (o.onHover) o.onHover(n.i, n.x);
      }
      function leave() {
        cross.setAttribute('x1', -10); cross.setAttribute('x2', -10); cross.style.visibility = 'hidden';
        while (dots.firstChild) dots.removeChild(dots.firstChild);
        if (tip) tip.classList.remove('show');
        if (o.onHover) o.onHover(null);
      }
      hit.addEventListener('mousemove', move);
      hit.addEventListener('touchmove', move, { passive: true });
      hit.addEventListener('mouseleave', leave);
      hit.addEventListener('touchend', leave);
      holder.appendChild(svg);
      if (!keepDrawn) drawIn(host, svg);
    }
    api.setVisible = function (keys) {
      Object.keys(visible).forEach(function (k) { visible[k] = keys.indexOf(k) >= 0; });
      if (legend) legend.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(visible[o.series[i].key])); });
      render(host.clientWidth, true);
    };
    api.highlight = function (key) {
      if (!svg) return;
      svg.querySelectorAll('.series').forEach(function (g) { g.classList.toggle('dim', !!key && g.getAttribute('data-key') !== key); });
    };
    responsive(holder, function (w) { render(w, !!host.__drawn); });
    return api;
  }

  /* ------------------------------------------------------------------ horizontal bars
   * opts: { rows: [{label, value, color, sub, valueText}], domain: [lo, hi], log, ticks, tickFormat,
   *         valueFormat, ref: {x, label}, band: {x0, x1, label}, labelWidth, labelFixed (keep labelWidth on narrow
   *         screens), barH (default 18), gap (default 12), xTitle }
   */
  function hbar(host, o) {
    host.classList.add('chart');
    var holder = E('div'); host.appendChild(holder);
    var svg = null;
    var fmt = o.valueFormat || function (v) { return v; };
    function render(W) {
      var barH = o.barH || 18, gap = o.gap || 12, lw = o.labelWidth || 150;
      if (W < 480 && !o.labelFixed) lw = Math.min(lw, Math.round(W * .38));
      var m = { t: (o.ref || o.band) ? 26 : 6, r: o.valuePad || 70, b: o.ticks === false ? 6 : 36, l: lw };
      var rowH = barH + (o.rows.some(function (r) { return r.sub; }) ? 16 : 0);
      var H = m.t + m.b + o.rows.length * rowH + (o.rows.length - 1) * gap;
      var iw = Math.max(20, W - m.l - m.r);
      var lo = o.domain[0], hi = o.domain[1];
      var xs = scale(lo, hi, m.l, m.l + iw, o.log);
      if (svg) svg.remove();
      svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': o.ariaLabel || 'bar chart' });
      if (o.band) {
        svg.appendChild(S('rect', { x: xs(o.band.x0), y: m.t - 4, width: Math.max(0, xs(o.band.x1) - xs(o.band.x0)), height: H - m.t - m.b + 8, style: { fill: 'var(--panel-2)' } }));
        if (o.band.label) svg.appendChild(S('text', { class: 'ref-label', x: xs(o.band.x0) + 4, y: m.t - 10, text: o.band.label }));
      }
      if (o.ticks !== false) {
        var g = S('g', { class: 'grid' }), t = S('g', { class: 'tick' });
        (o.ticks || ticksFor(lo, hi, 5)).forEach(function (v) {
          g.appendChild(S('line', { x1: xs(v), x2: xs(v), y1: m.t - 4, y2: H - m.b + 4 }));
          t.appendChild(S('text', { x: xs(v), y: H - m.b + 22, 'text-anchor': 'middle', text: o.tickFormat ? o.tickFormat(v) : v }));
        });
        svg.appendChild(g); svg.appendChild(t);
      }
      if (o.xTitle) svg.appendChild(S('text', { class: 'axis-title', x: m.l + iw / 2, y: H - 2, 'text-anchor': 'middle', text: o.xTitle }));
      o.rows.forEach(function (r, i) {
        var y = m.t + i * (rowH + gap);
        var x0 = xs(o.log ? lo : Math.max(lo, 0)), x1 = xs(Math.max(r.value, o.log ? lo : 0));
        svg.appendChild(S('text', { class: 'bar-label', x: m.l - 12, y: y + barH / 2 + 4.5, 'text-anchor': 'end', text: r.label }));
        if (r.sub) svg.appendChild(S('text', { class: 'tick', x: m.l - 12, y: y + barH + 14, 'text-anchor': 'end', text: r.sub, style: { 'font-size': '11.5px', fill: 'var(--ink-3)' } }));
        var bar = S('rect', { class: 'bar bar-anim', x: x0, y: y, width: Math.max(1.5, x1 - x0), height: barH, rx: 3,
          style: { fill: r.color || 'var(--blue)', 'transform-origin': x0 + 'px 0', 'transform-box': 'view-box' } });
        svg.appendChild(bar);
        svg.appendChild(S('text', { class: 'bar-value val-anim', x: x1 + 8, y: y + barH / 2 + 4.5, text: r.valueText || fmt(r.value) }));
      });
      if (o.ref) {
        svg.appendChild(S('line', { class: 'ref-line', x1: xs(o.ref.x), x2: xs(o.ref.x), y1: m.t - 6, y2: H - m.b + 4 }));
        if (o.ref.label) svg.appendChild(S('text', { class: 'ref-label', x: xs(o.ref.x) + 6, y: m.t - 10, text: o.ref.label }));
      }
      holder.appendChild(svg);
      drawIn(host, svg);
    }
    responsive(holder, render);
    return { host: host };
  }

  /* ------------------------------------------------------------------ donut
   * opts: { data: [{label, value, color}], size (px, default 180), thickness (default 26), center: {big, small}, legend: true }
   */
  function donut(host, o) {
    host.classList.add('chart', 'chart-donut');
    var size = o.size || 180, th = o.thickness || 26, R = size / 2, r = R - th / 2;
    var total = o.data.reduce(function (a, d) { return a + d.value; }, 0);
    var svg = S('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-label': o.ariaLabel || 'donut chart', style: { 'max-width': size + 'px', margin: '0 auto' } });
    var C = 2 * Math.PI * r, acc = 0;
    var ring = S('g', { transform: 'rotate(-90 ' + R + ' ' + R + ')' });
    o.data.forEach(function (d, i) {
      var len = d.value / total * C;
      var c = S('circle', { cx: R, cy: R, r: r, fill: 'none', 'stroke-width': th,
        style: { stroke: d.color, 'stroke-dasharray': Math.max(0, len - 2) + ' ' + C, 'stroke-dashoffset': -acc } });
      c.setAttribute('data-dash', Math.max(0, len - 2) + ' ' + C);
      c.appendChild(S('title', { text: d.label + ': ' + d.value }));
      ring.appendChild(c);
      if (!UI.reduced() && !UI.revealAll) {
        c.style.strokeDasharray = '0 ' + C;
        (function (cc, L, delay) {
          UI.onVisible(host, function () {
            cc.style.transition = 'stroke-dasharray 1s cubic-bezier(.16,1,.3,1) ' + delay + 's';
            requestAnimationFrame(function () { cc.style.strokeDasharray = Math.max(0, L - 2) + ' ' + C; });
          });
        })(c, len, i * .08);
      }
      var mid = (acc + len / 2) / C * 2 * Math.PI - Math.PI / 2;
      if (d.value / total > .07) {
        var lab = S('text', { class: 'donut-label', x: R + Math.cos(mid) * r, y: R + Math.sin(mid) * r + 4, 'text-anchor': 'middle',
          text: d.value, style: { 'font-family': 'var(--mono)', 'font-size': '11.5px', 'font-weight': 600, fill: d.ink || 'var(--on-block)' } });
        svg.appendChild(lab);
        if (!UI.reduced() && !UI.revealAll) {
          lab.style.opacity = 0;
          (function (l, delay) {
            UI.onVisible(host, function () { l.style.transition = 'opacity .5s ease ' + delay + 's'; requestAnimationFrame(function () { l.style.opacity = 1; }); });
          })(lab, .7 + i * .08);
        }
      }
      acc += len;
    });
    svg.insertBefore(ring, svg.firstChild);
    if (o.center) {
      svg.appendChild(S('text', { x: R, y: R + 2, 'text-anchor': 'middle', text: o.center.big, style: { 'font-size': '26px', 'font-weight': 560, fill: 'var(--ink)' } }));
      if (o.center.small) svg.appendChild(S('text', { x: R, y: R + 20, 'text-anchor': 'middle', text: o.center.small, style: { 'font-size': '11.5px', fill: 'var(--ink-3)' } }));
    }
    host.appendChild(svg);
    if (o.legend !== false) {
      var lg = E('div', { class: 'chart-legend', style: { 'justify-content': 'center', 'margin-top': '14px' } });
      o.data.forEach(function (d) {
        lg.appendChild(E('span', { style: { display: 'inline-flex', 'align-items': 'center', gap: '7px' } },
          [E('i', { style: { width: '9px', height: '9px', 'border-radius': '50%', background: d.color, display: 'inline-block' } }), d.label]));
      });
      host.appendChild(lg);
    }
    return { host: host };
  }

  window.LMSDCharts = { line: line, hbar: hbar, donut: donut, ticks: ticksFor };
})();
