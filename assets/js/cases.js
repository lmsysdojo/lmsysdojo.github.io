/* LMSysDojo project page: the case gallery. Every case, number and excerpt comes from the paper's qualitative appendix
 * (appendix/qualitative.tex) and the method figure; code excerpts are the paper's own abridged listings.
 * Speedups are E2E over the sealed baseline on the same hardware; "expert" is the merged reference fix measured the same way. */
window.LMSD_CASES = {
  classes: [
    { key: "quadratic", label: "Quadratic bookkeeping", long: "Quadratic bookkeeping on the engine thread" },
    { key: "geometry",  label: "Kernel geometry",       long: "Kernel geometry built for many tenants, paid by one" },
    { key: "cache",     label: "Caches & invariants",   long: "A cache that was off, or an invariant fetched per request" }
  ],

  /* Table qual-gallery: seven mechanisms the structured agent found (best structured attempt vs. reference fix).
     verdict follows the table caption, not the raw ratio: "Two beat the expert by a different root cause (8940, 12185);
     one improves the algorithmic complexity of the expert's own function (4696); the rest tie or closely trail it." */
  mechanisms: [
    { id: "vllm-4696", engine: "vLLM", pr: 4696, cls: "quadratic", title: "Chain the prefix-cache hashes",
      gap: "Prefix-cache keys were hashes of the whole prompt prefix, recomputed for each of 938 blocks of a 15k-token request.",
      fix: "Chain each block's hash on the previous one and memoise.",
      agent: 1.65, expert: 1.29, verdict: "beats", note: "Improves the algorithmic complexity of the expert's own function.", deep: true },
    { id: "vllm-3469", engine: "vLLM", pr: 3469, cls: "quadratic", title: "Incremental prompt-logprob detokenisation",
      gap: "Prompt-logprob detokenisation re-converted the whole prefix at every position.",
      fix: "Carry the incremental state forward.",
      agent: 8.45, expert: 8.97, verdict: "trails" },
    { id: "vllm-44212", engine: "vLLM", pr: 44212, cls: "quadratic", title: "Stop re-scanning finished images",
      gap: "Three per-step loops re-scanned a request's 200 images to find nothing to do, on 2000 decode steps.",
      fix: "Skip once decoding is past the last image.",
      agent: 1.87, expert: 1.78, verdict: "ties" },
    { id: "sglang-8940", engine: "SGLang", pr: 8940, cls: "geometry", title: "One segment for a one-adapter batch",
      gap: "LoRA kernels launch one block group per request; in decode each group fills a 16-row tile with one row and reloads the same adapter.",
      fix: "Describe the batch as one segment.",
      agent: 1.78, expert: 1.22, verdict: "beats", note: "Beats the expert by a different root cause; the two fixes compose.", delivery: "sglang-8940" },
    { id: "vllm-12185", engine: "vLLM", pr: 12185, cls: "geometry", title: "Dequantise MoE experts once",
      gap: "Int4 MoE launched one kernel per expert, 2880 per token at batch one.",
      fix: "Dequantise experts once at load.",
      agent: 2.35, expert: 1.90, verdict: "beats", note: "Beats the expert by a different root cause." },
    { id: "vllm-16725", engine: "vLLM", pr: 16725, cls: "cache", title: "Bring back the grammar cache",
      gap: "The outlines grammar cache was disabled with nothing in its place; the same 20-second automaton was rebuilt for each request.",
      fix: "Add a bounded in-memory cache.",
      agent: 6.44, expert: 7.12, verdict: "trails" },
    { id: "vllm-14223", engine: "vLLM", pr: 14223, cls: "cache", title: "Validate the generation config once",
      gap: "The API server validated the model's generation config against the Hugging Face hub on every request, blocking the event loop.",
      fix: "Cache it once per process.",
      agent: 17.2, expert: 17.0, verdict: "ties" }
  ],

  /* Table qual-examples: two deliveries end to end. */
  deliveries: [
    { id: "sglang-8940", engine: "SGLang", pr: 8940, attempt: "structured #3",
      deployment: "SGLang 0.5.0rc0, Llama-3.1-8B-Instruct with one r=64 LoRA adapter, 1×H100; open loop at 8 req/s, 2400 streamed chat requests, prompts ~290 tokens, outputs ~170.",
      mechanism: "LoRA kernels tile the token axis at 16 rows and launch one block group per sequence; in decode each segment is one row, so 15/16 of every tile is masked and the single adapter is re-read once per sequence (192 launches/step).",
      prediction: "E2E −1.7%, ITL −1.7%, TTFT 0%; low confidence (sized from a capture window in which the kernels ran empty).",
      delivered: "E2E 4.794 → 2.692 s (1.78×, −43.8%); ITL 1.79×; TTFT 1.27×; 2400 served in all arms.",
      expert: "Hoisted a per-forward rebuild of fused LoRA-B host buffers: 1.22× E2E, 1.22× ITL, 1.19× TTFT. Different root cause; the two fixes compose.",
      notes: "4 of 9 attempts across agents land the collapse at 1.64–1.78×, reproduced in a same-node A/B; restricted to one adapter as written.",
      agent: 1.78, expertX: 1.22, verdict: "beats",
      analysis: {
        file: "analysis.md",
        lines: [
          "1. BLOCK_S=16 over seg_len=1. Every LoRA kernel tiles the token",
          "   dimension at BLOCK_S = 16 but a decode segment is a single row,",
          "   so 15/16 of each M tile is masked away.",
          "2. Weights re-read once per sequence. The launch grid's Z axis is",
          "   the batch size, and batch_id = program_id selects the adapter.",
          "   With only one adapter loaded, every sequence's program re-streams",
          "   the same weights[w_index] from HBM: the read-once 55 us is paid",
          "   ~batch times."
        ]
      },
      patch: {
        file: "patch.diff",
        lines: [
          "+  if (getattr(self, \"enable_dense_decode\", False)",
          "+          and forward_batch.forward_mode.is_decode()",
          "+          and len(cur_uids) == 1):",
          "+      dense = self.cuda_graph_dense_batch_info",
          "+      dense.seg_lens.fill_(bs)",
          "+      dense.seg_indptr[1:].fill_(bs)",
          "+      dense.bs = 1",
          "+      dense.max_len = bs",
          "+      batch_info = dense"
        ]
      }
    },
    { id: "vllm-41868", engine: "vLLM", pr: 41868, attempt: "structured #2",
      deployment: "vLLM at 6881c754, Qwen2.5-VL-7B-Instruct with --quantization fp8, 1×H100; open loop at 36 req/s (3× overloaded), 1320 requests of 512 text tokens plus one 512×512 image, 60 out.",
      mechanism: "The FP8 dispatcher picks CUTLASS only if both weight dimensions are multiples of 16 and otherwise falls back to Triton with no log; the vision MLP width is 3420, taking 81.4 of 107.7 s of GPU time (75.6%).",
      prediction: "E2E −59.1%, TTFT −60.9%, ITL −53.5%; sized from a short local probe (52.8 → 21.6 s; analyzers are not allowed to run the full benchmark).",
      delivered: "E2E 55.6 → 20.5 s (2.72×, −63.2%, |log| error 0.105); TTFT 2.84×; ITL 2.33×; 1320 served in all arms.",
      expert: "Same diagnosis and pad-to-16 fix, placed in the CUTLASS kernel class rather than the shared dispatcher: 2.27× E2E, 2.39× TTFT, 2.14× ITL.",
      notes: "8 of 10 attempts land 2.58–2.74×; the 1.20× edge over the expert reflects 3× overload compounding small throughput differences.",
      agent: 2.72, expertX: 2.27,
      /* same diagnosis and pad-to-16 fix as the expert; the edge reflects 3x overload compounding small throughput differences */
      verdict: "same-fix",
      analysis: {
        file: "analysis.md",
        lines: [
          "cutlass_compatible_b = b.shape[0] % 16 == 0 and b.shape[1] % 16 == 0",
          "if current_platform.is_rocm() or not cutlass_compatible_b:",
          "    out = triton_scaled_mm(...)        # slow naive GEMM",
          "",
          "Qwen2.5-VL's vision tower trips the gate: intermediate_size = 3420,",
          "which is not a multiple of 16 (3420 = 16*213 + 12). The vision SwiGLU",
          "MLP has a fused gate_up_proj (N = 2*3420 = 6840) and a down_proj",
          "(K = 3420); both are FP8-quantized and both fail the divisibility",
          "test."
        ]
      },
      patch: {
        file: "patch.diff",
        lines: [
          "-  if current_platform.is_rocm() or not cutlass_compatible_b:",
          "+  if current_platform.is_rocm():",
          "       out = triton_scaled_mm(a, b, scale_a, scale_b, out_dtype, bias)",
          "+  elif not cutlass_compatible_b:",
          "+      K, N = b.shape",
          "+      K_pad = (K + 15) // 16 * 16",
          "+      N_pad = (N + 15) // 16 * 16",
          "+      ...   # zero-pad a, b along K; b, bias, scale_b along N",
          "+      torch.ops._C.cutlass_scaled_mm(out, a, b, scale_a, scale_b, bias)",
          "+      out = out[:, :N].contiguous()"
        ]
      }
    }
  ],

  /* Table qual-fail and "What the checks do not judge". */
  failures: [
    { mode: "Right mechanism, wrong size", item: "SGLang 8940", attempt: "structured #3",
      text: "LoRA kernel geometry sized from a CUDA-graph capture window in which the kernels ran empty; predicted −1.7%, measured −44%.",
      surfaced: "Implementer's interleaved A/B (39 → 15.7 ms ITL); re-running the corpus query exposes the error." },
    { mode: "Premise refuted at implementation", item: "SGLang 10286", attempt: "#2",
      text: "The analysis called the server GPU-bound and proposed a tile retune; the implementer found it host-bound, swapped in a CUDA-graph batch-cap change, and landed 0.94×.",
      surfaced: "follows_analysis: partial, with a written departure." },
    { mode: "Premise refuted at implementation", item: "vLLM 48144", attempt: "",
      text: "The analysis claimed a backend reorder would move mixed batches to full CUDA graphs (−15% E2E); the code routes them to piecewise graphs unconditionally, landing 0.98×.",
      surfaced: "follows_analysis: partial, with a written departure." },
    { mode: "Premise refuted at implementation", item: "vLLM 44858", attempt: "#3",
      text: "The analysis patched the V1 model runner while the V2 runner executed.",
      surfaced: "An honest abandon by the implementer." },
    { mode: "Wrong target", item: "vLLM 41992", attempt: "#4",
      text: "The card scores TTFT; the analysis optimised E2E and abandoned. The implementer re-targeted and landed 1.24× against the expert's 1.38×.",
      surfaced: "The implementer read the card." }
  ],
  boundary: [
    { item: "vLLM 50992", text: "Raises a documented threshold so that the CPU KV tier never stores on a no-reuse workload.", x: 1.57 },
    { item: "vLLM 45757", text: "Removes the per-step retry of a KV store that always fails (the ceiling of disabling the store).", x: 1.64 }
  ],

  /* Appendix "One delivery in depth": vLLM 4696, structured attempt 3, from profile to measurement. */
  deep: {
    id: "vllm-4696",
    title: "Prefix-cache hashing, vLLM 4696",
    setup: "vLLM 0.4.2 serving longchat-7b-16k on one H100 with prefix caching on; closed loop, four streams, 400 requests, every prompt 14,800 shared tokens followed by 200 unique ones, 16 output tokens.",
    bug: "Baseline latency is 0.758 s per request, of which 55 ms is spent naming the prompt's 938 blocks on the single engine thread before the first token; the GPU is busy under 40% of the time. The shipped code rebuilt each 16-token block's whole-prefix hash from scratch: block i touches 16(i+1) tokens, so a request copies about seven million integers three times in Python.",
    steps: [
      { k: "Profile", t: "py-spy on the serving node shows the engine thread CPU-saturated, with 34.5% of its samples in hash_of_block." },
      { k: "Measure the fix", t: "A microbenchmark on the real Sequence class gives 54.8 → 0.33 ms per request: 30.1% of the run's wall time." },
      { k: "Model", t: "Closed loop at fixed concurrency, so mean latency falls by the fraction of wall time removed. Little's law reproduces the baseline to the digit: 3.714 = 5.528 req/s × 0.672 s." },
      { k: "Predict", t: "The claim ships as a program, analyze(C, E, A): E2E −30.1%." },
      { k: "Implement & measure", t: "One deployment on the scoring node: E2E 0.758 → 0.461 s, 1.65× against the expert's 1.29×. Normalized gain 221%." }
    ],
    program: [
      { c: "def analyze(C, E, A):   # corpus, evidence, declared assumptions", src: "" },
      { c: "    wall   = C.scalar(\"SELECT value FROM bench.collect \"", src: "C" },
      { c: "                      \"WHERE key='run_bench_seconds'\")", src: "C" },
      { c: "    served = C.scalar(\"SELECT value FROM bench.collect \"", src: "C" },
      { c: "                      \"WHERE key='run_served'\")", src: "C" },
      { c: "    saved  = E.scalar(\"SELECT ms2s(value) \"", src: "E" },
      { c: "                      \"FROM evidence.hash_microbench \"", src: "E" },
      { c: "                      \"WHERE metric='saved_ms_per_request'\")  # 0.0545 s", src: "E" },
      { c: "    removed = saved * served / wall \\", src: "" },
      { c: "              * A(\"critical_path_fraction\")   # 1.0", src: "A" },
      { c: "              / A(\"cpu_speed_ratio\")          # 1.0", src: "A" },
      { c: "    return {\"E2E_mean\": -100 * removed, ...}  # -30.1 %", src: "" }
    ],
    assumptions: [
      { name: "critical_path_fraction", value: "1.0", reason: "The engine is enforce-eager and single-threaded, and the hashing runs before the forward pass." },
      { name: "cpu_speed_ratio", value: "1.0", reason: "The serving-node py-spy share (34.5%) brackets the agent-node microbenchmark share (30.1%)." }
    ],
    confidence: "medium; the TTFT/ITL split is named as the soft part",
    expertCode: {
      file: "PR #4696: vllm/sequence.py", meta: "+14/−2 lines, 1.29×",
      lines: [
        "# store the prompt as a tuple once",
        "self._prompt_token_ids_tuple = \\",
        "    tuple(prompt_token_ids)",
        "",
        "def hash_of_block(self, i):",
        "    n = self.num_hashed_tokens_of_block(i)",
        "    return hash((",
        "        self.data.get_prefix_token_ids(n),",
        "        self.lora_int_id))",
        "# get_prefix_token_ids slices 0..n"
      ],
      caption: "Removes two of three copies per call; the per-block slice of the whole prefix remains."
    },
    agentCode: {
      file: "structured attempt 3: patch.diff", meta: "≈70 lines, 1.65×",
      lines: [
        "def hash_of_block(self, i):",
        "    cache = self._cached_block_hashes",
        "    if i < len(cache):",
        "        return cache[i]          # O(1)",
        "    ids, B = self.data.get_token_ids(), 16",
        "    prev = cache[-1] if cache \\",
        "           else hash((self.lora_int_id,))",
        "    for k in range(len(cache), len(ids)//B):",
        "        prev = hash((prev,",
        "            tuple(ids[k*B:(k+1)*B])))",
        "        cache.append(prev)",
        "    ...                   # partial block"
      ],
      caption: "Each block costs 16 tokens plus the previous hash."
    },
    metrics: [
      { m: "E2E mean (s)",   base: "0.758", agent: "0.461", expert: "0.587", ag: 1.65, ex: 1.29 },
      { m: "TTFT mean (ms)", base: "360",   agent: "173",   expert: "252",   ag: 2.08, ex: 1.43 },
      { m: "ITL mean (ms)",  base: "25.2",  agent: "17.9",  expert: "21.0",  ag: 1.41, ex: 1.20 }
    ],
    prediction: [
      { m: "E2E",  pred: -30.1, meas: -39.2, err: 0.14 },
      { m: "ITL",  pred: -30.1, meas: -29.2, err: 0.01 },
      { m: "TTFT", pred: -30.1, meas: -51.9, err: 0.37 }
    ],
    replication: "All three audited structured attempts found this mechanism (1.65×, 1.65×, 1.72×); eight of nine audited attempts across the three agents landed 1.65–1.73×.",
    caveat: "Later vLLM versions key their prefix cache by chained block hashes, and the item predates the cutoff, so recall cannot be ruled out."
  },

  /* Method figure, right panel: one iterative-gap-analysis round. The perturbation trace is stopped because its
     maximum claim-to-leverage ratio, max_m |ln(1 + claim_m/100)| / lev_m, falls below tau = 0.01. */
  audit: {
    perturbation: { rows: [["E2E", "−10.1%", "28.0"], ["TTFT", "−4.6%", "23.0"], ["ITL", "−10.2%", "15.9"]], maxRatio: "0.0068", threshold: "0.01" },
    finding: "The −14.8% rests entirely on host_overhead_fraction_removed=0.17, but py-spy shows the two host paths the change actually streamlines … are a few percent of the step …",
    claimed: "−14.8%", corrected: "−2.6%", rerun: "its program re-run with the audited value 0.03",
    /* Appendix figure gates-box: the two checks, as pseudocode. */
    sensitivityCode: [
      "SENSITIVITY_CHECK(trace):",
      "  for m in {E2E, TTFT, ITL}:",
      "    claim[m], lev[m] = trace[m]   # % change, and its leverage",
      "  if max(lev) == 0: return STOP",
      "  for m with lev[m] > 0:",
      "    r[m] = |ln(1+claim[m]/100)| / lev[m]",
      "  return STOP if max(r) < tau else PASS",
      "  # tau = 0.01, fitted on the dev set"
    ],
    auditCode: [
      "ASSUMPTION_AUDIT(analysis, corpus):",
      "  v = agent(model = \"claude-opus-5\",",
      "      tools = [read corpus, re-run analyze],",
      "      prompt = \"... decide whether each value",
      "        in assume.yaml holds for THIS engine,",
      "        configuration and workload ...\")",
      "  for a in v:     # holds | doubtful | wrong",
      "    if a.wrong and a.load_bearing:",
      "      return STOP",
      "  return PASS"
    ],
    retries: 3,
    rejectShare: 48
  }
};
