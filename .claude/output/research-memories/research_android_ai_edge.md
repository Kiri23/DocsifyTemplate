---
name: Android AI Edge & On-Device ML Capabilities
description: Full research on Google AI Edge stack, Pixel Tensor capabilities, Termux ML runtimes, and how it connects to MainAI's on-device inference layer.
type: reference
---

# Android AI Edge & On-Device ML Research (April 2026)

## Google AI Edge Stack

```
Google AI Edge (umbrella)
├── ML Kit          → Firebase-level: barcode, face detect, OCR, translate
├── MediaPipe       → Task pipelines: pose, hands, face, objects, segmentation
├── LiteRT          → Runtime (ex-TFLite): run any ML model on CPU/GPU/NPU
├── LiteRT-LM       → LLM inference: Gemma 4 with tool calling, KV-cache
└── AICore          → System service: Gemini Nano on Pixel 8+ (Android 14+)
```

- AI Edge Portal: benchmark .litert models across 100+ physical Android devices
- LiteRT-LM: Gemma 4 E2B in <1.5GB RAM, 4K tokens in <3 seconds, open source
- PokeClaw: first app using Gemma 4 + Accessibility Service for phone control

## Pixel Tensor Chip
- Custom TPU/ML engine, NPU for on-device inference
- Gemini Nano already installed on Pixel 8+ via AICore
- LiteRT-LM runs Gemma 4 at ~20 tok/s on Tensor
- Tensor G5: TPU 60% more powerful than prior gens

## APK vs Termux Split

**APK world (Android SDK only):**
MediaPipe, ML Kit, LiteRT, LiteRT-LM, AICore, Accessibility Service, camera/sensors/GPS, native GPU

**Termux world (Linux userland):**
- Works: Rust, ONNX Runtime (Python), OpenCV, Pillow, Wasmer/Wasmtime, llama.cpp
- Painful: TensorFlow (2-day build), PyTorch (~1 week)
- Partial: GPU via Vulkan/OpenCL (device-specific, Pixel has OpenCL)
- Works: Node.js FFI to native .so (if compiled for aarch64-android)

## MainAI Connection

Tiered inference architecture:
- Tier 1 (free): Gemma 4 E2B on-device → $0, offline, instant
- Tier 2 (cheap): Gemma 4 31B via API → ~$0.20/M tokens  
- Tier 3 (self): Gemma 4 26B on VPS (Ollama) → GPU cost only
- Tier 4 (pro): Claude API → $2-5/M tokens, complex reasoning

Strategic: MainAI demands sovereignty but on-device quality gap vs Claude is still wide. Hybrid approach: simple tasks on-device, complex tasks to cloud.

## MemoryGraph ID
Research stored: 4440d844-e276-4bbe-9cb6-59c3ffa5bf23
Linked to MainAI vision: fef401b5-3939-4c24-8009-810cdc1a262f

## Sources
- https://ai.google.dev/edge
- https://ai.google.dev/edge/litert-lm/overview
- https://github.com/google-ai-edge/LiteRT-LM
- https://github.com/google-ai-edge/gallery
- https://github.com/agents-io/PokeClaw
