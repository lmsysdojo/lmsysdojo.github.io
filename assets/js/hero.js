/* LMSysDojo project page: the hero. Splits the title into words for the on-load rise, fades the copy as the reader
 * scrolls past, and draws the ambient canvas: request streams converging through a bottleneck (the gap) in a serving
 * engine and fanning out into ordered lanes. Scroll widens the waist; the cursor gently parts nearby streams. */
(function () {
  'use strict';
  var hero = document.querySelector('header.hero');
  var UI = window.LMSDUI;
  if (!hero || !UI) return;
  var inner = hero.querySelector('.hero-inner');

  /* ---------------------------------------------------------------- on-load choreography */
  function words(el) {
    // wrap each word (nbsp-joined groups stay whole) in a span, keeping nested markup such as <b>Dojo</b>
    var out = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var parts = n.textContent.split(/( +)/), frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^ +$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var s = UI.el('span', { class: 'hero-w', text: p });
          out.push(s); frag.appendChild(s);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1) {
        n.classList.add('hero-w');
        out.push(n);
      }
    });
    return out;
  }

  function choreograph() {
    var mark = hero.querySelector('.hero-mark'), sub = hero.querySelector('.hero-sub');
    var seq = [];  // [element, delay ms]
    var add = function (el, d, cls) { if (el) { if (cls) el.classList.add(cls); seq.push([el, d]); } };
    add(hero.querySelector('.hero-eyebrow'), 0, 'hero-step');
    if (mark) words(mark).forEach(function (w, i) { add(w, 70 + i * 100); });
    if (sub) words(sub).forEach(function (w, i) { add(w, 260 + i * 34); });
    hero.querySelectorAll('.authors li').forEach(function (li, i) { add(li, 560 + i * 26, 'hero-step'); });
    add(hero.querySelector('.affils'), 760, 'hero-step');
    hero.querySelectorAll('.hero-links > *').forEach(function (b, i) { add(b, 800 + i * 40, 'hero-step'); });
    add(hero.querySelector('.hero-tldr'), 960, 'hero-step');
    add(hero.querySelector('.hero-scroll'), 1040, 'hero-step');
    seq.forEach(function (s) { s[0].style.setProperty('--d', s[1] + 'ms'); });

    // skip the show when motion is reduced or the page opened scrolled past the hero
    if (UI.reduced() || hero.getBoundingClientRect().bottom < window.innerHeight * .5) return;
    hero.classList.add('hero-pre');
    var started = false;
    var go = function () {
      if (started) return;
      started = true;
      requestAnimationFrame(function () { hero.classList.add('hero-play'); hero.classList.remove('hero-pre'); });
    };
    // start once the faces are in (no swap mid-rise), but never keep the title waiting long
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
    setTimeout(go, 450);
  }
  try { choreograph(); } catch (e) { hero.classList.remove('hero-pre'); }

  /* ---------------------------------------------------------------- ambient canvas: the flow */
  var canvas = hero.querySelector('canvas.hero-canvas');
  var ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  // depth layers (far, mid, near): stroke width, alpha, speed; and the palette mix (blue, shallow blue, violet, ink)
  var LAYERS = [
    { share: .52, size: 1.0, alpha: .34, speed: .62 },
    { share: .33, size: 1.45, alpha: .5, speed: 1 },
    { share: .15, size: 2.1, alpha: .66, speed: 1.42 }
  ];
  var MIX = [.54, .30, .11, .05];
  var COLOR_VARS = ['--blue', '--blue-2', '--violet', '--ink'];
  var COLOR_ALPHA = [1, 1, 1, .5];      // ink is a rare accent; on dark it becomes a bright spark (see draw)

  var W = 0, H = 0, dpr = 1, N = 0, strip = false;
  var px, ps, pj, buckets = [];          // per particle: x along the flow, lane s in [-1, 1], phase; bucket ranges
  var geo = {};                          // waist position and widths, see shape()
  var colors = [], dark = false, mask = null;
  var gap = 0;                           // 0 = narrow waist, 1 = widened by scrolling (the gap closing)
  var mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, k: 0, on: false };
  var time = 0;
  var thin = 1;                          // a device that cannot keep up draws every 2nd, then 3rd particle (see loop)

  function readColors() {
    dark = UI.theme() === 'dark';
    colors = COLOR_VARS.map(function (v) { return UI.css(v) || '#007FFF'; });
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function smooth(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  /* where the copy ends decides where the flow lives: beside it on wide screens, or in a band above the title
     (.hero-strip) when there is no room to the side */
  function measure() {
    var hr = hero.getBoundingClientRect(), edge = 0, rg = document.createRange();
    // the inked extent of each block (its contents), not its box, which spans the whole column
    hero.querySelectorAll('.hero-mark, .hero-sub, .authors, .hero-links, .hero-tldr').forEach(function (el) {
      rg.selectNodeContents(el);
      edge = Math.max(edge, rg.getBoundingClientRect().right - hr.left);
    });
    geo.edge = edge || W * .55;
    var st = W < 760 || W - geo.edge < 260;
    if (st !== strip) { strip = st; hero.classList.toggle('hero-strip', st); }
    // sit the canvas caption on the scroll cue's line (offsets ignore the parallax transform)
    var cap = hero.querySelector('.hero-figcap'), cue = hero.querySelector('.hero-scroll');
    if (cap && cue && inner) {
      var y = inner.offsetTop + cue.offsetTop + cue.offsetHeight / 2 - cap.offsetHeight / 2;
      cap.style.top = Math.round(y) + 'px'; cap.style.bottom = 'auto';
    }
  }

  // strip layout: the band between the nav and the copy (the hero's enlarged top padding)
  function bandBox() {
    var nav = parseFloat(UI.css('--nav-h')) || 60, top = parseFloat(getComputedStyle(hero).paddingTop) || nav + 150;
    return [nav, top];
  }

  /* the channel: S-curved walls pinch a wide, loose inflow (left, where requests arrive) into a narrow waist at
     (xw, yw), then open it again into ordered, level lanes on the right */
  function shape() {
    var g = UI.easeInOut(gap);
    if (strip) {
      var band = bandBox(), mid = (band[0] + band[1]) / 2 + 4;
      geo.xw = W * .56; geo.yw = mid; geo.y0 = mid + 12; geo.y1 = mid - 6;
      geo.h0 = Math.min(58, (band[1] - band[0]) * .4); geo.h1 = Math.min(44, W * .11);
      geo.hmin = UI.lerp(4.5, 13, g); geo.lanes = 6;
      geo.xs = -40; geo.vis = -80; geo.wr = (W - geo.xw) * 1.02;
    } else {
      geo.xw = geo.edge + (W - geo.edge) * .42; geo.yw = H * .52; geo.y0 = H * .66; geo.y1 = H * .48;
      geo.h0 = H * .5; geo.h1 = Math.min(H * .31, (W - geo.xw) * .78);
      geo.hmin = H * UI.lerp(.03, .11, g); geo.lanes = 9;
      geo.xs = Math.max(-40, geo.edge * .3);
      geo.vis = geo.edge * .4;            // left of this the mask leaves under a tenth of a stroke
      geo.wr = Math.max((W - geo.xw) * 1.02, W * .22);   // when cramped, the walls keep opening past the edge
    }
    geo.flow = 1 + .7 * g;               // throughput rises as the waist opens
    var at = (geo.xw / W * 100).toFixed(1) + '% ' + (geo.yw / H * 100).toFixed(1) + '%';
    if (at !== geo.at) {                 // the CSS glow behind the waist
      geo.at = at;
      hero.style.setProperty('--hx', at.split(' ')[0]);
      hero.style.setProperty('--hy', at.split(' ')[1]);
    }
  }
  function halfWidth(x) {
    return x < geo.xw
      ? geo.hmin + (geo.h0 - geo.hmin) * smooth(0, 1, (geo.xw - x) / (geo.xw * 1.08))
      : geo.hmin + (geo.h1 - geo.hmin) * smooth(0, 1, (x - geo.xw) / geo.wr);
  }
  function center(x) {
    return x < geo.xw ? UI.lerp(geo.y0, geo.yw, smooth(0, geo.xw, x)) : UI.lerp(geo.yw, geo.y1, smooth(geo.xw, geo.xw + geo.wr, x));
  }
  // speed along the flow: faster where the channel is narrow (continuity, softened)
  function speed(x) { return geo.flow * Math.pow(geo.h0 / halfWidth(x), .55); }

  function laneS() {
    // mostly centred (sum of uniforms), with a loose uniform fringe
    return Math.random() < .72 ? (Math.random() + Math.random() + Math.random()) / 1.5 - 1 : rand(-1.05, 1.05);
  }

  function seed() {
    N = count();
    px = new Float32Array(N); ps = new Float32Array(N); pj = new Float32Array(N);
    buckets = [];
    var i = 0;
    LAYERS.forEach(function (L, li) {
      var nl = li === LAYERS.length - 1 ? N - i : Math.round(N * L.share);
      MIX.forEach(function (m, ci) {
        var n = ci === MIX.length - 1 ? nl - Math.round(nl * (MIX[0] + MIX[1] + MIX[2])) : Math.round(nl * m);
        buckets.push({ layer: li, color: ci, a: i, b: i + n });
        i += n;
      });
    });
    var v0 = Math.min(speed(geo.xs), speed(W));
    for (var j = 0; j < N; j++) {
      // steady-state start: density along x inversely proportional to the local speed
      var x = rand(geo.xs, W + 40);
      for (var t = 0; t < 16 && Math.random() > v0 / speed(x); t++) x = rand(geo.xs, W + 40);
      px[j] = x; ps[j] = laneS(); pj[j] = rand(0, 6.283);
    }
  }

  /* y of a particle at x on lane s: loose, coherently curling streams before the waist; snapped into lanes after it;
     parted by the cursor as a smooth vertical dipole */
  function yAt(x, s, ph) {
    var hw = halfWidth(x);
    var order = smooth(geo.xw + W * .015, geo.xw + W * .2, x);
    var L = geo.lanes, li = Math.floor((s + 1) * .5 * L);
    li = li < 0 ? 0 : li >= L ? L - 1 : li;
    var se = s + (((li + .5) / L) * 2 - 1 - s) * order * .84;
    var curl = (1 - .78 * order) * (.064 * Math.sin(x * .0057 + s * 2.4 + time * .31) + .03 * Math.sin(x * .0127 - s * 4.3 - time * .52 + 1.7));
    var y = center(x) + (se + curl + .011 * Math.sin(time * .8 + ph)) * hw;
    if (mouse.k > .002) {
      var dx = x - mouse.x, dy = y - mouse.y, R = strip ? 70 : 130;
      var f = Math.exp(-(dx * dx + dy * dy) / (R * R));
      if (f > .004) y += mouse.k * 40 * (dy / R) * f;
    }
    return y;
  }

  function step(dt) {
    var base = Math.max(W, 900) / 15;
    for (var k = 0; k < buckets.length; k++) {
      var bk = buckets[k], sp = LAYERS[bk.layer].speed * base * dt;
      for (var j = bk.a; j < bk.b; j++) {
        var x = px[j] + speed(px[j]) * sp;
        if (x > W + 40) { x = geo.xs - Math.random() * 40; ps[j] = laneS(); }
        px[j] = x;
      }
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    ctx.lineCap = 'butt';
    var base = Math.max(W, 900) / 15, mul = dark ? .82 : 1;
    // each particle is a comet: a hairline tail (motion over the last ~60 ms) and a crisp square head
    for (var k = 0; k < buckets.length; k++) {
      var bk = buckets[k], L = LAYERS[bk.layer], tailK = L.speed * base * .06, r = L.size / 2, minT = bk.layer ? 1.5 : 3;
      if (bk.b <= bk.a) continue;
      var tails = new Path2D(), heads = new Path2D();
      for (var j = bk.a; j < bk.b; j += thin) {
        var x = px[j];
        if (x < geo.vis || x > W + 40) continue;   // fully under the mask: not worth drawing
        var s = ps[j], ph = pj[j], y = yAt(x, s, ph), tail = Math.min(30, speed(x) * tailK);
        if (tail > minT) { var x0 = x - tail; tails.moveTo(x0, yAt(x0, s, ph)); tails.lineTo(x, y); }
        heads.rect(x - r, y - r, L.size, L.size);
      }
      var a = L.alpha * (dark && bk.color === 3 ? .75 : COLOR_ALPHA[bk.color]) * mul;
      ctx.strokeStyle = ctx.fillStyle = colors[bk.color];
      ctx.globalAlpha = a * (dark ? .42 : .5);
      ctx.lineWidth = Math.max(.6, L.size * .55);
      ctx.stroke(tails);
      ctx.globalAlpha = a;
      ctx.fill(heads);
    }
    // fade the inflow out under the copy (per pixel, so it reads the same on either background)
    if (mask) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, strip ? W : Math.min(W, geo.maskEnd + 2), H);
    }
  }

  // fade the flow out wherever it would sit under the copy
  function makeMask() {
    var m, e;
    if (strip) {
      var band = bandBox();
      m = ctx.createLinearGradient(0, 0, 0, H);
      m.addColorStop(0, 'rgba(0,0,0,.95)');
      m.addColorStop(UI.clamp((band[0] + 14) / H), 'rgba(0,0,0,0)');
      m.addColorStop(UI.clamp((band[1] - 34) / H), 'rgba(0,0,0,0)');
      m.addColorStop(UI.clamp((band[1] - 4) / H), 'rgba(0,0,0,.94)');
      m.addColorStop(1, 'rgba(0,0,0,.97)');
    } else {
      e = UI.clamp(geo.edge / W, .3, .9);
      m = ctx.createLinearGradient(0, 0, W, 0);
      var run = Math.min(170, (W - geo.edge) * .4);
      geo.maskEnd = geo.edge + run;
      m.addColorStop(0, 'rgba(0,0,0,.95)');
      m.addColorStop(e * .55, 'rgba(0,0,0,.92)');
      m.addColorStop(e * .9, 'rgba(0,0,0,.74)');
      m.addColorStop(Math.min(.97, e + run * .25 / W), 'rgba(0,0,0,.3)');
      m.addColorStop(Math.min(.99, e + run / W), 'rgba(0,0,0,0)');
    }
    mask = m;
  }
  function count() {
    return Math.round(strip ? UI.clamp(W * 2.1, 600, 2000) : UI.clamp(W * H / 205, 900, 6000));
  }

  /* ---------------------------------------------------------------- copy parallax + scroll-driven waist */
  var cy = 0, co = 1;
  function scrollState(dt) {
    var r = hero.getBoundingClientRect(), h = Math.max(1, r.height);
    var p = UI.clamp(-r.top / h);
    var g = UI.clamp(-r.top / (h * .8));
    var e = Math.min(1, dt * 3.2);
    if (Math.abs(g - gap) > 1e-4) { gap += (g - gap) * e; shape(); }
    // tall (strip) heroes are still being read while they scroll: barely any lag, a late fade
    var ty = p * h * (strip ? .05 : .2), to = 1 - (strip ? .7 * smooth(.4, 1, p) : .85 * smooth(.18, .9, p));
    var f = Math.min(1, dt * 11);
    cy += (ty - cy) * f; co += (to - co) * f;
    if (inner) {
      var rest = Math.abs(cy) < .05 && co > .999;
      inner.style.transform = rest ? '' : 'translate3d(0,' + cy.toFixed(2) + 'px,0)';
      inner.style.opacity = rest ? '' : co.toFixed(3);
    }
  }

  function easeMouse(dt) {
    if (mouse.on && mouse.x < -1e3) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    var f = Math.min(1, dt * 7);
    mouse.x += (mouse.tx - mouse.x) * f; mouse.y += (mouse.ty - mouse.y) * f;
    mouse.k += ((mouse.on ? 1 : 0) - mouse.k) * Math.min(1, dt * 2.4);
  }

  /* ---------------------------------------------------------------- loop, sizing, events */
  var running = false, visible = true, raf = 0, last = 0, ema = 16.7, slow = 0, warm = 0;
  function loop(now) {
    raf = 0;
    if (!running) return;
    var ms = now - last, dt = Math.min(.05, Math.max(0, ms / 1000)); last = now;
    // thinning: after a 1 s grace (start-up work is not the device's pace), 0.7 s of slow frames sheds a level,
    // so a slow device sheds its first level about 2 s after the flow starts and the next about a second later
    if (now > warm) {
      var cl = Math.min(ms, 100);
      ema += (cl - ema) * .05;
      slow = ema > 24 ? slow + cl : 0;
      if (slow > 700 && thin < 3) { thin++; slow = 0; ema = 20; }
    }
    time += dt;
    scrollState(dt); easeMouse(dt); step(dt); draw();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    running = true; last = performance.now(); warm = last + 1000; slow = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function sync() {
    if (visible && !document.hidden && !UI.reduced() && W > 0) start();
    else { stop(); if (UI.reduced()) still(); }
  }
  // a single frame while the loop is idle; under reduced motion it is the complete, static picture
  function still() {
    if (!W) return;
    if (UI.reduced()) {
      mouse.k = 0; cy = 0; co = 1;
      if (inner) { inner.style.transform = ''; inner.style.opacity = ''; }
    }
    draw();
  }

  function fit(force) {
    var w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h || (force !== true && w === W && h === H)) return;
    var oldW = W, oldN = N, oldStrip = strip;
    W = w;
    measure();                           // may switch .hero-strip, which changes the padding and so the height
    H = hero.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    shape();
    makeMask();
    if (!oldW || strip !== oldStrip || Math.abs(count() - oldN) > oldN * .2) seed();
    else for (var j = 0; j < N; j++) px[j] *= W / oldW;
    if (!running) { still(); sync(); }
  }

  try {
    // a quiet figure-style caption for the canvas (decorative, like the canvas itself)
    if (inner && !hero.querySelector('.hero-figcap')) {
      hero.appendChild(UI.el('p', { class: 'hero-figcap', 'aria-hidden': 'true', text: 'request streams through a bottleneck' }));
    }
    readColors();
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(hero, { box: 'border-box' });
    else window.addEventListener('resize', fit, { passive: true });
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; mouse.on = true;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.on = false; }, { passive: true });
    UI.onTheme(function () { readColors(); if (!running) still(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(true); });
    UI.onReducedChange(sync);
    document.addEventListener('visibilitychange', sync);
    UI.watch(hero, function (v) { visible = v; sync(); }, '80px 0px');
    sync();
  } catch (e) { stop(); }
})();
