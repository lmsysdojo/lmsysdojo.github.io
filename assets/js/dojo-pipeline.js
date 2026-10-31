/* LMSysDojo project page: section 01, the LMSysDojo pipeline as an animation (data-mount="dojo-pipeline").
 * One performance PR walks through the paper's pipeline figure (asset/figs/teaser.png) in eight beats, inside the
 * figure's three bands: the playground constructor scans the merged PRs, splits the picked PR into its baseline and
 * reference commits, seals its problem and fix while it parses only the deployment setup, then measures both commits
 * with GuideLLM and profiles the baseline; the PR becomes a sealed playground; the evaluation environment runs the
 * agent in the interaction sandbox on a Slurm GPU node, checks the delivery and scores its normalized gain.
 * PR titles, commits, labels and file names are the figure's and the paper's (App. A item layout); the GuideLLM,
 * profiler and Slurm marks are cropped from the figure (kit/dp-*.png), the engine logos and agent head are the shared
 * kit. Every printed number is the paper's; the speedups are Fig. 1's example, as in the gain calculator.
 * One timeline drives everything: render(t) sets every block from its beat's progress, so a beat can be jumped to and
 * the still frame (reduced motion, ?reveal=all, print) is render(END). The stage is DOM in CSS grid; an SVG overlay
 * draws the figure's arrows from measured boxes. At 900 px and below the stage shows one beat's blocks at a time.
 * Needs site.js (LMSDUI); the static figure stays if anything here fails. */
(function () {
  'use strict';
  var UI = window.LMSDUI;
  var sec = document.getElementById('dojo');
  var host = sec && sec.querySelector('[data-mount="dojo-pipeline"]');
  if (!UI || !host) return;
  /* the static figure is the fallback: if anything below throws, it goes back in place */
  var fallback = Array.prototype.slice.call(host.childNodes);
  try { main(); } catch (err) {
    if (window.console) console.warn('dojo-pipeline:', err);
    host.classList.remove('dp-ready');
    host.textContent = '';
    fallback.forEach(function (n) { host.appendChild(n); });
  }

  function main() {
    var E = UI.el, S = UI.svg, seg = UI.seg, clamp = UI.clamp, eo = UI.easeOut, eio = UI.easeInOut;
    var KIT = 'assets/img/kit/';
    var DJ = (window.LMSD && window.LMSD.dojo) || {};
    var CORPUS = (DJ.funnel && DJ.funnel[0]) || { total: 39411, vllm: 20969, sglang: 18442 };
    var BUDGET = DJ.budgetHours || 1.5;
    var EX = { agent: 1.21, expert: 1.35 };   /* Fig. 1's example: agent +21%, expert +35% (the gain calculator's preset) */
    var GAIN = Math.round((EX.agent - 1) / (EX.expert - 1) * 100);

    /* ---------------------------------------------------------------- the eight beats */
    var BEATS = [
      { name: 'Scan', dur: 5.2, cap: 'Agents read every merged PR of vLLM and SGLang, <b>' + UI.fmt(CORPUS.total) + '</b> in all (' + UI.fmt(CORPUS.vllm) + ' and ' + UI.fmt(CORPUS.sglang) + '), and keep the performance PRs: complete fixes that claim a measured speedup on serving work. Bug fixes, refactors and PRs that never merged are skipped.' },
      { name: 'Segment', dur: 4.4, cap: 'The kept PR becomes a pair of commits: the <b>reference</b>, the commit that landed with the expert’s patch, and the <b>baseline</b>, its parent from before the patch.' },
      { name: 'Seal & parse', dur: 5.0, cap: 'The PR’s problem statement and fix are <b>sealed</b> away. Only its deployment setup is parsed: a setup card with the environment lock, the engine configuration <i>S</i> and the GuideLLM workload <i>W</i>.' },
      { name: 'Measure', dur: 5.6, cap: 'On the target GPUs, GuideLLM runs the same workload against both commits, and the baseline is profiled with nsys, the PyTorch profiler and py-spy. The expert’s measured speedup becomes the reference <b><i>R</i></b> (' + EX.expert.toFixed(2) + '× in Fig. 1’s example).' },
      { name: 'Playground', dur: 4.6, cap: 'The PR is now a <b>sealed playground</b>: the agent will get the configs and profiles, while the expert’s fix, its commits and the sealed runs stay in <code>oracle/</code>. It joins the playgrounds built from other PRs and is selected for a run.' },
      { name: 'Sandbox', dur: 5.6, cap: 'In the interaction sandbox the agent optimizes what looks like a standalone deployment, on a Slurm-allocated GPU node with no internet, for at most <b>' + BUDGET + '&nbsp;h</b>. It delivers one final patch: a code diff, with its artifacts.' },
      { name: 'Check', dur: 4.8, cap: 'The validity checkers compare the delivery with the baseline. <b>Same work:</b> no launch-flag or environment change, and a request-bound run serves the baseline’s request count within 5%. <b>Same outputs:</b> on 100 fixed prompts, the first 32 tokens match, with top-5 log-probabilities within 0.01.' },
      { name: 'Score', dur: 5.8, cap: 'The GuideLLM scorer measures the validated patch once, on a separate single-tenant node. With Fig. 1’s example, a ' + EX.agent.toFixed(2) + '× patch against <i>R</i> = ' + EX.expert.toFixed(2) + '× scores (' + EX.agent.toFixed(2) + ' − 1) / (' + EX.expert.toFixed(2) + ' − 1) = <b>' + GAIN + '%</b> of the expert’s gain.' }
    ];
    var BANDS = [['Playground constructor', 0, 4], ['Playgrounds', 4, 5], ['Evaluation environment', 5, 8]];
    var HOLD = 4.6, DIP = 0.55;                       /* hold the finished figure, then dip and start over */
    var START = [], END = 0;
    BEATS.forEach(function (b) { START.push(END); END += b.dur; });
    var TOTAL = END + HOLD;
    /* the blocks each beat is about, ringed on wide screens; narrow screens show only a beat's scene, its input first */
    var SCENE = [['scan'], ['commits'], ['seal', 'files'], ['measure'], ['play'], ['sandbox', 'diff'], ['valid'], ['scorer', 'gain']];
    var SCENE_N = [['scan'], ['commits'], ['seal', 'files'], ['files', 'measure'], ['play'], ['sandbox', 'diff'], ['diff', 'valid'], ['scorer', 'gain']];

    /* ---------------------------------------------------------------- the figure's content */
    /* the Scanning screenshot's rows (one row, half hidden behind the figure's label, is left out); m: merged */
    var PRS = [
      { t: '[CI][Bugfix] Correct the Laguna DFlash acceptance-length reference', n: '57647', who: 'okorzh-amd', m: 1, labs: [['bug', 'red'], ['dflash', 'olive']], why: 'bug fix' },
      { t: '[CI][Bugfix] Fix MoE reprocess test mock after #57405’s kernel refactor', n: '57641', who: 'vllm-agent', m: 1, labs: [['bug', 'red'], ['nvidia', 'green']], why: 'bug fix' },
      { t: '[Perf][MRV2] Upload cu_num_logits and query_start_loc in one H2D copy', n: '57636', who: 'Juntian777', m: 0, labs: [['mrv2', 'wine']], why: 'not merged' },
      { t: '[Perf][MRV2] Fuse per-request input preparation into one Triton kernel', n: '57628', who: 'Juntian777', m: 0, labs: [['mrv2', 'wine']], why: 'not merged' },
      { t: '[Refactor] Remove dead kernel code', n: '57621', who: 'yewentao256', m: 1, labs: [['cpu', 'pink'], ['nvidia', 'green'], ['rocm', 'red']], why: 'refactor' },
      { t: '[Example][MRV2] Add DRY logits processor with V2 custom logits processor interface', n: '57620', who: 'sawsa307', m: 0, labs: [['speculative-decoding', 'brown']], why: 'not merged' },
      { t: '[Example][Model] Add V2-interface NGramPerReqLogitsProcessor for DeepSeek-OCR', n: '57618', who: 'sawsa307', m: 0, labs: [['speculative-decoding', 'brown']], why: 'not merged' },
      { t: '[Perf][DSV4.1] Optimize MegaMoE staging and NVFP4 cache gathers', n: '57604', who: 'WoosukKwon', m: 1, labs: [['deepseek', 'blue'], ['DSV4', 'violet']], keep: 1 }
    ];
    /* the three parsed files (App. A item layout); values are drawn as texture, words only where the figure prints them */
    var FILES = [
      { cap: 'Setupcard &amp; Envlock', fn: 'setupcard.md', lines: [['model:', .82], ['hardware:', .64], ['workload:', .9]], foot: ['env.yaml', 'venv.txt'] },
      { cap: 'Engine config <i>S</i>', fn: 'vllm-config.yaml', lines: [['model:', .78], ['dtype:', .4], ['seed:', .3], ['max-num-seqs:', .3]], foot: ['launch flags'] },
      { cap: 'GuideLLM config <i>W</i>', fn: 'scenario.json', lines: [['"data":', 'synthetic_text'], ['"backend":', .6], ['"profile":', 'concurrent'], ['"warmup":', .4]], foot: ['for all runs'] }
    ];
    var SETUPS = [['A', 'vLLM + Llama', 'request lengths'], ['B', 'SGLang + Qwen', 'bursty arrivals'], ['D', 'SGLang + Mamba', 'long-context requests']];

    /* ---------------------------------------------------------------- small helpers: cached writes, glyphs */
    function op(n, v) { v = v < .004 ? 0 : v > .996 ? 1 : Math.round(v * 1000) / 1000; if (n._o !== v) { n._o = v; n.style.opacity = v; } }
    function tf(n, s) { if (n._t !== s) { n._t = s; n.style.transform = s; } }
    function tx(n, s) { if (n._x !== s) { n._x = s; n.textContent = s; } }
    function on(n, c, b) { b = !!b; var k = '_c_' + c; if (n[k] !== b) { n[k] = b; n.classList.toggle(c, b); } }
    function sx(n, v) { tf(n, 'scaleX(' + (Math.round(clamp(v) * 1000) / 1000) + ')'); }
    function bar(w, cls) { return E('i', { class: 'dp-tl' + (cls ? ' ' + cls : ''), style: { '--w': Math.round(w * 100) + '%' } }); }
    /* a raster logo cropped to its ink box (bx, by, bw, bh) of an image nw x nh; sized by the span's font-size (1em = ink height) */
    function logo(src, alt, cls, nw, nh, bx, by, bw, bh) {
      var f = function (v) { return (v / bh).toFixed(4) + 'em'; };
      return E('span', { class: 'dp-logo ' + cls, role: 'img', 'aria-label': alt, style: { width: f(bw), height: '1em' } }, [
        E('img', { src: KIT + src, alt: '', decoding: 'async', style: { width: f(nw), height: f(nh), 'margin-left': '-' + f(bx), 'margin-top': '-' + f(by) } })]);
    }
    /* the kit images with their natural sizes, so their boxes are reserved before they load */
    var SIZE = { 'dp-guidellm.png': [288, 60], 'dp-python.png': [64, 64], 'dp-torch.png': [54, 64], 'dp-nsys.png': [64, 64],
      'dp-slurm-dots.png': [126, 64], 'analyzer-grad.png': [240, 240] };
    function img(src, cls, alt) {
      var z = SIZE[src] || [];
      return E('img', { class: cls, src: KIT + src, alt: alt || '', decoding: 'async', width: z[0], height: z[1] });
    }
    function prIcon(merged) {
      var c = [S('circle', { cx: 4.5, cy: 3.4, r: 1.65 }), S('circle', { cx: 4.5, cy: 12.6, r: 1.65 })];
      return S('svg', { class: 'dp-pr-ic ' + (merged ? 'is-m' : 'is-c'), viewBox: '0 0 16 16', 'aria-hidden': 'true' }, merged
        ? c.concat([S('circle', { cx: 11.6, cy: 8.6, r: 1.65 }), S('path', { d: 'M4.5 5.1v5.8M4.5 5.6c.4 2.2 2.2 3 5.4 3' })])
        : c.concat([S('circle', { cx: 11.6, cy: 12.6, r: 1.65 }), S('path', { d: 'M4.5 5.1v5.8M11.6 7.4v3.5M9.9 2.4l3.4 3.4M13.3 2.4 9.9 5.8' })]));
    }
    function lockSvg() {
      return S('svg', { class: 'dp-lock', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
        S('rect', { x: 5, y: 10.6, width: 14, height: 10, rx: 2.6 }), S('path', { class: 'dp-shackle', d: 'M8.3 10.6V8.1a3.7 3.7 0 0 1 7.4 0v2.5' })]);
    }
    function checkSvg() { return S('svg', { class: 'dp-ck', viewBox: '0 0 16 16', 'aria-hidden': 'true' }, [S('path', { d: 'M3.6 8.4l3 3 5.8-6.2' })]); }
    /* the measurement pool's violet GPU chip from the RL figures: body, white die, three pins top and bottom */
    function gpuSvg(cls) {
      var k = [];
      [5, 9.9, 14.8].forEach(function (x) { k.push(S('rect', { x: x, y: 0, width: 2.6, height: 3.4, rx: .6 }), S('rect', { x: x, y: 24.6, width: 2.6, height: 3.4, rx: .6 })); });
      return S('svg', { class: 'dp-gpu ' + (cls || ''), viewBox: '0 0 22.4 28', 'aria-hidden': 'true' }, k.concat([
        S('rect', { x: 0, y: 2.8, width: 22.4, height: 22.4, rx: 2.6 }), S('rect', { class: 'dp-die', x: 6.4, y: 9.2, width: 9.6, height: 9.6, rx: 1 })]));
    }
    function narrowTitle(text) { return E('p', { class: 'dp-bt', text: text }); }

    /* ---------------------------------------------------------------- 1. Scanning: the PR list */
    var B = {}, R = {};                                /* blocks, and the parts render() moves */
    (function () {
      R.count = E('b', { text: '0' });
      R.rows = [];
      R.prs = E('ul', { class: 'dp-prs' }, PRS.map(function (p) {
        var why = p.keep ? null : E('span', { class: 'dp-why', text: p.why });
        var li = E('li', { class: 'dp-pr' + (p.keep ? ' is-keep' : '') }, [
          prIcon(p.m),
          E('div', { class: 'dp-pr-b' }, [
            E('p', { class: 'dp-pr-t', text: p.t }),
            E('p', { class: 'dp-pr-m' }, [E('span', { class: 'dp-pr-n', text: '#' + p.n + ' · ' + p.who })]
              .concat(p.labs.map(function (l) { return E('span', { class: 'dp-lab is-' + l[1], text: l[0] }); })).concat([why]))
          ])
        ]);
        if (p.keep) li.appendChild(R.pick = E('span', { class: 'dp-pick' }, [E('span', { class: 'dp-pick-k', text: 'Performance PR' })]));
        R.rows.push({ li: li, keep: !!p.keep });
        return li;
      }));
      R.cur = E('span', { class: 'dp-cur' });
      R.prs.appendChild(R.cur);
      R.view = E('div', { class: 'dp-gh-view' }, [R.prs]);
      R.gh = E('div', { class: 'dp-gh' }, [
        E('div', { class: 'dp-gh-top' }, [
          logo('vllm.png', 'vLLM', 'dp-logo-v', 900, 258, 146, 40, 582, 183), E('span', { class: 'dp-gh-and', text: 'and' }),
          logo('sgl.png', 'SGLang', 'dp-logo-s', 720, 209, 0, 0, 708, 209), E('span', { class: 'dp-gh-pr', text: 'pull requests' })
        ]),
        R.view,
        E('p', { class: 'dp-gh-n' }, [R.count, ' merged PRs scanned'])
      ]);
      B.scan = E('div', { class: 'dp-blk dp-scan' }, [narrowTitle('Scanning'), R.gh]);
    })();

    /* ---------------------------------------------------------------- 2. Segmenting: baseline and reference commits */
    (function () {
      R.shaB = E('code', { class: 'dp-sha is-b', text: '164dca8' });
      R.shaR = E('code', { class: 'dp-sha is-r', text: '08d438b' });
      R.labB = E('span', { class: 'dp-arm is-b', html: 'Baseline<span class="dp-arm-c"> commit</span><span class="dp-arm-p"> (before expert patch)</span>' });
      R.labR = E('span', { class: 'dp-arm is-r', html: 'Reference<span class="dp-arm-c"> commit</span><span class="dp-arm-p"> (after expert patch)</span>' });
      function commit(t, sha) { return E('li', { class: 'dp-cm-row' }, [E('span', { class: 'dp-cm-t', text: t }), E('code', { class: 'dp-cm-sha', text: sha })]); }
      /* the figure's names overlay the screenshot's text, as in the paper figure; the two share one grid cell */
      function lead(dim, lab) { return E('span', { class: 'dp-cm-lead' }, [E('span', { class: 'dp-cm-t dp-cm-dim', text: dim }), lab]); }
      R.cmPar = E('div', { class: 'dp-cm-row dp-cm-par' }, [lead('Commits on main', R.labB), R.shaB]);
      R.cmRef = E('li', { class: 'dp-cm-row dp-cm-ref' }, [lead('Merge branch into main', R.labR), E('span', { class: 'dp-ver', text: 'Verified' }), R.shaR]);
      B.commits = E('div', { class: 'dp-blk dp-commits' }, [narrowTitle('Segmenting'),
        E('div', { class: 'dp-cm' }, [
          E('div', { class: 'dp-cm-tabs' }, ['Conversation', 'Commits', 'Checks', 'Files changed'].map(function (s, i) { return E('span', { class: i === 1 ? 'is-on' : null, text: s }); })),
          R.cmPar,
          E('ul', { class: 'dp-cm-list' }, [
            commit('Tile MegaMoE staging and size NVFP4 prefill gather grids', 'e2a2356'),
            commit('Remove standalone benchmarks from staging and gather PR', '510e457'),
            R.cmRef
          ])
        ])
      ]);
    })();

    /* ---------------------------------------------------------------- 3. Parsing: problem and fix sealed, setup parsed */
    (function () {
      R.seal = E('span', { class: 'dp-seal' }, [lockSvg(), E('span', { text: 'sealed' })]);
      R.pf = E('figure', { class: 'dp-doc dp-doc-pf' }, [
        E('div', { class: 'dp-doc-b' }, [
          E('p', { class: 'dp-doc-t', text: '[Perf][DSV4.1] Optimize MegaMoE staging and NVFP4 cache gathers' }),
          E('p', { class: 'dp-doc-m' }, [E('span', { class: 'dp-merged', text: 'Merged' }), E('span', { text: 'WoosukKwon' })]),
          bar(.94), bar(.86), bar(.9), bar(.78), bar(.92), bar(.55)
        ]),
        R.seal,
        E('figcaption', { class: 'dp-cap-pf', text: 'Problem & Fix' })
      ]);
      R.dsLines = [bar(.92, 'is-hl'), bar(.8, 'is-hl'), bar(.86, 'is-hl'), bar(.7), bar(.88)];
      R.ds = E('figure', { class: 'dp-doc dp-doc-ds' }, [
        E('div', { class: 'dp-doc-b' }, [
          E('p', { class: 'dp-doc-m' }, [E('span', { class: 'dp-merged', text: 'Merged' }), E('span', { text: 'WoosukKwon' })]),
          E('p', { class: 'dp-doc-h', text: 'Performance and validation' })
        ].concat(R.dsLines)),
        E('figcaption', { class: 'dp-cap-ds', text: 'Deployment Setup' })
      ]);
      B.seal = E('div', { class: 'dp-blk dp-sealb' }, [narrowTitle('Parsing'), E('div', { class: 'dp-docs' }, [R.pf, R.ds])]);
    })();

    /* ---------------------------------------------------------------- 3b. the parsed files */
    (function () {
      R.fileLines = []; R.files = [];
      var cards = FILES.map(function (f) {
        var lines = f.lines.map(function (l) {
          var v = typeof l[1] === 'string' ? E('span', { class: 'dp-fv', text: '"' + l[1] + '"' }) : bar(l[1], 'dp-fb');
          var ln = E('p', { class: 'dp-ln' }, [E('span', { class: 'dp-fk', text: l[0] }), v]);
          R.fileLines.push(ln);
          return ln;
        });
        var card = E('figure', { class: 'dp-file' }, [
          E('div', { class: 'dp-code' }, [E('p', { class: 'dp-fn', text: f.fn })].concat(lines, f.foot.map(function (t, j) { return E('p', { class: 'dp-ff' + (j ? ' is-2' : ''), text: t }); }))),
          E('figcaption', { html: f.cap })
        ]);
        R.files.push(card);
        return card;
      });
      B.files = E('div', { class: 'dp-blk dp-filesb' }, [narrowTitle('Parsed setup'), E('div', { class: 'dp-files' }, cards)]);
    })();

    /* ---------------------------------------------------------------- 4. Measuring & Profiling */
    (function () {
      R.raceB = E('i'); R.raceR = E('i');
      R.marks = [img('dp-nsys.png', 'dp-mk', 'Nsight Systems'), img('dp-torch.png', 'dp-mk', 'PyTorch profiler'), img('dp-python.png', 'dp-mk', 'py-spy')];
      R.gpuM = gpuSvg('dp-gpu-m');
      R.gl = E('div', { class: 'dp-gl' }, [
        img('dp-guidellm.png', 'dp-gl-word', 'GuideLLM'),
        E('div', { class: 'dp-gl-mks' }, R.marks),
        E('div', { class: 'dp-race' }, [
          E('p', { class: 'is-b' }, [E('code', { text: '164dca8' }), E('span', { class: 'dp-race-t' }, [R.raceB])]),
          E('p', { class: 'is-r' }, [E('code', { text: '08d438b' }), E('span', { class: 'dp-race-t' }, [R.raceR])])
        ]),
        R.gpuM
      ]);
      R.bpItems = ['guidellm', 'nsys', 'torch profiler', 'py-spy'].map(function (s) { return E('span', { text: s }); });
      R.bp = E('div', { class: 'dp-bp' }, [E('b', { html: 'Baseline &amp;<br>Profiles' }), E('span', { class: 'dp-bp-l' }, R.bpItems)]);
      R.rv = E('span', { class: 'dp-rr-v', text: '—' });
      R.rr = E('div', { class: 'dp-rr' }, [E('b', { html: 'Reference<br>Speedup <i>R</i>' }), E('span', { class: 'dp-rr-r' }, [E('small', { text: 'e.g.' }), R.rv])]);
      B.measure = E('div', { class: 'dp-blk dp-meas' }, [narrowTitle('Measuring & Profiling'),
        E('div', { class: 'dp-ms' }, [R.gl, E('div', { class: 'dp-ms-out' }, [R.bp, R.rr])])]);
    })();

    /* ---------------------------------------------------------------- 5. Playgrounds */
    (function () {
      function card(s) { return E('li', { class: 'dp-pg' }, [E('b', { html: 'Setup <em>' + s[0] + '</em>: ' + s[1] }), E('span', { text: s[2] })]); }
      R.items = [E('code', { text: 'configs/' }), E('code', { text: 'profile/' }), E('code', { class: 'is-lock' }, [lockSvg(), 'oracle/'])];
      R.pgA = E('div', { class: 'dp-pg dp-pg-a' }, [
        E('span', { class: 'dp-pg-slot', text: 'next playground' }),
        E('div', { class: 'dp-pg-in' }, [
          E('b', { html: 'Setup <em>C</em>: vLLM + MoE' }), E('span', { text: 'multi-modal workload' }),
          E('span', { class: 'dp-pg-items' }, R.items)
        ]),
        E('span', { class: 'dp-pg-sel', text: 'selected' })
      ]);
      B.play = E('div', { class: 'dp-blk dp-band dp-b2' }, [
        E('div', { class: 'dp-pg-l' }, [
          E('p', { class: 'dp-pg-k' }, [E('b', { text: 'Playgrounds' }), E('span', { text: ' one sealed environment per performance PR' })]),
          E('ul', { class: 'dp-pg-row' }, SETUPS.map(card).concat([E('li', { class: 'dp-pg-more', text: '…' })]))
        ]),
        R.pgA
      ]);
    })();

    /* ---------------------------------------------------------------- 6. Interaction sandbox, code diff and artifacts */
    (function () {
      R.node = gpuSvg('dp-gpu-n');
      R.budget = E('i');
      R.agent = E('div', { class: 'dp-agent' }, [
        S('svg', { class: 'dp-ag-frame', 'aria-hidden': 'true' }, [S('rect', { width: '100%', height: '100%', rx: 13 })]),
        img('analyzer-grad.png', 'dp-ag-head'),
        E('b', { text: 'Agent' }),
        E('span', { class: 'dp-budget' }, [E('span', { class: 'dp-budget-t' }, [R.budget]), E('small', { text: BUDGET + ' h' })])
      ]);
      R.slurm = E('div', { class: 'dp-slurm' }, [
        img('dp-slurm-dots.png', 'dp-sl-dots', 'Slurm'), E('span', { class: 'dp-sl-word' }),
        E('b', { text: 'Clusters' }), E('span', { class: 'dp-sl-node' }, [R.node, E('span', { text: 'GPU node' })])
      ]);
      B.sandbox = E('div', { class: 'dp-blk dp-sb' }, [narrowTitle('Interaction sandbox'),
        E('div', { class: 'dp-sb-in' }, [R.slurm, R.agent]), E('p', { class: 'dp-sb-k', text: 'Interaction Sandbox' })]);

      var DIFF = [['ctx', .5], ['del', .8], ['del', .66], ['add', .86], ['add', .72], ['add', .58], ['ctx', .44], ['del', .7], ['add', .9], ['add', .64], ['ctx', .5]];
      R.diffLines = DIFF.map(function (d) { return E('i', { class: 'dp-dl is-' + d[0], style: { '--w': Math.round(d[1] * 100) + '%' } }); });
      R.artLines = [bar(.92, 'dp-ah'), bar(.7, 'dp-ah'), E('p', { class: 'dp-art-h', text: 'Summary' }), bar(.96), bar(.9), bar(.94), bar(.6), bar(.88), bar(.5)];
      B.diff = E('div', { class: 'dp-blk dp-df' }, [narrowTitle('Delivery'),
        E('div', { class: 'dp-df-in' }, [
          E('figure', { class: 'dp-df-c' }, [E('div', { class: 'dp-df-code' }, R.diffLines), E('figcaption', { text: 'Code diff' })]),
          E('figure', { class: 'dp-df-a' }, [E('div', { class: 'dp-df-doc' }, R.artLines), E('figcaption', { html: '<i>Artifacts</i>' })])
        ])]);
    })();

    /* ---------------------------------------------------------------- 7. Validity checkers, 8. scorer and normalized gain */
    (function () {
      function check(name, detail) {
        return E('li', { class: 'dp-v' }, [E('span', { class: 'dp-v-ic' }, [checkSvg()]), E('b', { text: name }), E('span', { text: detail })]);
      }
      R.checks = [check('Same work', 'no flag or env change; requests within 5%'), check('Same outputs', 'first 32 tokens; top-5 log-probs within 0.01')];
      R.valid = E('div', { class: 'dp-valid' }, [E('b', { class: 'dp-valid-h', text: 'Validity Checkers' }), E('ul', null, R.checks), E('span', { class: 'dp-pass', text: 'valid' })]);
      B.valid = E('div', { class: 'dp-blk dp-vb' }, [narrowTitle('Validity checkers'), R.valid]);

      R.sv = E('span', { class: 'dp-sc-v', text: '—' });
      R.gpuS = gpuSvg('dp-gpu-m');
      R.sc = E('div', { class: 'dp-sc' }, [img('dp-guidellm.png', 'dp-gl-word', 'GuideLLM'), E('b', { text: 'Scorer' }),
        E('span', { class: 'dp-sc-r' }, [E('small', { text: 'e.g.' }), R.sv]), R.gpuS]);
      B.scorer = E('div', { class: 'dp-blk dp-scb' }, [R.sc]);

      R.gv = E('span', { class: 'dp-ng-v', text: '—' });
      R.gf = E('span', { class: 'dp-ng-f' }, [E('span', { text: EX.agent.toFixed(2) + ' − 1' }), E('span', { text: EX.expert.toFixed(2) + ' − 1' })]);
      R.ng = E('div', { class: 'dp-ng' }, [E('b', { html: 'Normalized<br>Gain' }), R.gv, R.gf]);
      B.gain = E('div', { class: 'dp-blk dp-ngb' }, [R.ng]);
    })();

    /* ---------------------------------------------------------------- stage, rail, caption, controls */
    var wires = S('svg', { class: 'dp-wires', 'aria-hidden': 'true' });
    var stage = E('div', { class: 'dp-stage', 'aria-hidden': 'true' }, [
      E('div', { class: 'dp-band dp-b1' }, [
        E('p', { class: 'dp-ct dp-ct1', text: 'Scanning' }),
        E('p', { class: 'dp-ct dp-ct2', text: 'Segmenting & Parsing' }),
        E('p', { class: 'dp-ct dp-ct3', text: 'Measuring & Profiling' }),
        B.scan,
        R.segp = E('div', { class: 'dp-segp' }, [B.commits, B.seal]),
        E('div', { class: 'dp-measc' }, [B.measure, R.filesp = E('div', { class: 'dp-filesp' }, [B.files])]),
        E('p', { class: 'dp-bn', text: 'Playground Constructor' })
      ]),
      B.play,
      R.b3 = E('div', { class: 'dp-band dp-b3' }, [
        E('div', { class: 'dp-b3l' }, [B.gain, B.scorer, B.valid, B.diff]),
        B.sandbox,
        E('p', { class: 'dp-bn is-blue', text: 'Evaluation Environment' })
      ]),
      wires
    ]);
    Object.keys(B).forEach(function (k) { B[k].setAttribute('data-blk', k); });

    var steps = [], fills = [];
    var bandEls = BANDS.map(function (b) { return E('span', { class: 'dp-rk', 'aria-hidden': 'true', style: { 'grid-column': (b[1] + 1) + ' / ' + (b[2] + 1) }, text: b[0] }); });
    var rail = E('div', { class: 'dp-rail', role: 'group', 'aria-label': 'The eight steps; choose one to jump to it' }, bandEls);
    BEATS.forEach(function (b, i) {
      var f = E('i');
      var btn = E('button', { class: 'dp-step', type: 'button', style: { 'grid-column': String(i + 1) }, 'aria-label': 'Step ' + (i + 1) + ' of 8: ' + b.name },
        [E('span', { class: 'nb', text: String(i + 1) }), E('span', { class: 'dp-sn', text: b.name }), E('span', { class: 'dp-sp', 'aria-hidden': 'true' }, [f])]);
      btn.addEventListener('click', function () { jump(i); });
      steps.push(btn); fills.push(f); rail.appendChild(btn);
    });
    var caps = E('div', { class: 'dp-caps' }, BEATS.map(function (b, i) {
      return E('p', { class: 'dp-cap', html: '<span class="dp-cap-k">' + (i + 1) + ' · ' + b.name + '</span>' + b.cap });
    }));
    var pauseBtn = E('button', { type: 'button', class: 'dp-play', 'aria-label': 'Pause animation',
      html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-pause" d="M5 3.5v9M11 3.5v9"/><path class="i-play" d="M5.5 3.2v9.6L12.8 8z"/></svg>' });
    var root = E('div', { class: 'dp-root' }, [
      E('div', { class: 'dp-top' }, [
        E('p', { class: 'dp-title' }, [E('span', { class: 'tag-note', text: 'schematic' }), E('span', { text: 'One performance PR through the pipeline' })]),
        pauseBtn
      ]),
      rail, caps, stage,
      E('ol', { class: 'sr-only' }, BEATS.map(function (b) { var li = E('li', { html: b.cap }); return li; }))
    ]);

    /* ---------------------------------------------------------------- layout: the list's rows and the figure's arrows */
    var narrowQ = window.matchMedia('(max-width: 900px)');
    var narrow = narrowQ.matches;
    var G = { rowTop: [], rowH: 44, viewH: 200, maxOff: 0, sceneW: 0 };
    function box(el) {
      var a = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
      var x = a.left - s.left, y = a.top - s.top;
      return { l: x, t: y, r: x + a.width, b: y + a.height, w: a.width, h: a.height, cx: x + a.width / 2, cy: y + a.height / 2 };
    }
    /* an axis-aligned polyline with rounded corners; length and a point at a distance are measured on the polyline */
    function dedupe(pts) {
      return pts.filter(function (p, i) { return !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > .5; });
    }
    function wirePath(pts, rad) {
      var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length; i++) {
        var p = pts[i];
        if (i < pts.length - 1) {
          var a = pts[i - 1], c = pts[i + 1];
          var l1 = Math.hypot(p[0] - a[0], p[1] - a[1]), l2 = Math.hypot(c[0] - p[0], c[1] - p[1]);
          var r = Math.min(rad, l1 / 2, l2 / 2);
          var u = [(p[0] - a[0]) / l1, (p[1] - a[1]) / l1], v = [(c[0] - p[0]) / l2, (c[1] - p[1]) / l2];
          d += 'L' + (p[0] - u[0] * r).toFixed(1) + ' ' + (p[1] - u[1] * r).toFixed(1) +
               'Q' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + (p[0] + v[0] * r).toFixed(1) + ' ' + (p[1] + v[1] * r).toFixed(1);
        } else d += 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
      return d;
    }
    function polyLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
    function pointAt(pts, s) {
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (s <= l || i === pts.length - 1) { var k = l ? clamp(s / l) : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
        s -= l;
      }
      return pts[pts.length - 1];
    }
    /* Fig. 1's arrowhead: a filled, slightly notched head whose tip is the polyline's end */
    function headPath(pts) {
      var b = pts[pts.length - 1], a = pts[pts.length - 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      var u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-u[1], u[0]], HL = 9, HW = 4.6, NOTCH = 1.8;
      var bx = b[0] - HL * u[0], by = b[1] - HL * u[1], mx = b[0] - (HL - NOTCH) * u[0], my = b[1] - (HL - NOTCH) * u[1];
      return 'M' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + 'L' + (bx + HW * n[0]).toFixed(1) + ' ' + (by + HW * n[1]).toFixed(1) +
        'L' + mx.toFixed(1) + ' ' + my.toFixed(1) + 'L' + (bx - HW * n[0]).toFixed(1) + ' ' + (by - HW * n[1]).toFixed(1) + 'Z';
    }
    /* each arrow of the figure: when it draws (beat, from, to within the beat), its colour, and its route */
    var WIRES = [
      { id: 'scan', beat: 1, a: 0, b: .24, cls: 'ink' },
      { id: 'base', beat: 3, a: .02, b: .18, cls: 'gray' },
      { id: 'ref', beat: 3, a: .06, b: .22, cls: 'blue' },
      { id: 'setup', beat: 2, a: .38, b: .54, cls: 'ink' },
      { id: 'up', beat: 3, a: .06, b: .2, cls: 'gray' },
      { id: 'g2b', beat: 3, a: .56, b: .66, cls: 'gray' },
      { id: 'g2r', beat: 3, a: .62, b: .72, cls: 'blue' },
      { id: 'b2r', beat: 3, a: .7, b: .78, cls: 'gray' },
      { id: 'down', beat: 4, a: 0, b: .2, cls: 'ink' },
      { id: 'r2a', beat: 4, a: .04, b: .32, cls: 'blue', chip: 1 },
      { id: 'a2ag', beat: 5, a: 0, b: .14, cls: 'ink' },
      { id: 'slurm', beat: 5, a: .1, b: .2, cls: 'ink', nohead: 1 },
      { id: 'sb2df', beat: 5, a: .44, b: .54, cls: 'ink' },
      { id: 'df2v', beat: 6, a: 0, b: .14, cls: 'ink' },
      { id: 'v2s', beat: 7, a: 0, b: .14, cls: 'ink' },
      { id: 'a2s', beat: 7, a: 0, b: .3, cls: 'blue', chip: 1 },
      { id: 's2g', beat: 7, a: .56, b: .66, cls: 'ink' }
    ];
    WIRES.forEach(function (w) {
      w.track = S('path', { class: 'dp-wt' });
      w.line = S('path', { class: 'dp-wl is-' + w.cls });
      w.head = w.nohead ? null : S('path', { class: 'dp-wh is-' + w.cls });
      /* R rides the two blue wires as a labelled token: the reference is carried to the playground, then to the scorer */
      w.dot = w.chip ? S('g', { class: 'dp-wc' }, [S('circle', { r: 8.5 }), S('text', { 'text-anchor': 'middle', y: 4.4, text: 'R' })])
        : S('circle', { class: 'dp-wd is-' + w.cls, r: 3.6 });
      wires.appendChild(w.track); wires.appendChild(w.line); if (w.head) wires.appendChild(w.head); wires.appendChild(w.dot);
    });
    function routes() {
      var gh = box(R.gh), view = box(R.view), segp = box(R.segp), cm = box(B.commits.querySelector('.dp-cm'));
      var sb = box(R.shaB), sr = box(R.shaR), gl = box(R.gl), bp = box(R.bp), rr = box(R.rr), ds = box(R.ds.querySelector('.dp-doc-b'));
      var fp = box(R.filesp), fS = box(R.files[1]), a = box(R.pgA), ag = box(R.agent), sl = box(R.slurm), sbx = box(B.sandbox);
      var df = box(B.diff.querySelector('.dp-df-in')), v = box(R.valid), sc = box(R.sc), ng = box(R.ng), b3 = box(R.b3), W = stage.clientWidth;
      var keep = R.rows[R.rows.length - 1];
      var rowY = view.t + (G.rowTop[keep.i] - G.maxOff) + G.rowH / 2;
      function hz(x0, y0, x1, y1) {             /* right or left, then a vertical jog in the middle if the rows differ */
        if (Math.abs(y0 - y1) < 2) return [[x0, y0], [x1, y0]];
        var mx = (x0 + x1) / 2;
        return [[x0, y0], [mx, y0], [mx, y1], [x1, y1]];
      }
      var yB = clamp(sb.cy, gl.t + 14, gl.t + gl.h * .42), yR = clamp(sr.cy, gl.t + gl.h * .58, gl.b - 14);
      var xs = clamp(fS.cx, a.l + 30, a.r - 30), xa = clamp(ag.cx, a.l + 20, a.r - 20), xl = a.l + 22, gap = (a.b + b3.t) / 2;
      var dy = clamp(ds.cy, fp.t + 16, fp.b - 16);
      return {
        scan: hz(gh.r + 2, rowY, segp.l - 3, cm.cy),
        base: hz(sb.r + 4, sb.cy, gl.l - 3, yB),
        ref: hz(sr.r + 4, sr.cy, gl.l - 3, yR),
        setup: hz(ds.r + 3, ds.cy, fp.l - 3, dy),
        up: [[gl.cx, fp.t - 2], [gl.cx, gl.b + 3]],
        g2b: [[gl.r + 2, bp.cy], [bp.l - 3, bp.cy]],
        g2r: [[gl.r + 2, rr.cy], [rr.l - 3, rr.cy]],
        b2r: [[bp.cx, bp.b + 1], [bp.cx, rr.t - 2]],
        down: [[xs, fp.b + 2], [xs, a.t - 3]],
        r2a: [[rr.r + 2, rr.cy], [W - 12, rr.cy], [W - 12, a.cy], [a.r + 3, a.cy]],
        a2ag: [[xa, a.b + 2], [xa, ag.t - 3]],
        slurm: [[sl.r, sl.cy], [ag.l, sl.cy]],
        sb2df: hz(sbx.l - 2, df.cy, df.r + 3, df.cy),
        df2v: hz(df.l - 2, v.cy, v.r + 3, v.cy),
        v2s: hz(v.l - 2, sc.cy, sc.r + 3, sc.cy),
        a2s: [[xl, a.b + 2], [xl, gap], [sc.cx, gap], [sc.cx, sc.t - 3]],
        s2g: hz(sc.l - 2, ng.cy, ng.r + 3, ng.cy)
      };
    }
    /* the list's rows: their offsets inside the scrolled list, and how far it scrolls to rest on the kept PR (read only
       while the list is laid out; on narrow screens it is hidden outside its beat) */
    function measureList() {
      if (!R.view.clientHeight) return;
      G.rowTop = R.rows.map(function (r, i) { r.i = i; return r.li.offsetTop; });
      G.rowH = R.rows[0].li.offsetHeight || 44;
      G.viewH = R.view.clientHeight;
      var last = R.rows[R.rows.length - 1].li;
      G.maxOff = Math.max(0, last.offsetTop + last.offsetHeight + 4 - G.viewH);
      R.cur.style.height = G.rowH + 'px';
    }
    function layout() {
      measureList();
      if (narrow) { sceneHeight(); return; }
      stage.style.minHeight = '';
      var W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
      wires.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      wires.setAttribute('width', W); wires.setAttribute('height', H);
      var P = routes();
      WIRES.forEach(function (w) {
        var pts = dedupe(P[w.id]);
        if (pts.length < 2) pts = [P[w.id][0], [P[w.id][0][0] + .01, P[w.id][0][1]]];
        w.pts = pts; w.len = polyLen(pts);
        var d = wirePath(pts, 9);
        w.track.setAttribute('d', d); w.line.setAttribute('d', d);
        w.line.style.strokeDasharray = w.len.toFixed(1) + ' ' + (w.len + 20).toFixed(1);
        if (w.head) w.head.setAttribute('d', headPath(pts));
        w._k = null;
      });
    }

    /* below 900 px one beat's blocks show at a time: the stage keeps the tallest beat's height (measured per width) */
    function sceneHeight(force) {
      var W = stage.clientWidth;
      if (still) { stage.style.minHeight = ''; G.sceneW = 0; return; }
      if (!W || (W === G.sceneW && !force)) return;
      G.sceneW = W;
      stage.style.minHeight = '';
      var max = 0;
      SCENE_N.forEach(function (sc, i) {
        Object.keys(B).forEach(function (key) { var a = sc.indexOf(key) >= 0; B[key].classList.toggle('is-on', a); B[key].classList.toggle('is-2nd', a && sc.indexOf(key) > 0); });
        max = Math.max(max, stage.offsetHeight);
        if (!i) measureList();
      });
      Object.keys(B).forEach(function (key) { B[key]['_c_is-on'] = undefined; B[key]['_c_is-2nd'] = undefined; });
      stage.style.minHeight = max + 'px';
    }

    /* ---------------------------------------------------------------- render: every block from its beat's progress */
    var focus = -1;                                     /* the beat named by the rail and caption */
    /* lines that appear one after another as q goes from 0 to 1 */
    function typeIn(els, q) { var n = els.length; els.forEach(function (el, i) { on(el, 'is-on', q >= (i + .5) / n); }); }
    function render(t) {
      var P = BEATS.map(function (b, i) { return clamp((t - START[i]) / b.dur); });
      var k = 0;
      for (var i = 0; i < BEATS.length; i++) if (t >= START[i]) k = i;

      /* 1. scan: a cursor steps down the rows, the list scrolls with it, the kept PR gets the figure's black frame */
      var p = P[0], cl = 7 * seg(p, .05, .78), ci = Math.min(6, Math.floor(cl)), cf = cl - ci;
      var c = Math.min(7, ci + eio(clamp(cf * 1.7)));
      var top0 = G.rowTop[Math.floor(c)] || 0, top1 = G.rowTop[Math.min(7, Math.floor(c) + 1)] || top0;
      var cy = top0 + (top1 - top0) * (c - Math.floor(c));
      var off = clamp(cy + G.rowH / 2 - G.viewH * .56, 0, G.maxOff);
      if (p >= .995) off = G.maxOff;
      tf(R.prs, 'translateY(' + (-off).toFixed(1) + 'px)');
      tf(R.cur, 'translateY(' + cy.toFixed(1) + 'px)');
      op(R.cur, p > 0 && p < .9 ? 1 : 0);
      R.rows.forEach(function (r, j) { on(r.li, r.keep ? 'is-kept' : 'is-skip', r.keep ? p >= .82 : c >= j + .45); });
      tx(R.count, UI.fmt(Math.round(CORPUS.total * eo(seg(p, .02, .8)))));

      /* 2. segment: the two commits get their frames and names */
      p = P[1];
      on(R.cmPar, 'is-on', p >= .3); on(R.shaB, 'is-on', p >= .3);
      on(R.cmRef, 'is-on', p >= .58); on(R.shaR, 'is-on', p >= .58);

      /* 3. seal and parse: the lock closes over the problem and fix, the setup is copied into three files */
      p = P[2];
      on(R.pf, 'is-sealed', p >= .1); on(R.seal, 'is-on', p >= .06); on(R.seal, 'is-shut', p >= .24);
      on(R.ds, 'is-hl', p >= .28);
      typeIn(R.fileLines, seg(p, .5, .96));
      R.files.forEach(function (f, j) { on(f, 'is-on', p >= .48 + j * .12); });

      /* 4. measure: both commits under the same load (the reference finishes R times sooner), then the profiles */
      p = P[3];
      var race0 = .2, race1 = .58;
      sx(R.raceB, seg(p, race0, race1));
      sx(R.raceR, seg(p, race0, race0 + (race1 - race0) / EX.expert));
      on(R.gl, 'is-run', p > .16 && p < .84);
      R.marks.forEach(function (m, j) { on(m, 'is-on', p >= .6 + j * .06); });
      on(R.bp, 'is-on', p >= .62);
      R.bpItems.forEach(function (s, j) { on(s, 'is-on', p >= .64 + j * .05); });
      on(R.rr, 'is-on', p >= .7);
      tx(R.rv, p < .7 ? '—' : (1 + (EX.expert - 1) * eo(seg(p, .7, .92))).toFixed(2) + '×');

      /* 5. playground: the new setup is packed, sealed and selected */
      p = P[4];
      on(R.pgA, 'is-on', p >= .24);
      R.items.forEach(function (it, j) { on(it, 'is-on', p >= .34 + j * .08); });
      on(R.items[2], 'is-shut', p >= .58);
      on(R.pgA, 'is-sel', p >= .7);

      /* 6. sandbox: a GPU node from Slurm, the agent at work against its budget, then the diff and the write-up */
      p = P[5];
      on(R.node, 'is-on', p >= .14);
      on(R.agent, 'is-work', p >= .2 && p < .9);
      sx(R.budget, seg(p, .2, .9));
      typeIn(R.diffLines, seg(p, .48, .82));
      typeIn(R.artLines, seg(p, .6, .96));

      /* 7. check: same work, then same outputs */
      p = P[6];
      R.checks.forEach(function (ch, j) { on(ch, 'is-run', p >= .14 + j * .32 && p < .42 + j * .32); on(ch, 'is-ok', p >= .42 + j * .32); });
      on(R.valid, 'is-ok', p >= .8);

      /* 8. score: one measurement, then the normalized gain */
      p = P[7];
      on(R.sc, 'is-run', p >= .2 && p < .56); on(R.sc, 'has-v', p >= .3);
      tx(R.sv, p < .3 ? '—' : (1 + (EX.agent - 1) * eo(seg(p, .3, .54))).toFixed(2) + '×');
      tx(R.gv, p < .66 ? '—' : Math.round(GAIN * eo(seg(p, .66, .92))) + '%');
      on(R.gf, 'is-on', p >= .72);

      /* the arrows draw as their beat reaches them; a dot rides the head */
      if (!narrow) WIRES.forEach(function (w) {
        if (!w.pts) return;
        var q = seg(P[w.beat], w.a, w.b), kq = Math.round(q * 500) / 500;
        if (w._k === kq) return;
        w._k = kq;
        w.line.style.strokeDashoffset = (w.len * (1 - eio(q))).toFixed(1);
        op(w.line, q > 0 ? 1 : 0);
        if (w.head) op(w.head, seg(q, .82, 1));
        var pt = pointAt(w.pts, w.len * eio(q));
        if (w.chip) w.dot.setAttribute('transform', 'translate(' + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1) + ')');
        else { w.dot.setAttribute('cx', pt[0].toFixed(1)); w.dot.setAttribute('cy', pt[1].toFixed(1)); }
        op(w.dot, q > 0 && q < 1 ? 1 : 0);
      });

      /* rail, caption, the active blocks; the dip between loops */
      var cur = focus >= 0 ? focus : k, done = still && focus < 0;
      steps.forEach(function (s, j) {
        var isCur = !done && j === cur;
        on(s, 'is-done', done || (focus >= 0 ? j < focus : j < k || t >= END));
        on(s, 'is-cur', isCur);
        if (s._cur !== isCur) { s._cur = isCur; if (isCur) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current'); }
        sx(fills[j], isCur ? (still || focus >= 0 ? 1 : P[j]) : 0);
      });
      caps.childNodes.forEach(function (cp, j) { on(cp, 'is-on', done ? j === BEATS.length - 1 : j === cur); });
      bandEls.forEach(function (el, j) { on(el, 'is-on', !done && cur >= BANDS[j][1] && cur < BANDS[j][2]); });
      var act = done ? [] : SCENE[cur], actN = done ? [] : SCENE_N[cur];
      Object.keys(B).forEach(function (key) {
        var a = act.indexOf(key) >= 0, n = actN.indexOf(key);
        on(B[key], 'is-act', a && !narrow);
        on(B[key], 'is-on', narrow && (still || n >= 0));
        on(B[key], 'is-2nd', narrow && !still && n > 0);
      });
      var dip = still ? 1 : t > TOTAL - DIP ? 1 - .72 * eio(seg(t, TOTAL - DIP, TOTAL)) : t < DIP && loops ? .28 + .72 * eio(seg(t, 0, DIP)) : 1;
      op(stage, dip);
    }

    /* ---------------------------------------------------------------- playback: runs only while visible */
    var t = 0, raf = 0, last = 0, visible = false, started = false, userPaused = false, loops = 0;
    var still = UI.reduced() || !!UI.revealAll;
    function running() { return started && visible && !userPaused && !still && !document.hidden; }
    function frame(now) {
      raf = 0;
      if (!running()) return;
      var dt = last ? Math.min(.1, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      if (t >= TOTAL) { t -= TOTAL; loops++; }
      try { render(t); } catch (err) { if (window.console) console.warn('dojo-pipeline:', err); return; }
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      var go = running();
      root.classList.toggle('is-still', !go);
      if (go && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      else if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function jump(i) {
      if (still) { focus = focus === i ? -1 : i; render(END); return; }
      focus = -1;
      t = userPaused ? START[i] + BEATS[i].dur * .999 : START[i] + .001;
      if (!started) { started = true; }
      render(t); sync();
    }
    pauseBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      pauseBtn.classList.toggle('is-paused', userPaused);
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play animation' : 'Pause animation');
      if (userPaused && t < END) { render(t); }
      sync();
    });
    rail.addEventListener('keydown', function (e) {
      var i = steps.indexOf(document.activeElement);
      if (i < 0) return;
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? steps.length - 1 : -1;
      if (j < 0 || j >= steps.length) return;
      e.preventDefault(); steps[j].focus(); jump(j);
    });
    function setStill() {
      still = UI.reduced() || !!UI.revealAll;
      G.sceneW = 0;
      pauseBtn.hidden = still;
      root.classList.toggle('is-static', still);
      if (still) { focus = -1; render(END); }
    }
    function setNarrow() {
      narrow = narrowQ.matches;
      G.sceneW = 0;
      layout();
      render(still ? END : t);
    }

    /* ---------------------------------------------------------------- mount */
    host.textContent = '';
    host.appendChild(root);
    host.classList.add('dp-ready');
    setStill();
    layout();
    render(still ? END : 0);
    if ('ResizeObserver' in window) new ResizeObserver(function () { layout(); render(still ? END : t); }).observe(stage);
    else window.addEventListener('resize', function () { layout(); render(still ? END : t); });
    stage.querySelectorAll('img').forEach(function (im) {
      if (!im.complete) im.addEventListener('load', function () { G.sceneW = 0; layout(); render(still ? END : t); }, { once: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { G.sceneW = 0; layout(); render(still ? END : t); });
    if (narrowQ.addEventListener) narrowQ.addEventListener('change', setNarrow); else narrowQ.addListener(setNarrow);
    UI.onVisible(root, function () { if (!started && !still) { started = true; t = 0; render(0); sync(); } }, '0px 0px -18% 0px');
    UI.watch(stage, function (v) { visible = v; sync(); }, '0px');
    document.addEventListener('visibilitychange', sync);
    UI.onTheme(function () { layout(); render(still ? END : t); });
    UI.onReducedChange(function () { setStill(); if (!still) { started = true; layout(); render(t); } sync(); });
    window.addEventListener('beforeprint', function () { render(END); });
    window.addEventListener('afterprint', function () { render(still ? END : t); });
  }
})();
