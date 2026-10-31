/* LMSysDojo project page: section 04, the gallery. Three parts, all from window.LMSD_CASES (appendix/qualitative.tex):
 * a video-like walkthrough of the two end-to-end deliveries (SGLang 8940, vLLM 41868) with a case switch, chapters,
 * play/pause and keyboard control; a filterable gallery of static case cards; and the ways an analysis went wrong. */
(function () {
  'use strict';
  var UI = window.LMSDUI, D = window.LMSD_CASES;
  var sec = document.getElementById('gallery');
  if (!UI || !D || !sec) return;
  var el = UI.el;
  var WT = null;                                     /* WT(id): show a delivery in the walkthrough player (gallery buttons) */

  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('gallery: ' + fn.name + ' skipped', e); } }
  function x(v) { return (v >= 10 ? v.toFixed(1) : v.toFixed(2)) + '×'; }
  function icon(paths) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + '</svg>'; }
  /* a number quoted in the paper's prose (cases.js); d is the paper's value, used only if the sentence was reworded */
  function num(re, s, d) { var m = re.exec(s || ''); return m ? parseFloat(m[1].replace(/,/g, '')) : d; }
  /* run an entrance once the node is in view; ?reveal=all (full-page screenshots) shows the final state at once */
  function onEnter(node, cb, margin) { if (UI.revealAll) cb(); else UI.onVisible(node, cb, margin); }
  var I = {
    play: '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.4-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8Z" fill="currentColor"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.8h3.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    prev: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    next: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  /* ================================================================ 1. walkthrough: two deliveries, end to end */
  /* Table qual-examples in one player: a case switch (SGLang 8940 / vLLM 41868) over the same five chapters, each with
   * the paper's own text and code from LMSD_CASES.deliveries and one small visual. */
  var CHAPTERS = ['Deployment', 'Locate the gap', 'Predict', 'Implement', 'Measure vs the expert'];
  var DUR = [8, 12, 10, 11, 13];                     /* seconds per chapter */
  /* the two stories as the table caption tells them, and each patch in the paper's words (appendix/qualitative.tex) */
  var STORY = { 'sglang-8940': 'Right mechanism, wrong size', 'vllm-41868': 'An accurate prediction' };
  var IMPL = {
    'sglang-8940': 'The patch touches no kernel: it describes the batch as one segment of length <code>bs</code> instead of <code>bs</code> segments of length 1.',
    'vllm-41868': 'The patch zero-pads the CUDA case to the next multiple of 16 before CUTLASS and slices the padding off: the same GEMM on a different kernel, as the expert\'s PR also argues.'
  };
  var VERDICT = { beats: 'Beats the expert', ties: 'Ties the expert', trails: 'Trails the expert', 'same-fix': 'Same fix as the expert' };
  /* a delivery's verdict: its own field, else its table mechanism's */
  function verdictOf(d) {
    if (d.verdict) return d.verdict;
    var m = (D.mechanisms || []).filter(function (m) { return m.delivery === d.id; })[0];
    return m ? m.verdict : '';
  }
  /* E2E predicted and measured change, as quoted in the prediction and delivered rows */
  function e2e(d) {
    var p = /E2E ([−-]?[\d.]+)%/.exec(d.prediction || ''), m = /×, ([−-][\d.]+)%/.exec(d.delivered || '');
    return p && m ? { pred: p[1], meas: m[1], p: Math.abs(parseFloat(p[1].replace('−', '-'))), m: Math.abs(parseFloat(m[1].replace('−', '-'))) } : null;
  }
  function caption(d, i) {
    return [esc(nbFlags(d.deployment)), esc(d.mechanism), esc(d.prediction), IMPL[d.id] || '', esc(d.delivered)][i];
  }

  function walkthrough() {
    var mount = sec.querySelector('[data-mount="walkthrough"]');
    var cases = (D.deliveries || []).filter(function (d) { return d && d.analysis && d.patch; });
    if (!mount || !cases.length) return;
    var N = CHAPTERS.length, VIS = [visDeploy, visGap, visPredict, visImplement, visMeasure];

    mount.textContent = '';
    mount.id = 'walkthrough';
    var scoreEl = el('dl', { class: 'gw-score', 'aria-label': 'Result' });
    mount.appendChild(el('div', { class: 'gw-head' }, [
      el('div', null, [
        el('span', { class: 'gx-kicker', text: 'Walkthrough · from deployment to delivery' }),
        el('h3', { text: 'Two deliveries, end to end' })
      ]),
      scoreEl
    ]));
    var opts = cases.map(function (d, c) {
      return el('button', { class: 'gw-case', type: 'button', 'aria-pressed': String(c === 0), onclick: function () { setCase(c, true); } }, [
        el('b', { html: esc(d.engine) + ' <span>#' + d.pr + '</span>' }), el('span', { text: STORY[d.id] || d.attempt })
      ]);
    });
    mount.appendChild(el('div', { class: 'gw-cases', role: 'group', 'aria-label': 'Choose a delivery' }, opts));

    var player = el('div', { class: 'gw-player', role: 'region', tabindex: '0' });
    var rail = el('div', { class: 'gw-rail', role: 'tablist', 'aria-label': 'Chapters' },
      [el('span', { class: 'gw-rail-k', 'aria-hidden': 'true', text: 'Chapters' })]);
    var stage = el('div', { class: 'gw-stage' });
    var tabs = [], fills = [], segFills = [];
    CHAPTERS.forEach(function (k, i) {
      var tp = el('i');
      var tab = el('button', { class: 'gw-tab', type: 'button', role: 'tab', id: 'gw-tab-' + i,
        'aria-selected': 'false', tabindex: '-1', onclick: function () { go(i, true); } },
        [el('span', { class: 'nb', text: String(i + 1) }), el('span', { text: k }), el('span', { class: 'gw-tp', 'aria-hidden': 'true' }, [tp])]);
      tabs.push(tab); fills.push(tp); rail.appendChild(tab);
    });
    /* every pane of both cases shares one grid cell, so switching case or chapter never changes the stage height */
    var sets = cases.map(function (d, c) {
      var set = { panes: [], enters: [] };
      CHAPTERS.forEach(function (k, i) {
        var vis = el('div', { class: 'gw-vis' });
        var pane = el('div', { class: 'gw-pane', role: 'tabpanel', id: 'gw-pane-' + c + '-' + i, 'aria-labelledby': 'gw-tab-' + i }, [
          el('div', { class: 'gw-cap' }, [
            el('span', { class: 'gw-ck', text: String(i + 1).padStart(2, '0') + ' · ' + k }),
            el('p', { html: caption(d, i) })
          ]),
          vis
        ]);
        var enter = null;
        try { enter = VIS[i](vis, d); } catch (e) { if (window.console) console.warn('gallery: ' + d.id + ' chapter ' + (i + 1), e); }
        set.panes.push(pane); set.enters.push(enter); stage.appendChild(pane);
      });
      return set;
    });

    /* control bar: play/pause, prev/next, chapter-segmented progress, time */
    var btn = el('button', { class: 'gw-btn', type: 'button', 'aria-label': 'Play walkthrough',
      html: icon(I.play).replace('<svg', '<svg class="i-play"') + icon(I.pause).replace('<svg', '<svg class="i-pause"') + icon(I.replay).replace('<svg', '<svg class="i-replay"') });
    var bPrev = el('button', { type: 'button', 'aria-label': 'Previous chapter', html: icon(I.prev) });
    var bNext = el('button', { type: 'button', 'aria-label': 'Next chapter', html: icon(I.next) });
    var track = el('div', { class: 'gw-track' });
    CHAPTERS.forEach(function (k, i) {
      var f = el('i');
      track.appendChild(el('button', { class: 'gw-seg', type: 'button', style: { '--w': DUR[i] }, 'aria-label': 'Chapter ' + (i + 1) + ': ' + k,
        onclick: function () { go(i, true); } }, [f]));
      segFills.push(f);
    });
    var timeEl = el('span', { class: 'gw-time', 'aria-hidden': 'true' });
    player.appendChild(rail); player.appendChild(stage);
    player.appendChild(el('div', { class: 'gw-bar' }, [btn, el('div', { class: 'gw-step' }, [bPrev, bNext]), track, timeEl]));
    mount.appendChild(player);

    /* ---- state: case, chapter, time inside it, play state; one rAF loop runs only while playing and visible */
    var TOTAL = DUR.reduce(function (a, b) { return a + b; }, 0);
    var cs = 0, cur = -1, t = 0, playing = false, ended = false, userPaused = false, inView = false, raf = 0, last = 0, shown = '';
    function mmss(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function paint() {
      var before = 0;
      for (var i = 0; i < N; i++) {
        var p = i < cur ? 1 : i > cur ? 0 : UI.clamp(t / DUR[i]);
        segFills[i].style.transform = 'scaleX(' + p.toFixed(4) + ')';
        fills[i].style.transform = 'scaleX(' + (i === cur ? p : 0).toFixed(4) + ')';
        tabs[i].classList.toggle('done', i < cur);
        if (i < cur) before += DUR[i];
      }
      var lab = '<b>' + mmss(before + t) + '</b> / ' + mmss(TOTAL);
      if (lab !== shown) timeEl.innerHTML = shown = lab;
    }
    function setPlaying(on) {
      playing = on;
      player.classList.toggle('is-playing', on);
      player.classList.toggle('is-ended', ended && !on);
      btn.setAttribute('aria-label', on ? 'Pause walkthrough' : ended ? 'Replay walkthrough' : 'Play walkthrough');
      live();
      if (on && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    }
    function live() { player.classList.toggle('is-live', playing && inView && !document.hidden); }
    function loop(now) {
      raf = 0;
      if (!playing || !inView || document.hidden) return;
      var dt = last ? Math.min(.1, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      if (t >= DUR[cur]) {
        if (cur < N - 1) go(cur + 1, false);
        else { t = DUR[cur]; ended = true; paint(); setPlaying(false); return; }
      }
      paint();
      raf = requestAnimationFrame(loop);
    }
    function go(i, focusTab, quiet) {
      i = UI.clamp(i, 0, N - 1);
      var same = i === cur;
      cur = i; t = 0; ended = false;
      player.classList.remove('is-ended');
      tabs.forEach(function (b, k) {
        b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; b.setAttribute('aria-controls', 'gw-pane-' + cs + '-' + k);
      });
      sets.forEach(function (s, c) { s.panes.forEach(function (p, k) { p.classList.toggle('is-active', c === cs && k === i); }); });
      bPrev.disabled = i === 0; bNext.disabled = i === N - 1;
      if (focusTab === true && document.activeElement && rail.contains(document.activeElement)) tabs[i].focus({ preventScroll: true });
      /* a row of tabs that overflows (narrow screens) keeps the current chapter centred, without moving the page */
      if (rail.scrollWidth > rail.clientWidth + 1) {
        var rr = rail.getBoundingClientRect(), tr = tabs[i].getBoundingClientRect();
        rail.scrollBy({ left: tr.left + tr.width / 2 - (rr.left + rr.width / 2), behavior: UI.reduced() ? 'auto' : 'smooth' });
      }
      if (!quiet && (!same || focusTab)) restart(i);
      if (playing) setPlaying(true);
      paint();
    }
    /* re-run a chapter's intro: each visual may return enter(), which starts its timeline and returns a stop() */
    var stopFx = null;
    function restart(i) {
      if (stopFx) { stopFx(); stopFx = null; }
      sets.forEach(function (s) { s.panes.forEach(function (p) { p.classList.remove('run'); }); });
      if (UI.reduced()) return;                      /* without .run every visual shows its final frame */
      var p = sets[cs].panes[i];
      void p.offsetWidth;
      p.classList.add('run');
      if (sets[cs].enters[i]) stopFx = sets[cs].enters[i]() || null;
    }
    function setCase(c, user) {
      if (c === cs && cur >= 0) return;
      cs = c;
      var d = cases[c], pm = e2e(d);
      opts.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === c)); });
      scoreEl.textContent = '';
      [['agent', x(d.agent), 'ag'], ['expert', x(d.expertX), 'ex'], pm ? ['E2E predicted → measured', pm.pred + '% → ' + pm.meas + '%', 'pm'] : null]
        .forEach(function (r) { if (r) scoreEl.appendChild(el('div', null, [el('dt', { text: r[0] }), el('dd', { class: r[2], text: r[1] })])); });
      player.setAttribute('aria-label', 'Walkthrough player: ' + d.engine + ' ' + d.pr + ' in ' + N + ' chapters. Space or K plays or pauses; on the chapter tabs, arrow keys change chapter.');
      cur = -1;
      go(0, false, !introduced);
      if (user && !UI.reduced() && !userPaused) setPlaying(true);
    }
    function toggle() {
      if (playing) { userPaused = true; setPlaying(false); return; }
      userPaused = false;
      if (ended) go(0, false);
      setPlaying(true);
    }
    btn.addEventListener('click', toggle);
    bPrev.addEventListener('click', function () { go(cur - 1, false); });
    bNext.addEventListener('click', function () { go(cur + 1, false); });
    /* chapter keys only on the tabs (Left/Right, plus Up/Down while the rail is a column); elsewhere arrows scroll */
    var column = window.matchMedia('(min-width: 1181px)');
    function orient() { rail.setAttribute('aria-orientation', column.matches ? 'vertical' : 'horizontal'); }
    orient();
    if (column.addEventListener) column.addEventListener('change', orient);
    player.addEventListener('keydown', function (e) {
      var k = e.key, onTab = e.target.getAttribute('role') === 'tab', onBtn = e.target.tagName === 'BUTTON';
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('pre')) return;
      var next = k === 'ArrowRight' || (column.matches && k === 'ArrowDown'), prev = k === 'ArrowLeft' || (column.matches && k === 'ArrowUp');
      if ((k === ' ' || k === 'Spacebar') && !onBtn) { e.preventDefault(); toggle(); }
      else if (k === 'k' || k === 'K') { e.preventDefault(); toggle(); }
      else if (!onTab) return;
      else if (next) { e.preventDefault(); go(cur + 1, true); }
      else if (prev) { e.preventDefault(); go(cur - 1, true); }
      else if (k === 'Home') { e.preventDefault(); go(0, true); }
      else if (k === 'End') { e.preventDefault(); go(N - 1, true); }
    });
    /* autoplay only in view, never with reduced motion, never against an explicit pause */
    var introduced = false;                          /* the first chapter's intro waits until the reader arrives */
    UI.watch(player, function (vis) {
      inView = vis;
      live();
      if (vis && !introduced) { introduced = true; restart(cur); }
      if (vis && !UI.reduced() && !userPaused && !ended) setPlaying(true);
      else if (vis && playing && !raf) setPlaying(true);
    }, '-18% 0px -18% 0px');
    document.addEventListener('visibilitychange', function () { live(); if (!document.hidden && playing && !raf) setPlaying(true); });
    UI.onReducedChange(function (r) { if (r && playing) { userPaused = true; setPlaying(false); } });
    setCase(0);
    /* the gallery's "walk through it" buttons: pick the case, bring the player into view, play from chapter 1 */
    WT = function (id) {
      var c = cases.map(function (d) { return d.id; }).indexOf(id);
      if (c < 0) return;
      userPaused = false;
      if (c !== cs) setCase(c); else { cur = -1; go(0, false); }
      var top = opts[0].getBoundingClientRect().top + window.pageYOffset - 84;
      window.scrollTo({ top: Math.max(0, top), behavior: UI.reduced() ? 'auto' : 'smooth' });
      player.focus({ preventScroll: true });
      if (!UI.reduced()) setPlaying(true);
    };
  }
  /* ---- code boxes: the paper's excerpts line by line, with diff tinting */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function codeBox(file, lines, opts) {
    opts = opts || {};
    /* focusable, so a box that scrolls sideways on a narrow screen can be scrolled from the keyboard */
    var pre = el('pre', { tabindex: '0', role: 'group', 'aria-label': file });
    lines.forEach(function (raw, k) {
      var line = String(raw), cls = 'ln gw-l';
      if (opts.diff && line[0] === '+') cls += ' add';
      else if (opts.diff && line[0] === '-') cls += ' del';
      pre.appendChild(el('span', { class: cls, style: { '--k': k }, html: esc(line) || ' ' }));
    });
    return el('div', { class: 'code gw-code' + (opts.cls ? ' ' + opts.cls : '') }, [
      el('div', { class: 'code-head' }, [el('span', { text: file })]),
      pre
    ]);
  }
  /* keep CLI flags such as --quantization from breaking after the first hyphen */
  function nbFlags(s) { return String(s).replace(/(^|\s)--(?=\w)/g, '$1\u2011\u2011'); }
  function fileName(d, f) { return d.engine + ' ' + d.pr + ', ' + d.attempt + ': ' + f; }
  /* a signed % change as a bar on one shared axis, 0 to -70% (every quoted E2E/TTFT/ITL change fits) */
  var PMAX = 70;
  function pbar(lab, v, cls, k) {
    var a = Math.abs(parseFloat(String(v).replace('−', '-'))) || 0;
    return el('div', { class: 'gw-pb ' + cls }, [
      el('span', { class: 'm', text: lab }),
      el('i', null, [el('s', { style: { width: Math.min(100, a / PMAX * 100).toFixed(2) + '%', '--k': k } })]),
      el('b', { text: (a ? v : '0') + '%' })
    ]);
  }
  function verdictTag(v) { return VERDICT[v] ? el('span', { class: 'gg-verdict ' + v, text: VERDICT[v] }) : null; }

  /* 01 Deployment: the open-loop load as a stream whose dot spacing follows the arrival rate, into the server */
  function visDeploy(vis, d) {
    var parts = String(d.deployment).split(';'), srv = parts[0].split(', '), load = parts[1] || '';
    var rate = num(/at ([\d.]+) req\/s/, load, 8), over = /\((\d+× overloaded)\)/.exec(load);
    var n = Math.max(4, Math.round(rate * .75));
    var strip = el('div', { class: 'gw-strip gw-loop', style: { '--n': n, '--p': (3 / rate).toFixed(3) + 's' } });
    for (var k = -1; k < n; k++) strip.appendChild(el('i', { style: { '--k': k } }));
    vis.appendChild(el('div', { class: 'gw-dep', 'aria-hidden': 'true' }, [
      el('div', { class: 'gw-box gw-in' }, [
        el('small', { text: 'load · open loop' }), el('b', { html: rate + '<small>req/s</small>' }),
        over ? el('span', { class: 'gw-warn', text: over[1] }) : null
      ]),
      el('div', { class: 'gw-lane gw-in', style: { '--d': '.25s' } }, [strip]),
      el('div', { class: 'gw-box srv gw-in', style: { '--d': '.45s' } }, [el('small', { text: 'server' })]
        .concat(srv.map(function (s, i) { return el('span', { class: i ? null : 'e', text: nbFlags(s) }); }))),
      el('p', { class: 'gw-note gw-in', style: { '--d': '.8s' } }, [el('span', { class: 'tag-note', text: 'schematic' }), 'Dot spacing follows the arrival rate.'])
    ]));
    return null;
  }

  /* 02 Locate the gap: the mechanism drawn small, beside the analysis in the agent's own words */
  function visGap(vis, d) {
    vis.appendChild(el('div', { class: 'gw-two' }, [
      d.id === 'vllm-41868' ? gapGemm(d) : gapTiles(d),
      codeBox(fileName(d, d.analysis.file), d.analysis.lines, { cls: 'gw-in gw-prose' })
    ]));
    return null;
  }
  /* SGLang 8940: one 16-row tile per sequence, one live row each, every tile reading the same adapter */
  function gapTiles(d) {
    var R = num(/at (\d+) rows/, d.mechanism, 16), L = num(/\((\d+) launches/, d.mechanism, 192), S = 8;
    var grid = el('div', { class: 'gw-tiles' });
    for (var s = 0; s < S; s++) {
      var tile = el('i', { style: { '--s': s } });
      for (var r = 0; r < R; r++) tile.appendChild(el('b', { class: r ? null : 'on' }));
      grid.appendChild(tile);
    }
    return el('figure', { class: 'gw-fig gw-in', 'aria-hidden': 'true' }, [
      el('div', { class: 'gw-wts' }, [el('span', { text: 'the one LoRA adapter' })]),
      grid,
      el('div', { class: 'gw-lab' }, [el('b', { text: (R - 1) + '/' + R + ' masked' }), el('span', { text: 'a ' + R + '-row tile per sequence' })]),
      el('div', { class: 'gw-lab' }, [el('b', { text: String(L) }), el('span', { text: 'launches per decode step' })]),
      el('span', { class: 'tag-note', text: 'schematic' })
    ]);
  }
  /* vLLM 41868: the dispatcher's divisibility gate, and the share of GPU time behind it */
  function gapGemm(d) {
    var w = num(/width is (\d+)/, d.mechanism, 3420), a = num(/taking ([\d.]+) of/, d.mechanism, 81.4);
    var tot = num(/of ([\d.]+)\s?s of GPU/, d.mechanism, 107.7), share = num(/\(([\d.]+)%\)/, d.mechanism, 75.6);
    return el('figure', { class: 'gw-fig gw-in', 'aria-hidden': 'true' }, [
      el('div', { class: 'gw-gate' }, [
        el('span', { class: 'w', html: 'vision MLP width <b>' + w + '</b>' }),
        el('span', { class: 'q', text: w + ' mod 16 = ' + (w % 16) }),
        el('div', { class: 'out' }, [el('span', { class: 'no', text: 'Triton fallback' }), el('span', { class: 'yes', text: 'CUTLASS' })])
      ]),
      el('div', { class: 'gw-lab' }, [el('b', { text: 'GPU time' }), el('span', { text: a + ' of ' + tot + ' s in the vision MLP' })]),
      el('div', { class: 'gw-share' }, [el('i', { style: { width: share + '%' } }), el('b', { text: share + '%' })])
    ]);
  }

  /* 03 Predict: the three predicted changes on one axis, plus the confidence or the probe the estimate rests on */
  function visPredict(vis, d) {
    var ms = {}, re = /(E2E|TTFT|ITL) ([−-]?[\d.]+)%/g, m;
    while ((m = re.exec(d.prediction || ''))) ms[m[1]] = m[2];
    var keys = ['E2E', 'TTFT', 'ITL'].filter(function (k) { return k in ms; });
    var conf = /\b(low|medium|high) confidence/i.exec(d.prediction || ''), probe = /([\d.]+) → ([\d.]+)\s?s/.exec(d.prediction || '');
    var side = null;
    if (probe) {
      var A = parseFloat(probe[1]), B = parseFloat(probe[2]);
      side = el('div', { class: 'gw-probe gw-in', style: { '--d': '.9s' } }, [
        el('p', { class: 'gw-k2', html: 'Short local probe<span>seconds</span>' }),
        el('div', { class: 'gw-pb base' }, [el('span', { class: 'm', text: 'before' }), el('i', null, [el('s', { style: { width: '100%' } })]), el('b', { text: A + ' s' })]),
        el('div', { class: 'gw-pb meas' }, [el('span', { class: 'm', text: 'after' }), el('i', null, [el('s', { style: { width: (B / A * 100).toFixed(1) + '%', '--k': 1 } })]), el('b', { text: B + ' s' })])
      ]);
    } else if (conf) {
      side = el('div', { class: 'gw-conf gw-in', style: { '--d': '.9s' } }, [el('small', { text: 'confidence' }), el('b', { text: conf[1].toLowerCase() })]);
    }
    vis.appendChild(el('div', { class: 'gw-predv', 'aria-hidden': 'true' }, [
      el('div', null, [
        el('p', { class: 'gw-k2', html: 'Predicted change<span>axis 0 to −' + PMAX + '%</span>' }),
        el('div', { class: 'gw-pbs' }, keys.map(function (k, i) { return pbar(k, ms[k], 'pred', i); }))
      ]),
      side
    ]));
    return null;
  }

  /* 04 Implement: the delivered diff, with the change it makes drawn beside it */
  function visImplement(vis, d) {
    vis.appendChild(el('div', { class: 'gw-two' }, [
      d.id === 'vllm-41868' ? implPad() : implSeg(),
      codeBox(fileName(d, d.patch.file), d.patch.lines, { diff: true, cls: 'gw-in' })
    ]));
    return null;
  }
  function implSeg() {
    var before = el('div', { class: 'gw-segs' });
    for (var k = 0; k < 8; k++) before.appendChild(el('i', { style: { '--k': k }, text: '1' }));
    return el('figure', { class: 'gw-fig gw-in', 'aria-hidden': 'true' }, [
      el('div', { class: 'gw-lab' }, [el('b', { text: 'before' }), el('span', { html: '<code>bs</code> segments of length 1' })]),
      before,
      el('div', { class: 'gw-lab' }, [el('b', { text: 'after' }), el('span', { html: 'one segment of length <code>bs</code>' })]),
      el('div', { class: 'gw-segs one' }, [el('i', { html: 'bs' })]),
      el('span', { class: 'tag-note', text: 'schematic' })
    ]);
  }
  function implPad() {
    var row = el('div', { class: 'gw-pad' });
    ['16', '16', '16', '12'].forEach(function (v, k) { row.appendChild(el('i', { class: k === 3 ? 'last' : null, style: { '--k': k }, text: v })); });
    return el('figure', { class: 'gw-fig gw-in', 'aria-hidden': 'true' }, [
      el('div', { class: 'gw-lab' }, [el('b', { text: 'zero-pad' }), el('span', { text: 'to the next multiple of 16' })]),
      el('div', { class: 'gw-padrow' }, [el('span', { text: '…' }), row]),
      el('ol', { class: 'gw-steps' }, [
        el('li', { html: '<code>cutlass_scaled_mm</code> on the padded GEMM' }),
        el('li', { html: '<code>out[:, :N]</code> slices the padding off' })
      ]),
      el('span', { class: 'tag-note', text: 'schematic' })
    ]);
  }

  /* 05 Measure vs the expert: the two speedups, the prediction against the measurement, the expert's fix, the verdict */
  function visMeasure(vis, d) {
    var pm = e2e(d);
    vis.appendChild(el('div', { class: 'gw-meas' }, [
      el('div', { class: 'gw-two' }, [
        el('div', { class: 'gw-in' }, [el('p', { class: 'gw-k2', html: 'E2E speedup<span>log scale</span>' }), pair(d.agent, d.expertX, true)]),
        pm ? el('div', { class: 'gw-in', style: { '--d': '.3s' }, 'aria-hidden': 'true' }, [
          el('p', { class: 'gw-k2', html: 'E2E change<span>predicted vs measured</span>' }),
          el('div', { class: 'gw-pbs' }, [pbar('predicted', pm.pred, 'pred', 0), pbar('measured', pm.meas, 'meas', 1)])
        ]) : null
      ]),
      el('div', { class: 'gw-exp gw-in', style: { '--d': '.8s' } }, [el('b', { text: 'Expert fix' }), el('p', { text: d.expert })]),
      el('div', { class: 'gw-verdict gw-in', style: { '--d': '1.2s' } }, [verdictTag(verdictOf(d)), el('p', { text: d.notes })])
    ]));
    return null;
  }
  /* ================================================================ 2. case gallery */
  var LOGMAX = Math.log(20);                         /* shared log scale, 1x .. 20x, for every agent/expert pair */
  function wlog(v) { return UI.clamp(Math.log(v) / LOGMAX, .012, 1); }
  function pair(ag, ex, big) {
    var row = function (k, v, lab) {
      return el('div', { class: 'gg-b ' + k }, [el('span', { text: lab }), el('i', null, [el('s', { style: { '--w': wlog(v).toFixed(4) } })]), el('b', { class: 'gx-x', text: x(v) })]);
    };
    return el('div', { class: 'gg-bars' + (big ? ' big' : ''), role: 'img', 'aria-label': 'Agent ' + x(ag) + ', expert ' + x(ex) + ' E2E speedup' },
      [row('ag', ag, 'agent'), row('ex', ex, 'expert')]);
  }

  function gallery() {
    var mount = sec.querySelector('[data-mount="gallery"]');
    if (!mount || !D.mechanisms) return;
    var clsOf = {};
    (D.classes || []).forEach(function (c) { clsOf[c.key] = c; });
    var dv = {};
    (D.deliveries || []).forEach(function (d) { dv[d.id] = d; });
    /* the seven mechanisms of the paper's table, plus vLLM 41868, delivered end to end (it has no class there) */
    /* verdict is the paper's reading (cases.js), not the raw agent/expert ratio */
    var items = D.mechanisms.map(function (m) {
      return { id: m.id, engine: m.engine, pr: m.pr, cls: m.cls, title: m.title, gap: m.gap, fix: m.fix, agent: m.agent, expert: m.expert,
        verdict: m.verdict, deep: m.deep, d: m.delivery ? dv[m.delivery] : null };
    });
    var lv = dv['vllm-41868'];
    /* its notes carry the overload caveat: "...; the 1.20x edge over the expert reflects 3x overload ..." */
    var caveat = lv && /;\s*(the [^;]*overload[^;]*)$/i.exec(lv.notes || '');
    if (lv) items.push({ id: lv.id, engine: lv.engine, pr: lv.pr, cls: null, title: 'Pad vision-tower FP8 GEMMs onto CUTLASS',
      gap: String(lv.mechanism).replace(/, taking [^;]*$/, '.'), fix: 'Zero-pad to the next multiple of 16 before CUTLASS and slice the padding off.',
      agent: lv.agent, expert: lv.expertX, verdict: lv.verdict, d: lv,
      note: caveat ? caveat[1].charAt(0).toUpperCase() + caveat[1].slice(1).replace(/\.?$/, '.') : null });
    items.forEach(function (it) { it.beats = it.verdict === 'beats'; });

    mount.textContent = '';
    mount.id = 'cases';
    mount.appendChild(el('div', { class: 'gg-head' }, [
      el('span', { class: 'gx-kicker', text: 'Case gallery' }),
      el('h3', { text: 'Seven mechanisms in three recurring classes' }),
      el('p', { text: 'Each card is the paper\'s representative structured attempt on one item against the merged expert fix, both as E2E speedups over the sealed baseline on the same hardware. The classes recur across items and engines, and were usually found in several independently sampled attempts. vLLM 41868, delivered end to end, completes the set.' })
    ]));

    var filters = [{ key: 'all', label: 'All' }, { key: 'beats', label: 'Beats the expert' }].concat((D.classes || []).map(function (c) { return { key: c.key, label: c.label }; }));
    function match(it, f) { return f === 'all' || (f === 'beats' ? it.beats : it.cls === f); }
    var chips = el('div', { class: 'chips gg-chips', role: 'group', 'aria-label': 'Filter cases' });
    filters.forEach(function (f) {
      var n = items.filter(function (it) { return match(it, f.key); }).length;
      f.btn = el('button', { class: 'chip', type: 'button', 'aria-pressed': String(f.key === 'all'), onclick: function () { apply(f.key); } },
        [f.label, el('span', { class: 'n', text: String(n) })]);
      chips.appendChild(f.btn);
    });
    mount.appendChild(el('div', { class: 'gg-tools' }, [chips, el('div', { class: 'gg-scale', 'aria-hidden': 'true' }, [
      el('span', { html: '<i class="ag"></i>agent' }), el('span', { html: '<i class="ex"></i>expert' }), el('span', { class: 'm', text: 'E2E speedup · log scale 1–20×' })
    ])]));

    var grid = el('div', { class: 'gg-grid' });
    items.forEach(function (it, k) {
      var c = clsOf[it.cls], name = it.engine + ' ' + it.pr;
      /* cards are static; only the cases told in full above link to their telling */
      var act = it.deep ? el('a', { class: 'gg-act', href: '#story', html: 'Told step by step above' + icon(I.up) })
        : it.d && WT ? el('button', { class: 'gg-act', type: 'button', 'aria-label': 'Walk through ' + name + ' in the player above',
          onclick: function () { WT(it.d.id); }, html: 'Walk through it' + icon(I.up) }) : null;
      it.el = el('article', { class: 'gg-card', style: { '--i': k }, 'aria-label': name + ': ' + it.title }, [
        el('div', { class: 'gg-top' }, [el('span', { class: 'gg-id', html: esc(it.engine) + ' <b>#' + it.pr + '</b>' }), verdictTag(it.verdict)]),
        el('h4', { text: it.title.replace(/-/g, '\u2011') }),
        el('p', { class: 'gg-gap', text: it.gap }),
        el('p', { class: 'gg-fix' }, [el('span', { text: 'fix' }), it.fix]),
        act ? el('p', { class: 'gg-go' }, [act]) : null,
        pair(it.agent, it.expert),
        it.note ? el('p', { class: 'gg-note', text: it.note }) : null,
        el('div', { class: 'gg-foot' }, [el('span', { class: 'gg-cls', text: c ? c.label : 'End-to-end delivery' })])
      ]);
      grid.appendChild(it.el);
    });
    mount.appendChild(grid);
    onEnter(grid, function () {
      grid.classList.add('is-in');
      setTimeout(function () { grid.classList.add('settled'); }, 2000);
    }, '0px 0px -10% 0px');

    /* filtering: fade the leavers, then FLIP the stayers into their new cells and fade the newcomers in */
    var current = 'all', busy = 0;
    function apply(key) {
      if (key === current) return;
      current = key;
      [grid].concat(items.map(function (it) { return it.el; })).forEach(function (n) { if (n.getAnimations) n.getAnimations().forEach(function (a) { a.cancel(); }); });
      filters.forEach(function (f) { f.btn.setAttribute('aria-pressed', String(f.key === key)); });
      var anim = !UI.reduced() && 'animate' in grid;
      var leaving = items.filter(function (it) { return !it.el.hidden && !match(it, key); });
      clearTimeout(busy);
      var swap = function () {
        var first = items.map(function (it) { return it.el.hidden ? null : it.el.getBoundingClientRect(); });
        var h0 = grid.offsetHeight;
        items.forEach(function (it) { it.el.hidden = !match(it, key); });
        if (!anim) return;
        var h1 = grid.offsetHeight;   /* ease the grid's own height so the cards never fly over the next heading */
        if (h0 !== h1) grid.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' });
        var n = 0;
        items.forEach(function (it, k) {
          if (it.el.hidden) return;
          var r = it.el.getBoundingClientRect(), f = first[k];
          if (f) {
            var dx = f.left - r.left, dy = f.top - r.top;
            if (dx || dy) it.el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' });
          } else {
            it.el.animate([{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }],
              { duration: 520, delay: 60 + n++ * 45, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
          }
        });
      };
      if (anim && leaving.length) {
        leaving.forEach(function (it) { it.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' }); });
        busy = setTimeout(function () { leaving.forEach(function (it) { it.el.getAnimations().forEach(function (a) { a.cancel(); }); }); swap(); }, 170);
      } else swap();
    }
  }
  /* ================================================================ 3. failure modes */
  /* the outcome each case's own text states: predicted vs measured, what landed, or an abandon */
  function outcome(f) {
    var pm = /predicted ([−-][\d.]+%), measured ([−-][\d.]+%)/.exec(f.text);
    if (pm) return { k: 'pred. → measured', v: pm[1] + ' → ' + pm[2] };
    var xs = f.text.match(/\d+(?:\.\d+)?×/g);
    if (xs && xs.length > 1) return { k: 'landed · expert', v: xs[0] + ' · ' + xs[1] };
    if (xs) return { k: 'landed', v: xs[0] };
    if (/abandon/i.test(f.surfaced)) return { k: 'outcome', v: 'abandoned' };
    return null;
  }
  function failures() {
    var mount = sec.querySelector('[data-mount="failures"]');
    if (!mount || !D.failures) return;
    var modes = [];
    D.failures.forEach(function (f) {
      var g = modes.filter(function (m) { return m.mode === f.mode; })[0];
      if (!g) modes.push(g = { mode: f.mode, cases: [] });
      g.cases.push(f);
    });
    mount.textContent = '';
    mount.appendChild(el('div', { class: 'gf-head' }, [
      el('span', { class: 'gx-kicker', text: 'Failure modes' }),
      el('h3', { text: 'What an analysis can get wrong' }),
      el('p', { text: 'An analysis can name the right mechanism and mis-size it, rest on a premise the code refutes, or optimise a metric the card does not score. In each case below, the implementer\'s own measurement or reading caught the error before delivery.' })
    ]));
    var list = el('ol', { class: 'gf-list' });
    modes.forEach(function (g, k) {
      var cases = el('ul', { class: 'gf-cases' });
      g.cases.forEach(function (f) {
        var o = outcome(f);
        cases.appendChild(el('li', { class: 'gf-case' }, [
          el('span', { class: 'gf-item', html: esc(f.item) + (f.attempt ? '<small>' + esc(f.attempt) + '</small>' : '') }),
          el('div', { class: 'gf-txt' }, [
            el('p', { text: f.text }),
            el('p', { class: 'gf-how', html: '<span>surfaced</span>' + esc(f.surfaced).replace(/follows_analysis: partial/, '<code>follows_analysis: partial</code>') })
          ]),
          o ? el('span', { class: 'gf-out' }, [el('small', { text: o.k }), el('b', { class: 'gx-x', text: o.v })]) : el('span')
        ]));
      });
      list.appendChild(el('li', { class: 'gf-mode', style: { '--i': k } }, [
        el('div', { class: 'gf-name' }, [el('span', { class: 'nb', text: String(k + 1) }), el('h4', { text: g.mode }),
          el('span', { class: 'gf-n', text: g.cases.length + (g.cases.length > 1 ? ' cases' : ' case') })]),
        cases
      ]));
    });
    mount.appendChild(list);
    onEnter(list, function () { list.classList.add('is-in'); }, '0px 0px -8% 0px');

    if (D.boundary && D.boundary.length) {
      var ul = el('ul');
      D.boundary.forEach(function (b) {
        ul.appendChild(el('li', null, [el('span', { class: 'gf-item', text: b.item }), el('p', { text: b.text }), el('b', { class: 'gx-x', text: x(b.x) })]));
      });
      mount.appendChild(el('div', { class: 'gf-bound', role: 'note', 'aria-label': 'What the checks do not judge' }, [
        el('span', { class: 'gx-kicker', text: 'What the checks do not judge' }),
        el('p', { text: 'The checks establish that a delivery serves the same work with equivalent output; whether the change is one the upstream project would merge is a judgment the benchmark does not make. Two valid deliveries sit at that boundary:' }),
        ul,
        el('p', { class: 'gf-last', text: 'Upstream would be unlikely to merge either as written.' })
      ]));
    }
  }

  safe(walkthrough);
  safe(gallery);
  safe(failures);
})();
