/* LMSysDojo project page: every number on the page, in one place.
 * Sources: sections/*.tex, appendix/*.tex and asset/tabs/*.tex of the paper. Curves marked "extracted" were read off
 * the vector paths of the paper's own PDF figures (asset/figs/pack) and calibrated on their gridlines; their printed
 * end labels match to 0.1. Nothing here is invented: if a number is not in the paper, it is not on the page. */
window.LMSD = {
  /* Fig. results (a): normalized gain (%) of the selected candidate vs. analyses per item K = 1..10,
     70 held-out items, E2E (extracted). vanilla has no selection signal and stays at its K=1 mean. */
  kcurve: {
    K: [1,2,3,4,5,6,7,8,9,10],
    vanilla: [59.1,59.1,59.1,59.1,59.1,59.1,59.1,59.1,59.1,59.1],
    ranker: [59.1,61.0,61.6,61.6,61.6,61.6,61.6,61.6,61.6,61.6],
    gap: [58.4,62.9,66.0,66.8,67.2,67.3,67.3,67.6,67.8,68.3],
    structured: [65.0,65.8,67.0,68.3,69.2,70.0,70.7,71.5,72.4,73.7],
    iterative: [67.0,69.0,70.6,72.2,73.5,74.4,75.0,75.8,76.3,76.9]
  },
  /* Fig. results (b): at K = 10, pooled over the 70 held-out items. */
  headroom: [
    { key:"ranker",     label:"Vanilla + ranker", mean:59.1, pick:61.6, oracle:79.9 },
    { key:"gap",        label:"Gap analysis",     mean:58.4, pick:68.3, oracle:80.0 },
    { key:"structured", label:"Structured",       mean:65.0, pick:73.7, oracle:84.3, iterative:76.9 }
  ],
  /* Fig. k50: analysis-time scaling on the held-out post-cutoff split (n = 35, E2E), K = 1..50 (extracted). */
  k50: {
    K: [1,10,20,30,40,50],
    gap: [62.2,73.2,85.4,94.2,99.0,99.6],
    structured: [62.1,77.3,91.0,95.7,98.8,100.6],
    iterative: [63.8,82.7,93.9,97.9,101.9,103.8]
  },
  /* Table main: held-out splits, normalized gain (%), claude-opus-5 on Claude Code. */
  main: {
    metrics: ["E2E","TTFT","ITL","TPS","RPS"],
    rows: [
      { key:"vanilla",    label:"Vanilla",                 indent:0, K:1,  pre:[57.0,61.2,49.2,62.5,68.2], post:[60.1,61.6,44.4,60.7,61.3] },
      { key:"ranker",     label:"+ ranker",                indent:1, K:10, pre:[58.3,63.0,50.5,63.5,69.0], post:[65.6,69.6,50.0,66.0,65.7] },
      { key:"gap",        label:"Gap analysis",            indent:0, K:1,  pre:[55.1,58.3,45.5,61.4,67.1], post:[62.2,65.6,51.3,61.5,62.9] },
      { key:"gapPar",     label:"+ parallel",              indent:1, K:10, pre:[64.7,64.0,57.5,67.4,73.3], post:[73.2,72.9,59.1,71.6,72.3] },
      { key:"struct",     label:"Structured gap analysis", indent:0, K:1,  pre:[64.6,65.6,59.0,64.3,67.1], post:[62.1,57.7,62.8,62.0,62.6] },
      { key:"structPar",  label:"+ parallel",              indent:1, K:10, pre:[70.7,72.7,71.4,68.6,63.5], post:[77.3,85.7,73.2,75.4,75.4] },
      { key:"iterative",  label:"+ iterative",             indent:2, K:10, pre:[73.1,75.0,74.5,71.4,66.4], post:[82.7,92.5,79.0,81.0,81.1] }
    ],
    dev: [
      { label:"Vanilla", v:[75.8,80.9,74.7,83.5,86.5] },
      { label:"Gap analysis", v:[78.1,85.6,79.3,87.1,86.3] },
      { label:"+ parallel", v:[83.3,87.3,84.3,88.6,88.6] },
      { label:"Structured gap analysis", v:[79.9,79.6,83.6,89.5,88.7] },
      { label:"+ parallel", v:[104.9,102.5,138.4,108.8,104.6] },
      { label:"+ iterative", v:[113.5,109.6,151.8,119.2,114.2] }
    ]
  },
  /* Table modelfamily: held-out post-cutoff (n = 35) on the Antigravity CLI. */
  gemini: {
    models: ["Gemini 3.1 Pro","Gemini 3.8 Flash"],
    rows: [
      { label:"Single agent",            v:[[58.4,65.0,43.0,56.4,56.5],[68.6,77.7,66.4,65.5,67.6]] },
      { label:"Gap analysis",            v:[[60.7,61.7,42.2,58.3,59.7],[70.7,70.3,63.4,70.0,71.0]] },
      { label:"+ parallel",              v:[[63.6,67.3,57.6,62.0,63.1],[73.7,78.6,68.5,71.8,72.7]] },
      { label:"Structured gap analysis", v:[[60.6,54.8,51.9,60.4,61.8],[71.7,77.1,68.5,68.1,69.4]] },
      { label:"+ parallel",              v:[[65.4,76.7,56.9,67.2,68.6],[76.9,91.6,69.8,75.8,76.5]] }
    ]
  },
  /* Checks on held-out items (Fig. results c): share rejected and geometric-mean delivered E2E speedup. */
  checks: { stopped:48, passed:52, stoppedGeo:1.22, passedGeo:1.78 },
  /* Section 3 (analysis.tex): median within-item std. of log speedup, whole pipeline vs. implementer only on a fixed analysis. */
  variance: { gap: { full:0.067, fix:0.010 }, structured: { full:0.072, fix:0.012 }, reduction:"97–98%" },
  /* Section 5 (experiments.tex): post-cutoff E2E pick with no checks, the audit alone, the sensitivity check alone, both;
     and the pooled held-out pick before and after feedback. */
  checkAblation: { post: { none:77.3, audit:79.0, sensitivity:81.0, both:82.7 }, pooled: { before:73.7, after:76.9 } },
  /* Section 5 (experiments.tex): the 1,000 submitted prediction programs (10 analyses x 100 items). */
  provenance: { programs:1000, traceable:848, undeclaredShare:58, zeroC:21 },
  /* Section 2 and Table suite-summary. */
  dojo: {
    funnel: [
      { label:"Merged PRs scanned", vllm:20969, sglang:18442, total:39411 },
      { label:"Measured setups",    vllm:607,   sglang:293,   total:900 },
      { label:"LMSysDojo-100",      vllm:76,    sglang:24,    total:100 }
    ],
    eligibleShare: 2.3,
    splits: [
      { key:"dev",  label:"Dev",                  n:30, merged:"2024-03 to 2026-04", engines:"21 / 9",  expertGeo:1.81 },
      { key:"pre",  label:"Held-out, pre-cutoff",  n:35, merged:"2024-03 to 2026-04", engines:"33 / 2",  expertGeo:2.25 },
      { key:"post", label:"Held-out, post-cutoff", n:35, merged:"2026-05 to 2026-08", engines:"22 / 13", expertGeo:1.37 }
    ],
    cutoff: "2026-05-01",
    noiseFloor: 1.075,
    expertE2E: { geomean:1.77, median:1.43 },
    subsystem: [["GEMM / MoE kernels",13],["CUDA graphs",13],["Attention kernels",13],["KV cache, memory",12],["Frontend, tokenizer",10],["Model forward",7],["Multimodal encoder",7],["Spec. decoding",6],["Scheduler",6],["Other (4 subsystems)",13]],
    workload: [["Decode-heavy",31],["Prefill-heavy",21],["Multimodal input",17],["Prefix caching",10],["Chat / mixed",8],["Spec. decoding",6],["Structured output",4],["Reasoning batch",3]],
    modelType: [["Dense",45],["MoE",29],["VLM",26]],
    boundPhase: [["Decode",43],["Prefill",23],["Mixed",13],["Frontend",13],["Encoder",8]],
    headroom: [["E2E",1.77],["TTFT",1.87],["ITL",1.53],["TPS",1.62],["RPS",1.59]],
    gpus: [["1×H100",80],["2×H100",4],["4×H100",10],["8×H100",6]],
    params: [["<4B",16],["4–10B",51],["10–40B",21],["40B+",12]],
    prompts: [["Synthetic",73],["Real",13],["Image + text",14]],
    budgetHours: 1.5,
    pythonReproducible: 95,
    beatExpertNoOverlap: "22–27%"
  },
  /* Section 4, Table rl (on LMSysDojo-100's held-out and dev splits; only the 100 training items are one-GPU),
     Fig. rl-train, Fig. rl-throughput (the synchronous loop is computed from measured stage durations), Fig. rl-signal. */
  rl: {
    table: {
      K: [1,2,4,8],
      rows: [
        { key:"q27",   label:"Qwen3.5-27B",        note:"untrained, same family, 3× larger", held:[5.6,7.3,11.6,16.3], dev:[7.8,9.7,14.9,20.2] },
        { key:"q9",    label:"Qwen3.5-9B",         note:"untrained",            held:[1.5,2.4,4.8,7.4],   dev:[1.8,2.9,5.0,8.9] },
        { key:"q9rl",  label:"Qwen3.5-9B + analysis RL", note:"RL-trained",     held:[4.1,7.2,11.5,16.3], dev:[3.7,7.9,13.9,19.4] }
      ]
    },
    /* [effective training step, value] (extracted). */
    reward: [[1.6,0.0132],[3.2,0.0121],[4.7,0.0009],[6.0,0.0065],[7.4,0.0241],[9.2,0.0348],[10.8,0.0297],[12.7,0.0329],[14.3,0.0284],[16.0,0.027],[17.6,0.024],[19.1,0.0308],[20.8,0.0316],[22.6,0.0353],[24.6,0.0349],[26.4,0.0335],[28.5,0.0362],[30.2,0.0375],[34.2,0.0368],[35.4,0.037],[36.6,0.0369],[38.7,0.0358],[43.5,0.0361],[44.8,0.035],[46.8,0.0345],[48.4,0.0344],[49.7,0.0324],[51.2,0.0342],[52.7,0.0361],[54.2,0.0407],[55.3,0.038],[56.4,0.0386],[57.8,0.0391],[59.8,0.0396],[61.2,0.0394],[62.4,0.0406],[63.8,0.0408],[65.3,0.0403],[66.9,0.04],[69.5,0.0403],[76.1,0.0403],[77.5,0.0389],[78.9,0.0387],[80.3,0.0386],[81.3,0.0384],[82.9,0.0391],[84.3,0.0392],[85.6,0.0376],[88.0,0.0394],[89.8,0.0389],[91.7,0.0395],[93.1,0.0391],[94.7,0.0386],[96.1,0.0392],[98.0,0.0382],[99.3,0.0378],[100.8,0.0372],[102.8,0.0383],[104.3,0.0372],[105.6,0.0364],[106.8,0.0365],[108.3,0.0361],[110.0,0.036],[111.4,0.036],[112.9,0.0352],[115.7,0.0348],[117.1,0.0359],[118.7,0.036],[120.3,0.0356],[123.2,0.0373],[127.7,0.0383],[129.3,0.0376],[130.8,0.0376],[132.7,0.037],[133.8,0.0396],[134.9,0.039],[136.1,0.0388],[137.6,0.0387],[139.0,0.0383],[140.3,0.0401],[141.4,0.0403],[142.7,0.0406],[145.5,0.0413],[148.0,0.0409],[149.4,0.0429],[151.0,0.0426],[152.4,0.043],[153.7,0.0434],[154.9,0.046],[156.0,0.0456],[157.4,0.0464],[160.5,0.0468],[162.1,0.0461],[163.6,0.0453],[165.0,0.0472],[166.2,0.0473],[167.4,0.047],[168.6,0.046],[170.0,0.0466],[171.4,0.0455],[172.9,0.049],[174.2,0.0481],[175.6,0.0478],[177.0,0.0481],[178.2,0.0476],[179.6,0.0468],[181.4,0.046],[182.9,0.0458],[184.5,0.045],[186.2,0.0459],[187.9,0.0462],[189.4,0.046],[190.6,0.0471],[192.2,0.0468],[193.6,0.0464],[195.5,0.0463],[197.2,0.0471],[198.6,0.0468],[200.0,0.0458]],
    gain: [[1.6,0.0599],[3.2,0.0879],[4.7,0.1204],[6.0,0.1048],[7.4,0.1198],[9.2,0.142],[10.8,0.1363],[12.7,0.1341],[14.3,0.1398],[16.0,0.1271],[17.6,0.1187],[19.1,0.1188],[20.7,0.13],[22.6,0.131],[24.6,0.1264],[26.4,0.1223],[28.5,0.1361],[30.2,0.1294],[34.2,0.1391],[35.4,0.1377],[36.6,0.1411],[38.7,0.1372],[43.5,0.1381],[44.8,0.1346],[46.8,0.1305],[48.4,0.133],[49.7,0.1269],[51.2,0.1215],[52.7,0.1409],[54.2,0.1363],[55.3,0.1293],[56.4,0.135],[57.8,0.1381],[59.8,0.1395],[61.2,0.1455],[62.4,0.1467],[63.8,0.1511],[65.3,0.1575],[66.9,0.1574],[69.5,0.1601],[76.1,0.1594],[77.5,0.1536],[78.9,0.153],[80.3,0.1527],[81.3,0.1519],[82.9,0.1521],[84.3,0.1546],[85.6,0.1551],[88.0,0.1611],[89.8,0.1623],[91.7,0.1645],[93.1,0.1642],[94.7,0.1614],[96.1,0.1591],[98.0,0.1553],[99.3,0.1555],[100.8,0.1521],[102.8,0.1523],[104.3,0.1513],[105.6,0.1505],[106.8,0.1468],[108.3,0.1469],[110.0,0.1473],[111.4,0.1461],[112.9,0.1426],[115.7,0.1445],[117.1,0.1473],[118.7,0.1484],[120.3,0.1487],[123.2,0.1563],[127.7,0.16],[129.3,0.1578],[130.8,0.1588],[132.7,0.1559],[133.8,0.1558],[134.9,0.1537],[136.1,0.1579],[137.6,0.1544],[139.0,0.1541],[140.3,0.158],[141.4,0.1582],[142.7,0.1593],[145.5,0.1571],[148.0,0.1562],[149.3,0.1509],[151.0,0.1526],[152.3,0.1523],[153.7,0.1529],[154.8,0.151],[156.0,0.1564],[157.3,0.1586],[160.5,0.159],[162.1,0.1562],[163.6,0.1541],[165.0,0.1555],[166.2,0.1598],[167.3,0.1609],[168.6,0.1578],[170.0,0.1576],[171.4,0.1539],[172.8,0.1547],[174.2,0.1523],[175.6,0.1514],[177.0,0.1538],[178.2,0.1524],[179.6,0.1504],[181.4,0.1491],[182.8,0.1514],[184.5,0.1493],[186.2,0.154],[187.8,0.1533],[189.3,0.1525],[190.6,0.1541],[192.2,0.1548],[193.6,0.1572],[195.5,0.1571],[197.2,0.156],[198.6,0.1542],[200.0,0.1513]],
    throughput: [["Synchronous",6.2,"1 trainer, 1 server"],["Overlapped batches",12.0,"1 trainer, 1 server"],["Streaming",26.0,"1 trainer, 1 server"],["Streaming, elastic",29.7,"1+2e trainers, 1+1e servers"]],
    mechanisms: [
      ["Stage overlapping",3.5,"batches per hour","loop"],["Group streaming",1.6,"trainer utilization","loop"],
      ["In-place weight loading",5.1,"downtime saving","serving"],["Cache-aware routing",2.3,"prefix-cache hits","serving"],
      ["Elastic serving node",3.1,"tokens per second, with routing","serving"],["Environment caching",3.2,"setup time saving","rollout"],
      ["Eager measurement",4.2,"measurement wait saving","scoring"],["Baseline caching",23,"GPU-min saving","scoring"],
      ["Token-in/token-out",2.5,"trainer-token saving","training"],["Elastic trainer ×1",1.8,"compute speed","training"],
      ["Elastic trainer ×2",2.8,"compute speed","training"]
    ],
    signal: {
      whole:    { label:"Whole solver (Qwen3.8-27B)", rollouts:268, timedOut:204, delivered:5.6, spread:0, measuredOfDelivered:"2 of 15" },
      analyzer: { label:"Analyzer (Qwen3.5-9B)",      rollouts:712, delivered:64,  spread:67 },
      /* normalized gain at K = 1 with the same frozen Opus 5 implementer, held-out splits */
      gainK1: { analyzer9B:1.5, opusAnalyzer:"55–62" }
    },
    loop: { medianMinutes:42, p10p90Minutes:"32–63", stagingMinutes:4.5, analysisMinutes:20, turns:144, sampledTokens:"56k", promptTokens:"8.2M", buildMinutes:5, measureMinutes:5,
             syncBatchHours:2.48, seats:384, replicas:16, gpus:112, nodes:14, cacheHit:97, weightLoadSeconds:48, stepMinutes:20,
             trainerBusy:79, serverBusy:95, poolBusy:73, groupSize:8, spreadFilter:0.03, stepGroups:24, stepValidMin:8, maxStale:5 }
  }
};
