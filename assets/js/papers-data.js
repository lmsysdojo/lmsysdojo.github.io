/* LMSysDojo project page: the 50-paper library (window.LMSD_PAPERS), generated from the paper's Appendix G
 * catalog (asset/tabs/a1-papers.tex) by asset/source/site-papers.py; edit the table and rerun, not this file.
 * Each paper's headline mechanism as a resource trade: the gap located in a profile, the trade, the claim. Number
 * colours keep the table's provenance: pc-C read from a baseline profile, pc-E measured, pc-A assumed. */
window.LMSD_PAPERS = [
 {
  "name": "Memory capacity",
  "count": 15,
  "papers": [
   {
    "sys": "NEO",
    "title": "Saving GPU Memory Crisis with CPU Offloading for Online LLM Inference",
    "venue": "MLSys'25",
    "mech": "Asymmetric Pipelining",
    "desc": "offload KV and decode attention to the host",
    "gap": "HBM caps the decode batch, compute idles; GPU vs host is <span class=\"pc-A\">600 vs 200 GB/s</span> but <span class=\"pc-A\">125 vs 1.2 TFLOPS</span>, and decode attention is bandwidth-bound.",
    "trade": "some requests' KV and decode attention → host CPU, memory-bound.",
    "claim": "<span class=\"pc-E\">7.5x</span> on T4, <span class=\"pc-E\">26%</span> on A10G, <span class=\"pc-E\">14%</span> on H100."
   },
   {
    "sys": "Marconi",
    "title": "Prefix Caching for the Era of Hybrid LLMs",
    "venue": "MLSys'25",
    "mech": "judicious admission",
    "desc": "keep only branch-point and tail snapshots",
    "gap": "block-<span class=\"pc-A\">32</span> checkpoints reuse <span class=\"pc-C\">25.0%</span> of KV blocks but <span class=\"pc-C\">0.4%</span> of SSM states, <span class=\"pc-C\">65.3x</span> apart; <span class=\"pc-A\">10K</span> tokens hold <span class=\"pc-C\">17.4 GB</span>.",
    "trade": "mid-sequence snapshots, at most <span class=\"pc-A\">2</span> each → shared prefixes and chat tails, contended cache.",
    "claim": "hit rate <span class=\"pc-E\">4.5-34.4x</span>, P95 TTFT −<span class=\"pc-E\">71.1%</span>."
   },
   {
    "sys": "Pensieve",
    "title": "Stateful Large Language Model Serving",
    "venue": "EuroSys'25",
    "mech": "multi-tier GPU–CPU cache",
    "desc": "cache conversation state across turns on GPU and CPU",
    "gap": "each turn re-prefills the history; at <span class=\"pc-A\">32</span>-token prompts and <span class=\"pc-A\">200</span> steps prefill overtakes generation past <span class=\"pc-C\">3072</span> history tokens.",
    "trade": "live requests' concurrency → idle chats' resident context, <span class=\"pc-A\">60 s</span> think time.",
    "claim": "<span class=\"pc-E\">1.14x-3.0x</span> baseline throughput."
   },
   {
    "sys": "KunServe",
    "title": "Parameter-centric Memory Management for Efficient Memory Overloading Handling in LLM Serving",
    "venue": "EuroSys'26",
    "mech": "parameter drop",
    "desc": "drop replicated weights and serve cooperatively",
    "gap": "a <span class=\"pc-C\">2x</span> burst overflows HBM, TTFT rises <span class=\"pc-C\">239x</span> at <span class=\"pc-C\">56.3%</span> mean memory load; weights hold <span class=\"pc-C\">34-74%</span> of HBM.",
    "trade": "whole weight copies, a slice apiece until the burst ends → KV for queued requests, pipelined.",
    "claim": "P99 TTFT <span class=\"pc-E\">12.7-72.2x</span> lower, TPOT +<span class=\"pc-E\">15.8-22.7%</span>."
   },
   {
    "sys": "FineMoE",
    "title": "Taming Latency–Memory Trade-Off in MoE-Based LLM Serving via Fine-Grained Expert Offloading",
    "venue": "EuroSys'26",
    "mech": "fine-grained expert offloading",
    "desc": "keep experts predicted to activate in upcoming layers",
    "gap": "every expert stays resident though <span class=\"pc-C\">72%-84%</span> of parameters are inactive per step, <span class=\"pc-C\">23-70 GB</span> of idle HBM.",
    "trade": "lowest-ranked resident experts → host, the predicted few prefetched <span class=\"pc-A\">3</span> layers ahead over <span class=\"pc-A\">32 GB/s</span> PCIe.",
    "claim": "hit rate +<span class=\"pc-E\">39%</span>, latency −<span class=\"pc-E\">47%</span>."
   },
   {
    "sys": "Jenga",
    "title": "Effective Memory Management for Serving LLM with Heterogeneity",
    "venue": "SOSP'25",
    "mech": "layer-specific allocators",
    "desc": "reclaim unread tokens from per-layer memory pools",
    "gap": "paging all tokens in all layers wastes <span class=\"pc-C\">79.6%</span> of KV memory (vision model), <span class=\"pc-C\">38.2%</span> (Ministral).",
    "trade": "tokens no layer still reads → more concurrent decoders, capacity-bound.",
    "claim": "decode batch <span class=\"pc-C\">2.63</span> → <span class=\"pc-E\">5.39</span>, throughput up to <span class=\"pc-E\">2.16x</span> (<span class=\"pc-E\">1.46x</span> avg)."
   },
   {
    "sys": "eLLM",
    "title": "High Throughput and Low Latency LLM Serving via Adaptive KV Caching",
    "venue": "EuroSys'26",
    "mech": "adaptive token-wise caching",
    "desc": "evict early prefixes and recompute them during decode",
    "gap": "at <span class=\"pc-A\">50 req/s</span> memory is <span class=\"pc-C\">50%-100%</span> used, compute <span class=\"pc-C\">0%-10%</span>.",
    "trade": "the earliest <span class=\"pc-E\">36%-47%</span> of each running sequence's KV, recomputed every step → more concurrent decoders (avg <span class=\"pc-C\">223.16</span> → <span class=\"pc-E\">254.64</span>, max <span class=\"pc-E\">448</span>), memory-bound.",
    "claim": "throughput <span class=\"pc-E\">3.03x</span>, TTFT <span class=\"pc-E\">2.63x</span> lower."
   },
   {
    "sys": "CRAFT",
    "title": "Fine-Grained Cost-Aware Expert Replication For Efficient Mixture-of-Experts Serving",
    "venue": "MLSys'26",
    "mech": "benefit-driven replica allocation",
    "desc": "allocate a fixed replica budget by expected balance gain",
    "gap": "EPLB puts one replica per layer per GPU though gains plateau past <span class=\"pc-E\">16</span> and even layers gain little, cutting the KV cache <span class=\"pc-C\">19%-75%</span>.",
    "trade": "replicas bound for even layers → KV cache and batch, <span class=\"pc-E\">7.25x-7.5x</span> fewer replicas.",
    "claim": "goodput <span class=\"pc-E\">1.14x</span> avg, up to <span class=\"pc-E\">1.2x</span>."
   },
   {
    "sys": "CacheWise",
    "title": "Understanding Workloads and Optimizing KVCache Management for Efficiently Serving LLM Agents",
    "venue": "MLSys'26",
    "mech": "predictive KVCache eviction",
    "desc": "evict sessions predicted to resume last",
    "gap": "agent sessions run a median <span class=\"pc-C\">36 min</span>, tool turns outnumber user turns <span class=\"pc-C\">20x</span>; at <span class=\"pc-E\">10</span> sessions or fewer all policies tie.",
    "trade": "KV of sessions resuming last → those resuming next, under contention.",
    "claim": "evictions <span class=\"pc-E\">2-2.6x</span> fewer, session time <span class=\"pc-E\">2.7-3.5x</span> lower."
   },
   {
    "sys": "BatchGen",
    "title": "An Architecture for Scalable and Efficient Batch Inference",
    "venue": "OSDI'26",
    "mech": "yield",
    "desc": "park paused sequences on the host to enlarge batches",
    "gap": "saturating every expert needs a <span class=\"pc-A\">16384</span>-token batch; baselines hold <span class=\"pc-C\">8-16</span> sequences, GPUs about <span class=\"pc-C\">50%</span> underused.",
    "trade": "paused sequences' KV → host, <span class=\"pc-E\">1800+</span> sequences batch, completion time the goal.",
    "claim": "<span class=\"pc-E\">1.31x-1.85x</span> there, <span class=\"pc-E\">2.3x</span> at <span class=\"pc-A\">128</span> GPUs, <span class=\"pc-E\">9.6x</span> on <span class=\"pc-A\">24 GB</span>."
   },
   {
    "sys": "ECHO",
    "title": "Efficient KV Cache Offloading with Lossless Prefetching for Serving Native Sparse Attention",
    "venue": "OSDI'26",
    "mech": "dynamic token-level offloading",
    "desc": "offload context with lossless prefetch",
    "gap": "HBM holds <span class=\"pc-C\">380K</span> KV tokens per worker, at most <span class=\"pc-C\">4</span> concurrent <span class=\"pc-C\">100K</span> requests; sparse kernel at <span class=\"pc-C\">53%</span> utilization.",
    "trade": "resident KV of each sequence → a <span class=\"pc-A\">1.8M</span>-token host pool, more requests per decode batch.",
    "claim": "effective batch <span class=\"pc-C\">28</span> → <span class=\"pc-E\">102</span>, throughput <span class=\"pc-E\">2.15x</span>."
   },
   {
    "sys": "Prism",
    "title": "Cost-Efficient Multi-LLM Serving via GPU Memory Ballooning",
    "venue": "OSDI'26",
    "mech": "memory ballooning",
    "desc": "reclaim idle models' reserved GPU memory on demand",
    "gap": "models idle <span class=\"pc-C\">70%</span> of the time; static partitions leave <span class=\"pc-C\">50%</span> of GPU memory unused.",
    "trade": "reserved memory of idle models → the bursting model on the same GPU, <span class=\"pc-A\">2 MB</span> pages.",
    "claim": "<span class=\"pc-A\">99%</span> TTFT attainment on <span class=\"pc-E\">16</span> GPUs vs <span class=\"pc-E\">32</span> baseline: <span class=\"pc-E\">2x</span> cost, <span class=\"pc-E\">3.5x</span> more requests."
   },
   {
    "sys": "Symphony",
    "title": "Enabling Compute-Memory Disaggregation in LLM Serving Systems",
    "venue": "NSDI'26",
    "mech": "advisory requests",
    "desc": "evict at turn end, prefetch during user idle time",
    "gap": "recompute redoes <span class=\"pc-C\">99%</span> of ShareGPT tokens; sticky offload loads a node <span class=\"pc-C\">3.1x</span> the median.",
    "trade": "idle-session KV → host and disk at turn end, prefetched when a turn is signaled <span class=\"pc-E\">11.3 s</span> ahead.",
    "claim": "latency <span class=\"pc-E\">2.4x</span> lower; <span class=\"pc-E\">4x</span> the users at <span class=\"pc-E\">1.3%</span> more latency."
   },
   {
    "sys": "Kairox",
    "title": "Adaptive GPU–CPU Hybrid LLM Inference via Online Neuron Balancing",
    "venue": "OSDI'26",
    "mech": "online neuron balancing",
    "desc": "reassign GPU memory to currently active weights",
    "gap": "static placement leaves drifted activations on the CPU: <span class=\"pc-C\">102.8 ms</span> per step single-stream, <span class=\"pc-C\">551.7 ms</span> at batch <span class=\"pc-A\">20</span>.",
    "trade": "GPU slots of neurons no longer firing → host neurons now firing, a <span class=\"pc-A\">2,000</span>-neuron cache.",
    "claim": "up to <span class=\"pc-E\">7.57x</span> over llama.cpp, geomean <span class=\"pc-E\">3.15x</span>."
   },
   {
    "sys": "Mooncake",
    "title": "Trading More Storage for Less Computation — A KVCache-centric Architecture for Serving LLM Chatbot",
    "venue": "FAST'25",
    "mech": "Mooncake Store",
    "desc": "pool idle host memory for shared prefixes",
    "gap": "local DRAM caches <span class=\"pc-C\">3M</span> tokens, under <span class=\"pc-C\">50%</span> of the possible hit rate.",
    "trade": "idle DRAM and NICs cluster-wide (<span class=\"pc-A\">50M</span> tokens) → prefill GPUs that stop recomputing prefixes, above <span class=\"pc-A\">100 Gbps</span> a node.",
    "claim": "hit rate <span class=\"pc-E\">2.36x</span>, prefill <span class=\"pc-E\">48%</span> less, capacity <span class=\"pc-E\">59%</span> to <span class=\"pc-E\">498%</span> more."
   }
  ]
 },
 {
  "name": "Compute-unit time",
  "count": 25,
  "papers": [
   {
    "sys": "SOLA",
    "title": "Optimizing SLO Attainment for Large Language Model Serving with State-Aware Scheduling",
    "venue": "MLSys'25",
    "mech": "state-aware scheduling",
    "desc": "update admission and order from measured latency slack",
    "gap": "<span class=\"pc-C\">35%</span> of requests miss the <span class=\"pc-A\">200 ms</span> TPOT SLO with TTFT far under <span class=\"pc-A\">500 ms</span>; attainment <span class=\"pc-C\">65%</span>.",
    "trade": "iteration slots of requests inside both SLOs, sorted back or held → requests about to breach, co-located phases.",
    "claim": "attainment <span class=\"pc-E\">98%</span>, up to <span class=\"pc-E\">1.27x</span> more requests."
   },
   {
    "sys": "AdaGen",
    "title": "Workload-Adaptive Cluster Scheduler for Latency-Optimal LLM Inference Serving",
    "venue": "EuroSys'26",
    "mech": "selective distributed execution",
    "desc": "move a selected request phase to another instance",
    "gap": "brute-force search cuts tail TTFT <span class=\"pc-E\">1.5x</span> to <span class=\"pc-E\">1.9x</span>; Llumnix meets it for <span class=\"pc-C\">45%</span>.",
    "trade": "iterations of resident destination requests → requests waiting behind the moved phase, memory or not.",
    "claim": "one moved phase gives <span class=\"pc-E\">1.4x</span>; up to <span class=\"pc-E\">3.6x</span> attainment, <span class=\"pc-E\">2x</span> cost."
   },
   {
    "sys": "XY-Serve",
    "title": "End-to-End Versatile Production Serving for Dynamic LLM Workloads",
    "venue": "ASPLOS'26",
    "mech": "token-wise scheduling",
    "desc": "mix prefill, decode and verification within fixed token steps",
    "gap": "irregular tiles drop attention MFU <span class=\"pc-C\">53%</span> to <span class=\"pc-C\">30%</span>; per-stage batching wastes <span class=\"pc-C\">50%</span> on rearranging.",
    "trade": "fixed <span class=\"pc-A\">4k</span>-token steps: prompts cut into chunks → decode and verify tokens in reserved slots.",
    "claim": "attention <span class=\"pc-E\">21.5%</span> faster: <span class=\"pc-E\">79%</span> more QPS; mixed steps: <span class=\"pc-E\">89%</span>."
   },
   {
    "sys": "XGrammar",
    "title": "Flexible and Efficient Structured Generation Engine For Large Language Models",
    "venue": "MLSys'25",
    "mech": "adaptive token mask cache",
    "desc": "precompute valid tokens for reachable constraint states",
    "gap": "each step re-parses the <span class=\"pc-A\">128k</span> vocabulary: grammar TPOT <span class=\"pc-C\">44.2 ms</span> vs <span class=\"pc-C\">6.2 ms</span> without.",
    "trade": "setup under prefill and <span class=\"pc-E\">0.46 MB</span> host memory → the CPU time of each step; <span class=\"pc-E\">1134</span> tokens (under <span class=\"pc-A\">1%</span>) need the stack.",
    "claim": "mask <span class=\"pc-E\">36 us</span> a token, TPOT <span class=\"pc-E\">6.3 ms</span>, up to <span class=\"pc-E\">80x</span>."
   },
   {
    "sys": "CacheBlend",
    "title": "Fast Large Language Model Serving for RAG with Cached Knowledge Fusion",
    "venue": "EuroSys'25",
    "mech": "selective KV recompute",
    "desc": "recompute only cross-attentive tokens atop cached state",
    "gap": "<span class=\"pc-C\">4K</span>-token RAG prefill takes <span class=\"pc-C\">3 s</span>; prefix caching saves only the first chunk.",
    "trade": "prefill paid by earlier requests, on SSD → the arriving request and its queue; <span class=\"pc-A\">15%</span> of tokens redone.",
    "claim": "<span class=\"pc-E\">3 ms</span> a layer under a <span class=\"pc-E\">16 ms</span> KV load; TTFT <span class=\"pc-E\">2.2x</span> to <span class=\"pc-E\">3.3x</span> lower."
   },
   {
    "sys": "IC-Cache",
    "title": "Efficient Large Language Model Serving via In-context Caching",
    "venue": "SOSP'25",
    "mech": "live capability augmentation",
    "desc": "prime a small model with cached large-model answers",
    "gap": "<span class=\"pc-C\">70%</span> of requests have a near-duplicate, but replaying its answer drops win rate <span class=\"pc-A\">50%</span> → <span class=\"pc-E\">18%</span>.",
    "trade": "easy arrivals cede the large model → hard ones and the operator, 70% primed.",
    "claim": "2B plus examples holds 50%, <span class=\"pc-E\">71%</span> faster, <span class=\"pc-E\">5.1x</span> throughput → <span class=\"pc-E\">1.4-5.9x</span>."
   },
   {
    "sys": "Bidaw",
    "title": "Enhancing Key-Value Caching for Interactive LLM Serving via Bidirectional Computation–Storage Awareness",
    "venue": "FAST'26",
    "mech": "I/O-aware request scheduling",
    "desc": "order requests by cached-history location and size",
    "gap": "tiered KV loads put latency <span class=\"pc-E\">3.8x</span> above the in-memory ideal: host hits <span class=\"pc-C\">20%</span>, load-time CoV over <span class=\"pc-C\">90%</span>.",
    "trade": "history on SSD, largest last → history already in host memory.",
    "claim": "queueing <span class=\"pc-E\">5.76 s</span> → <span class=\"pc-E\">2.45 s</span>; eviction <span class=\"pc-E\">1.25x</span> → <span class=\"pc-E\">3.58x</span> latency, <span class=\"pc-E\">1.83x</span> throughput."
   },
   {
    "sys": "vAttention",
    "title": "Dynamic Memory Management for Serving LLMs without PagedAttention",
    "venue": "ASPLOS'25",
    "mech": "virtual tensors",
    "desc": "reserve contiguous virtual memory; commit physical pages on demand",
    "gap": "paged prefill kernels run <span class=\"pc-E\">37-42%</span> slower than contiguous ones.",
    "trade": "physical memory, held in <span class=\"pc-A\">64 KB</span> pages, reclaimed late → prefill attention, at P:D <span class=\"pc-C\">356</span>.",
    "claim": "contiguous kernels close the gap → <span class=\"pc-E\">1.18x</span>, <span class=\"pc-E\">1.23x</span> long-context throughput; decode ties."
   },
   {
    "sys": "TokenFlow",
    "title": "Responsive LLM Text Streaming Serving under Request Burst via Preemptive Scheduling",
    "venue": "EuroSys'26",
    "mech": "buffer-aware scheduling",
    "desc": "preempt requests with surplus unread tokens",
    "gap": "in a burst TTFT passes <span class=\"pc-C\">20 s</span> (limit <span class=\"pc-A\">1.3 s</span>) while served requests get <span class=\"pc-C\">30 tokens a second</span>, readers take <span class=\"pc-A\">12</span>.",
    "trade": "early requests with unread buffered tokens → later ones with nothing delivered.",
    "claim": "<span class=\"pc-E\">82.5%</span> more effective throughput, P99 TTFT <span class=\"pc-E\">80.2%</span> lower."
   },
   {
    "sys": "PARD",
    "title": "Enhancing Goodput for Inference Pipeline via ProActive Request Dropping",
    "venue": "EuroSys'26",
    "mech": "proactive request dropping",
    "desc": "drop predicted deadline misses before batching",
    "gap": "under bursts reactive drops leave goodput at <span class=\"pc-C\">30%</span> of arrivals; <span class=\"pc-C\">57.1-97.2%</span> come late, GPU time spent.",
    "trade": "requests past deadline, or judged so at a <span class=\"pc-A\">0.1</span> wait quantile → those with budget.",
    "claim": "drops <span class=\"pc-E\">0.12-3.6%</span>, waste <span class=\"pc-E\">1.5-62x</span> less → <span class=\"pc-E\">16-176%</span> goodput."
   },
   {
    "sys": "CacheSlide",
    "title": "Unlocking Cross Position-Aware KV Cache Reuse for Accelerating LLM Serving",
    "venue": "FAST'26",
    "mech": "weighted correction attention",
    "desc": "reuse attention state across position shifts with selective recompute",
    "gap": "a position shift cuts cached-key similarity over <span class=\"pc-E\">90%</span> under RoPE, only <span class=\"pc-E\">28%</span> under CoPE.",
    "trade": "retained state of fixed segments → queued agent turns, same order, shifted positions.",
    "claim": "recompute <span class=\"pc-A\">26%</span> of tokens → <span class=\"pc-E\">3.11-4.3x</span> latency, <span class=\"pc-E\">3.5-5.8x</span> throughput."
   },
   {
    "sys": "Eevee",
    "title": "Efficient Multimodal Serving via Module Multiplexing",
    "venue": "EuroSys'26",
    "mech": "module multiplexing",
    "desc": "overlap modality modules with separate compute shares and batches",
    "gap": "BLIP on Triton keeps active SMs below <span class=\"pc-C\">10%</span> over <span class=\"pc-C\">50%</span> of the time.",
    "trade": "light text modules holding all SMs idle → image encoding of other requests, alongside at <span class=\"pc-A\">70%</span> of SMs.",
    "claim": "strawman <span class=\"pc-C\">22.2</span> → <span class=\"pc-E\">34.4</span> req/s; near <span class=\"pc-E\">90%</span> active SMs → <span class=\"pc-E\">157%</span> more capacity."
   },
   {
    "sys": "HCache",
    "title": "Fast State Restoration in LLM Serving",
    "venue": "EuroSys'25",
    "mech": "activation restoration*",
    "desc": "store half-size intermediates on the host; reproject on GPU",
    "gap": "state restores cost <span class=\"pc-E\">20.0-26.0x</span> the ideal TTFT by recompute, <span class=\"pc-E\">6.5-13.0x</span> by KV offload.",
    "trade": "GPU time of resident decoders → arrivals with long evicted history.",
    "claim": "half the bytes, <span class=\"pc-A\">6x</span> less compute → <span class=\"pc-E\">1.93x</span> vs offload, <span class=\"pc-E\">5.73x</span> vs recompute; TBT up <span class=\"pc-E\">4%</span>."
   },
   {
    "sys": "TriInfer",
    "title": "Hybrid Disaggregated Scheduling for Multimodal Large Language Model Serving",
    "venue": "MLSys'26",
    "mech": "hybrid EPD disaggregation",
    "desc": "partition a fixed instance pool by profiled stage demand",
    "gap": "encode saturates at batch <span class=\"pc-E\">6</span>, decode at <span class=\"pc-E\">512</span>; even split <span class=\"pc-E\">2.6</span> req/s, profiled split <span class=\"pc-E\">3.9</span>.",
    "trade": "instances from the slack stage pool → the bottleneck pool, load steady.",
    "claim": "split plus stage batching lifts <span class=\"pc-E\">2.2</span> → 3.9 req/s → up to <span class=\"pc-E\">2.4x</span> goodput at <span class=\"pc-A\">90%</span> SLO."
   },
   {
    "sys": "LAPS",
    "title": "A Length-Aware-Prefill LLM Serving System",
    "venue": "MLSys'26",
    "mech": "long–short prefill disaggregation",
    "desc": "separate long and short prefill queues",
    "gap": "<span class=\"pc-C\">81%</span> of later-turn prompts are under <span class=\"pc-A\">256</span> tokens; batched with a long prefill, their TTFT inflates <span class=\"pc-E\">29-31x</span>.",
    "trade": "long prefills, chunked → short prompts and re-prefills, <span class=\"pc-C\">82.9%</span> of search load.",
    "claim": "TTFT <span class=\"pc-E\">30%</span> lower, RPS <span class=\"pc-E\">33%</span> up, SLO misses <span class=\"pc-E\">28%</span> fewer."
   },
   {
    "sys": "Agentix",
    "title": "An Efficient Serving Engine for LLM Agents as General Programs",
    "venue": "NSDI'26",
    "mech": "program-level attained service",
    "desc": "prioritize calls by accumulated program service time",
    "gap": "at load <span class=\"pc-A\">0.9</span> programs spend <span class=\"pc-C\">80.4%</span> to <span class=\"pc-C\">91.3%</span> of their time waiting.",
    "trade": "GPU service time from programs with most attained service → short and new programs, once a queue forms.",
    "claim": "toy wait <span class=\"pc-E\">18</span> to <span class=\"pc-E\">12</span> units; <span class=\"pc-E\">4-15x</span> throughput at equal latency vs vLLM."
   },
   {
    "sys": "Libra",
    "title": "Flexible Request Partitioning and Scheduling for Serving Unbalanced and Dynamic LLM Workloads",
    "venue": "NSDI'26",
    "mech": "flexible partition and scheduling",
    "desc": "partition requests at token boundaries to balance execution time",
    "gap": "<span class=\"pc-A\">8192</span>-in/<span class=\"pc-A\">32</span>-out: decode GPU at <span class=\"pc-C\">0.19%</span> MFU; colocation <span class=\"pc-C\">352.93 ms</span> tail TBT vs <span class=\"pc-A\">100 ms</span> SLO.",
    "trade": "GPU time of the instance idle after its prompt share → requests behind its partner, as load shifts.",
    "claim": "goodput up to <span class=\"pc-E\">1.91x</span> colocation, <span class=\"pc-E\">1.61x</span> disaggregation."
   },
   {
    "sys": "JITServe",
    "title": "SLO-aware LLM Serving with Imprecise Request Information",
    "venue": "NSDI'26",
    "mech": "minimum serving bandwidth",
    "desc": "limit generation rate to each request's objective",
    "gap": "Sarathi misses <span class=\"pc-C\">78.6%</span> of mixed SLOs, Autellix <span class=\"pc-C\">91.4%</span>, <span class=\"pc-E\">50.5%</span> with precise lengths.",
    "trade": "token capacity from slack requests held to just hit their objective → tighter or no-SLO requests, if contended.",
    "claim": "goodput <span class=\"pc-E\">1.4-6.3x</span> or <span class=\"pc-E\">28.5-83.2%</span> fewer resources."
   },
   {
    "sys": "Revisiting PP",
    "title": "Revisiting Pipeline Parallelism for LLM Serving",
    "venue": "OSDI'26",
    "mech": "dynamic chunked prefill",
    "desc": "adjust prompt-token budgets per pipeline iteration",
    "gap": "PP bubbles break the <span class=\"pc-A\">200 ms</span> TPOT SLO; TP sustains <span class=\"pc-C\">1.2x</span> the rate.",
    "trade": "iteration GPU time from waiting prompts, chunked smaller → active decodes and idle stages, on PCIe, unsaturated.",
    "claim": "chunk <span class=\"pc-A\">512</span>: <span class=\"pc-E\">8.28</span> vs TP <span class=\"pc-C\">3.48</span> req/s; resizing cuts TPOT <span class=\"pc-E\">35%</span> more."
   },
   {
    "sys": "CPU–GPU Hybrid",
    "title": "Achieving Cloud-Grade SLOs for Local Mixture-of-Experts Inference through CPU–GPU Hybrid Design",
    "venue": "OSDI'26",
    "mech": "stream-loading prefill",
    "desc": "stream expert weights to run all prefill on GPU",
    "gap": "host prefill peaks at <span class=\"pc-C\">500 tok/s</span>: TTFT <span class=\"pc-C\">20 s</span> at <span class=\"pc-A\">8K</span>, some <span class=\"pc-C\">100 s</span> at <span class=\"pc-A\">32K</span> vs a <span class=\"pc-A\">30 s</span> target.",
    "trade": "prefill arithmetic from host cores → GPU compute fed expert weights over PCIe, past <span class=\"pc-A\">4K</span> tokens.",
    "claim": "prefill rises to <span class=\"pc-E\">1,200 tok/s</span> (<span class=\"pc-E\">2.4x</span>), so 32K lands in <span class=\"pc-E\">27 s</span>."
   },
   {
    "sys": "EcoServe",
    "title": "Efficient LLM Serving on Commodity GPU Clusters with Data-Reduced Cross-Instance Orchestration",
    "venue": "OSDI'26",
    "mech": "partially disaggregated strategy",
    "desc": "alternate prefill/decode slots, staggered across instances",
    "gap": "colocated prefills stall decodes; disaggregation needs <span class=\"pc-C\">39 GB/s</span> of KV per node on <span class=\"pc-A\">10 Gbps</span> links.",
    "trade": "GPU time from decodes with slack under a <span class=\"pc-A\">100 ms</span> TPOT SLO → new prompts awaiting first tokens on tight TTFT.",
    "claim": "goodput <span class=\"pc-E\">1.96x</span> vLLM, <span class=\"pc-E\">1.99x</span> Sarathi."
   },
   {
    "sys": "NanoFlow",
    "title": "Towards Optimal Large Language Model Serving Throughput",
    "venue": "OSDI'25",
    "mech": "nano-batching",
    "desc": "overlap differently-bound operations across sub-batches",
    "gap": "ops hit <span class=\"pc-C\">80%</span> of their bottleneck, yet in sequence compute utilization is <span class=\"pc-C\">40%</span>.",
    "trade": "units from compute-bound GEMMs → memory-bound KV reads and collectives on a slice of units, at large batch.",
    "claim": "overlap lifts utilization 40% to <span class=\"pc-E\">68.5%</span>, <span class=\"pc-E\">1.91x</span> TRT-LLM."
   },
   {
    "sys": "Strata",
    "title": "Hierarchical Context Caching for Long Context Language Model Serving",
    "venue": "OSDI'26",
    "mech": "GPU-assisted I/O",
    "desc": "copy cache with GPU threads instead of transfer engines",
    "gap": "PCIe utilization <span class=\"pc-C\">22%</span>; prefill is <span class=\"pc-C\">0.74</span> copies, <span class=\"pc-C\">0.26</span> compute.",
    "trade": "under <span class=\"pc-E\">5%</span> of colocated prefill throughput → requests stalled on host KV loads, on small pages.",
    "claim": "<span class=\"pc-A\">75%</span> link use runs copies <span class=\"pc-E\">3.4x</span> faster, stall <span class=\"pc-E\">24%</span>; I/O alone <span class=\"pc-E\">2.3x</span> peak throughput."
   },
   {
    "sys": "LMETRIC",
    "title": "Simple is Better: Multiplication May Be All You Need for LLM Request Scheduling",
    "venue": "OSDI'26",
    "mech": "multiplicative combination",
    "desc": "minimize uncached prefill work times batch occupancy",
    "gap": "KV$ awareness cuts TTFT <span class=\"pc-E\">84%</span>, but weight <span class=\"pc-A\">0.9</span> vs <span class=\"pc-A\">0.7</span> skews prefill <span class=\"pc-E\">3.57</span> vs <span class=\"pc-E\">2.17 s</span>.",
    "trade": "capacity from emptier instances without the context → those holding it, at bigger batch, if held widely.",
    "claim": "P-token x batch size: TTFT down <span class=\"pc-E\">92%</span>, TPOT <span class=\"pc-E\">24%</span> vs vLLM."
   },
   {
    "sys": "FlexInfer",
    "title": "Flexible LLM Inference with CPU Computations",
    "venue": "MLSys'25",
    "mech": "SplitGen",
    "desc": "run decode layers on CPU instead of streaming weights",
    "gap": "exposed PCIe copies are <span class=\"pc-C\">91.6-97.6%</span> of FlexGen runtime.",
    "trade": "idle host CPU cycles and memory bandwidth → memory-bound decode steps stalled on the host-to-device link.",
    "claim": "CPU decode moves <span class=\"pc-E\">0.3 MB</span> per token: TPOT down <span class=\"pc-E\">77.7%</span>, latency <span class=\"pc-E\">75%</span> and <span class=\"pc-E\">76%</span>."
   }
  ]
 },
 {
  "name": "Link and I/O bandwidth",
  "count": 7,
  "papers": [
   {
    "sys": "DirectKV",
    "title": "No Buffer, No Bottleneck: Efficient Zero-Copy KV Cache Offloading for Long-Context LLMs",
    "venue": "OSDI'26",
    "mech": "CPU-memory-aware tiling",
    "desc": "hold host operands stationary; re-read local partial results",
    "gap": "zero-copy GEMM on NVLink-C2C takes <span class=\"pc-C\">106 ms</span> vs <span class=\"pc-C\">52 ms</span> local, re-fetching the host operand: <span class=\"pc-C\">33.5 GB</span>.",
    "trade": "HBM traffic <span class=\"pc-C\">21.1 GB</span> → <span class=\"pc-E\">61.8 GB</span> + <span class=\"pc-E\">33.9 GB</span>, link <span class=\"pc-E\">0.4 GB</span>; HBM <span class=\"pc-A\">4 TB/s</span> vs <span class=\"pc-A\">450 GB/s</span>, prefill only.",
    "claim": "<span class=\"pc-E\">54 ms</span>; end to end <span class=\"pc-E\">1.2x</span>, <span class=\"pc-E\">43%</span> less GPU memory."
   },
   {
    "sys": "Seesaw",
    "title": "High-throughput LLM Inference via Model Re-sharding",
    "venue": "MLSys'25",
    "mech": "dynamic model re-sharding",
    "desc": "repartition weights and KV at phase transitions",
    "gap": "over PCIe, TP8 prefill is <span class=\"pc-C\">0.77</span> all-reduce, <span class=\"pc-C\">5x</span> PP8's time; PP8 decode is <span class=\"pc-C\">0.66</span> weight loads, <span class=\"pc-C\">2x</span> TP's.",
    "trade": "prefill's per-layer exchange → decode's, re-sharding PP→TP at the switch; offline batch, slow link.",
    "claim": "<span class=\"pc-E\">1.36x</span> avg, <span class=\"pc-E\">1.78x</span> max over vLLM."
   },
   {
    "sys": "FlexPipe",
    "title": "Adapting Dynamic LLM Serving Through Inflight Pipeline Refactoring in Fragmented Serverless Clusters",
    "venue": "EuroSys'26",
    "mech": "inflight pipeline refactoring",
    "desc": "adapt pipeline depth to arrival burstiness",
    "gap": "<span class=\"pc-C\">75%</span> of peak always-on, GPUs at <span class=\"pc-C\">17%</span>; stall overhead <span class=\"pc-C\">10x</span> from <span class=\"pc-A\">CV 1</span> to 4.",
    "trade": "in-flight wire time <span class=\"pc-C\">45</span> → <span class=\"pc-E\">225 ms</span> → the backlog; bursty only: deep pipes <span class=\"pc-E\">3x</span> faster at <span class=\"pc-A\">CV 4</span>, <span class=\"pc-E\">2.7x</span> slower when smooth.",
    "claim": "latency −<span class=\"pc-E\">66.1%</span>, <span class=\"pc-E\">8.5x</span> goodput per GPU, 75% → <span class=\"pc-E\">30%</span>."
   },
   {
    "sys": "HydraServe",
    "title": "Minimizing Cold Start Latency for Serverless LLM Serving in Public Clouds",
    "venue": "NSDI'26",
    "mech": "cross-server model parallelism*",
    "desc": "split layers across servers; each fetches its own weights",
    "gap": "cold start over <span class=\"pc-C\">40 s</span>, <span class=\"pc-C\">24.5 s</span> fetching weights over <span class=\"pc-C\">16 Gbps</span>, vs <span class=\"pc-C\">30 ms</span> per token.",
    "trade": "idle servers' links, GPU memory-time → the cold instance; <span class=\"pc-A\">4</span> workers each fetch a quarter, TPOT <span class=\"pc-E\">1.06x</span>.",
    "claim": "cold start <span class=\"pc-E\">1.7-4.7x</span> shorter, SLO attainment <span class=\"pc-E\">1.43-1.74x</span>."
   },
   {
    "sys": "PPC",
    "title": "Accelerating Model Loading in LLM Inference by Programmable Page Cache",
    "venue": "FAST'26",
    "mech": "interruptible prefetching",
    "desc": "prefetch a prior launch's recorded read sequence",
    "gap": "loading reads the SSD at <span class=\"pc-C\">1.05 GB/s</span> of a <span class=\"pc-C\">5.93 GB/s</span> peak, <span class=\"pc-C\">17%</span>, a <span class=\"pc-C\">5.64x</span> gap, and over <span class=\"pc-C\">50%</span> of startup.",
    "trade": "the I/O-idle init phase → the critical-path load; local SSD, repeat launch.",
    "claim": "the gap caps the win at 5.64x; loading −<span class=\"pc-E\">79%</span>, <span class=\"pc-E\">4.8x</span>, startup −<span class=\"pc-E\">38%</span>."
   },
   {
    "sys": "Layered Prefill",
    "title": "From Tokens to Layers: Redefining Stall-Free Scheduling for MoE Serving with Layered Prefill",
    "venue": "MLSys'26",
    "mech": "layered prefill",
    "desc": "co-schedule decode with one prefill layer group per iteration",
    "gap": "<span class=\"pc-A\">512</span>-token chunks make <span class=\"pc-A\">18</span> expert passes per <span class=\"pc-C\">9k</span> prompt: <span class=\"pc-C\">955 GB</span> per request, MoE over <span class=\"pc-C\">50%</span> of a <span class=\"pc-C\">500 ms</span> step.",
    "trade": "prefill, one layer group per step → co-located decode, <span class=\"pc-C\">1.3</span> → <span class=\"pc-E\">1.6 req/s</span>.",
    "claim": "loads −<span class=\"pc-E\">39%</span>, TTFT <span class=\"pc-C\">2.80</span> → <span class=\"pc-E\">1.24 s</span>, E2E −<span class=\"pc-E\">41%</span>, energy −<span class=\"pc-E\">22%</span>."
   },
   {
    "sys": "ADAngel",
    "title": "Accelerating Arbitrary-Precision Quantized LLMs with Adaptive Computing Mapping",
    "venue": "OSDI'26",
    "mech": "strategy dispatcher",
    "desc": "profile shapes offline to partition operands into native widths",
    "gap": "padding reads <span class=\"pc-A\">4-bit</span> weights as <span class=\"pc-C\">8-bit</span>, <span class=\"pc-A\">2x</span> the bytes, and at <span class=\"pc-A\">batch 1</span> idles <span class=\"pc-C\">93.75%</span> of a tile.",
    "trade": "partial-sum shared memory, <span class=\"pc-E\">32x</span>, and issue slots → weight fetch at 4 bits, below prompt <span class=\"pc-C\">8</span>, batch <span class=\"pc-C\">16</span>.",
    "claim": "decode <span class=\"pc-E\">1.95x</span> vs TRT-LLM, <span class=\"pc-E\">5.10x</span> max vs llama.cpp."
   }
  ]
 },
 {
  "name": "Provisioned capacity",
  "count": 3,
  "papers": [
   {
    "sys": "PiLLM",
    "title": "Resource-efficient LLM Inference Using Workload Prediction",
    "venue": "EuroSys'26",
    "mech": "elastic inter-GPU dispatch",
    "desc": "scale devices per phase from predicted compute demand",
    "gap": "arrivals diurnal, compute demand spiky; tail lengths <span class=\"pc-C\">3-10x</span> the bulk, GPUs at peak, KV memory <span class=\"pc-C\">45-70%</span> used.",
    "trade": "peak-sized allocation → the provider; <span class=\"pc-A\">1-4</span> instances a phase cap it at <span class=\"pc-A\">4x</span>.",
    "claim": "<span class=\"pc-E\">1.62-3.06x</span> fewer GPUs, decode <span class=\"pc-E\">3.72-4.00x</span>, SLO <span class=\"pc-E\">97.9-100%</span>."
   },
   {
    "sys": "Janus",
    "title": "Multi-LLM Serving at Production Scale",
    "venue": "SOSP'26",
    "mech": "steady pool",
    "desc": "pack low-traffic models to free GPUs for burst replicas",
    "gap": "<span class=\"pc-C\">12%</span> of apps send <span class=\"pc-C\">80%</span> of requests; <span class=\"pc-C\">5-10x</span> bursts in seconds vs a <span class=\"pc-C\">0.4-2.7 s</span> H2D reload.",
    "trade": "tail apps packed on shared devices → head apps' exclusive D2D-fork replicas in <span class=\"pc-E\">388-783 ms</span>.",
    "claim": "SLO <span class=\"pc-E\">0.97-1.0</span> vs <span class=\"pc-C\">0.80-0.92</span>; <span class=\"pc-E\">13,440</span> device-hours, <span class=\"pc-E\">27%</span> vs static."
   },
   {
    "sys": "Murakkab",
    "title": "Resource-Efficient Agentic Workflow Orchestration in Cloud Platforms",
    "venue": "OSDI'26",
    "mech": "cross-workflow multiplexing*",
    "desc": "choose tier-specific knobs/models/hardware; pool requests across workflows",
    "gap": "hand-tuned serving holds <span class=\"pc-C\">2568</span> GPUs flat, <span class=\"pc-C\">82.1 MWh</span>, <span class=\"pc-C\">211.7k USD</span>; auto-scaling saves <span class=\"pc-C\">1.8x</span>.",
    "trade": "loose tiers drop <span class=\"pc-C\">66.2%</span> → <span class=\"pc-A\">61.4%</span> accuracy for <span class=\"pc-E\">18.5k</span> → <span class=\"pc-E\">6.9k USD</span>; cross-workflow pooling cuts <span class=\"pc-E\">21.6%</span> more.",
    "claim": "<span class=\"pc-E\">912</span> GPUs, <span class=\"pc-E\">2.8x</span>; <span class=\"pc-E\">22.1 MWh</span>, <span class=\"pc-E\">3.7x</span>; <span class=\"pc-E\">47.2k USD</span>, <span class=\"pc-E\">4.3x</span>."
   }
  ]
 }
];
