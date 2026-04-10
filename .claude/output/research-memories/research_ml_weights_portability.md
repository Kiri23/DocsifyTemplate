---
name: ML Weights Portability, Cloud GPU Training, Local Embeddings
description: Weights are portable across runtimes (phone/browser/server/enterprise). Cloud GPU training via Modal ($0.19/run). Local embeddings for MemoryGraph semantic search. Full MainAI tiered architecture.
type: reference
---

# ML Weights Portability & Training Pipeline (April 2026)

## Core Insight: Weights = Portable Knowledge

One file (.onnx / .tflite) runs on any runtime:
- Pixel (LiteRT, GPU/NPU) → 50ms
- Mac (ONNX Runtime, Apple Silicon) → 20ms
- Browser (Transformers.js, WebGPU) → 100ms
- VPS (ONNX Runtime, CUDA) → 5ms
- Node.js server (onnxruntime-node) → 10ms
- Enterprise APK/web app → same model, their infra

## Format Guide

| Format | Best for | Convert to |
|---|---|---|
| .onnx | Universal (the "PDF of ML") | .tflite, web, Node |
| .tflite/.litert | Android/iOS (memory-mapped, GPU delegates) | hard to revert |
| .safetensors | Python/HuggingFace training | .onnx, .tflite |
| .gguf | llama.cpp (LLMs only) | not convertible |

Best practice: train → .onnx → .tflite for mobile. Keep both.

## Cloud GPU Training (fast iteration)

| Provider | GPU | $/hr | Billing | 30min Mac job becomes |
|---|---|---|---|---|
| Google Colab Free | T4 | $0 | -- | ~8 min |
| Kaggle Free | P100 | $0 | 30hrs/wk | ~6 min |
| **Modal.com** | A100 | $3.73 | **per second** | ~3 min = $0.19 |
| Vast.ai | A100 | $0.79 | per hour | ~3 min |
| RunPod | RTX 4090 | $0.34 | per hour | ~4 min |

**Recommendation: Modal.com** — per-second billing, $30/mo free, works from Termux (`modal run train.py`), Claude Code can trigger it. Zero idle cost.

## Local Embeddings for MemoryGraph

### Models
- **all-MiniLM-L6-v2**: 22M params, ~80MB, 384-dim vectors. Has .tflite quantized version.
- **EmbeddingGemma 300M**: Google's choice, 100+ languages, LiteRT native.

### Vector Search On-Device
- ObjectBox 4.0 (first on-device vector DB for Android)
- SQLite-Vector (30MB, cross-platform)
- Brute-force cosine similarity (fine for ~500 nodes, instant)

### Pipeline
1. Dump MemoryGraph nodes → JSON
2. Generate embeddings (Mac/VPS with all-MiniLM-L6-v2)
3. Store vectors on phone (500 × 384 × 4 bytes = 750KB)
4. Query: embed on-device → cosine similarity → top 5 results
5. All offline, 0 API calls

### Demo repo
github.com/hissain/AndroidSemanticSearch — ObjectBox + MiniLM-L6-v2

## Professional Value

Custom on-device embedding model for enterprises:
- Train on company docs → deploy to employees' browsers/phones
- No data leaves infrastructure, $0/query, Apache 2.0
- Same model: web (Transformers.js), Android (LiteRT), server (ONNX Runtime)

## MainAI Tiered Architecture

```
Training: Modal.com A100 ($0.19/run)
Browser:  Gemma 4 E2B (WebGPU) + custom embeddings (Transformers.js)
Phone:    Gemma 4 E2B (LiteRT-LM) + custom embeddings (LiteRT)
VPS:      Gemma 4 31B (Ollama) + full MemoryGraph (Neo4j)
Cloud:    Claude API (complex reasoning)
```

## Key Sources
- Modal.com pricing: modal.com/pricing
- On-Device RAG: medium.com/google-developer-experts/on-device-rag-for-app-developers
- AndroidSemanticSearch: github.com/hissain/AndroidSemanticSearch
- all-MiniLM-L6-v2 .tflite: huggingface.co/Nihal2000/all-MiniLM-L6-v2-quant.tflite
- EmbeddingGemma: developers.googleblog.com/introducing-embeddinggemma
- Keras → Android: medium.com/geekculture/train-ml-model-and-build-android-application
- LiteRT-LM: github.com/google-ai-edge/LiteRT-LM

## MemoryGraph IDs
- This research: 7a4a6c15-bc7a-4761-b794-1330a76751ae
- Linked to MainAI: fef401b5-3939-4c24-8009-810cdc1a262f
