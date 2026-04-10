---
name: Gemma 4 Ecosystem Research
description: Community usage, inference providers/pricing, Node.js server options, and business model tiers for Gemma 4 deployment. Researched April 2026.
type: reference
---

# Gemma 4 Ecosystem Research (April 2026)

## Community Usage — What People Are Building

### Real Projects
- **PokeClaw / PhoneClaw** — AI agents controlling Android phones on-device, no cloud
- **Parlor** — Real-time voice + vision AI locally (Gemma 4 E2B + Kokoro)
- **localOCR** — Local OCR using Gemma 4 Vision
- **Gemma Gem** — Chrome extension, AI runs in browser via WebGPU
- **gemma4.java** — Pure Java inference
- **gemma4-heretical** — Uncensored 31B for Ollama/MLX
- **gemma-tuner-multimodal** — Fine-tuning on Apple Silicon

### Top Use Cases
1. On-device agents (phone control, offline assistants) — dominant theme
2. Multimodal/vision (OCR, document parsing, X-ray analysis)
3. Coding (80% on LiveCodeBench for 31B)
4. Local chatbots (privacy-first)
5. Healthcare (medical reasoning, patient summaries)

### Community Sentiment
- Apache 2.0 license is the biggest unlock (previous Gemma had restrictive custom license)
- LMArena #1 ranked US open model, #3 overall
- 31B: 85.2% MMLU Pro, 76.9% on agent tasks
- Developer pattern: Qwen 3.5 for coding/tool-use, **Gemma 4 for assistant workflows**, Llama 4 only for extreme context
- Llama 4 now most restrictive license (700M MAU limit) — pushing people toward Gemma 4
- 400M+ total Gemma downloads, 100K+ community variants on HuggingFace

## Inference Providers & Pricing

### Availability (as of April 8, 2026)
| Provider | Available | Notes |
|---|---|---|
| Google AI Studio | Yes | Direct from Google |
| Lightning AI | Yes | Fastest (102 tok/s), cheapest |
| OpenRouter | Yes | Free tier available |
| Novita / Parasail / Clarifai | Yes | Competitive |
| Groq | Not yet | Community requesting |
| Cerebras | Not confirmed | |
| Together AI, Fireworks, DeepInfra | Not yet | Model just launched, likely coming |

### Cost per 1M tokens
| Model | Input | Output |
|---|---|---|
| **Gemma 4 31B** | $0.14 | $0.40 |
| **Gemma 4 26B A4B** | $0.13 | $0.40 |
| GPT-4o-mini | $0.15 | $0.60 |
| Claude Haiku 4.5 | $1.00 | $5.00 |

Gemma 4 31B is **7x cheaper on input, 12x cheaper on output** than Claude Haiku.

### Speed (31B)
- Lightning AI: 102.2 tok/s, 0.70s TTFT
- Clarifai: 47.8 tok/s
- Median: 36 tok/s

## Node.js Server Options

| Method | GPU? | Production ready? |
|---|---|---|
| **Ollama** + `ollama` npm | CUDA | Yes — `ollama pull gemma4` |
| **llama.cpp** + `node-llama-cpp` | CUDA/Metal | Yes — all GGUF sizes |
| **Transformers.js v4** in Node | **CUDA** | Yes — 30x faster than v3 |
| **vLLM** behind Node HTTP | CUDA | Most battle-tested for high traffic |

### Key: Transformers.js v4 has CUDA in Node
Same library for browser (WebGPU) and server (CUDA). One codebase. No Python needed.

### Ollama on VPS (simplest path)
```bash
ollama pull gemma4:26b-a4b   # MoE, only 4B active params
```
```js
import { Ollama } from 'ollama';
const ollama = new Ollama({ host: 'http://vps:11434' });
const res = await ollama.chat({ model: 'gemma4:26b-a4b', messages: [...] });
```

## Business Model Tiers

```
Tier 1 (free):   Gemma 4 E2B in browser (WebGPU)      → $0
Tier 2 (cheap):  Gemma 4 31B via API (Lightning AI)    → ~$0.20/M tokens
Tier 3 (self):   Gemma 4 26B on VPS (Ollama)           → GPU cost only
Tier 4 (pro):    Claude API                             → ~$2-5/M tokens
```

## Sources
- [Google Developers Blog — Gemma 4 Agentic](https://developers.googleblog.com/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/)
- [Artificial Analysis — Gemma 4 31B Providers](https://artificialanalysis.ai/models/gemma-4-31b/providers)
- [OpenRouter — Gemma 4 31B](https://openrouter.ai/google/gemma-4-31b-it)
- [Ollama — Gemma 4](https://ollama.com/library/gemma4)
- [Transformers.js v4 Release](https://huggingface.co/blog/transformersjs-v4)
- [HuggingFace — Welcome Gemma 4](https://huggingface.co/blog/gemma4)
- [Latent Space — AINews Gemma 4](https://www.latent.space/p/ainews-gemma-4-the-best-small-multimodal)
- [Interconnects — Gemma 4 open model](https://www.interconnects.ai/p/gemma-4-and-what-makes-an-open-model)
- [Botmonster — Gemma 4 vs Qwen 3.5 vs Llama 4](https://botmonster.com/posts/gemma-4-vs-qwen-3-5-vs-llama-4-open-model-comparison-2026/)
- [TokenCost — Gemma 4 Pricing](https://tokencost.app/blog/gemma-4-pricing-benchmarks)
