---
name: ML Pipeline — paper to phone, actionable steps
description: Complete actionable pipeline from academic paper → code (paper2code) → train (Modal $0.19) → weights (HuggingFace) → deploy (phone/browser/VPS). Tool calling explained. All resources free and public.
type: reference
---

# ML Pipeline: Paper → Code → Train → Deploy (Actionable)

## The Stack (each step is ready NOW)

```
paper2code     → reads arxiv paper, generates citation-anchored code
Modal.com      → trains the model ($0.19 per A100 run, 3 minutes)
HuggingFace    → publishes/downloads weights (token in Doppler)
tokenizer      → converts text to numbers (installed in Termux)
ONNX           → portable weight format (runs everywhere)
LiteRT         → runs on Pixel (GPU/NPU delegates)
Transformers.js → runs in browser (WebGPU)
DocsifyTemplate → shows result to user (chat widget with tool calling)
MainAI         → orchestrates everything
```

## paper2code Skill
- Installed: ~/.claude/skills/paper2code/ (global) + project level
- Command: `/paper2code https://arxiv.org/abs/1706.03762`
- Output: model.py, train.py, loss.py, config.yaml — every line cites paper
- Has worked examples: Attention Is All You Need + DDPM

## Resources (all free, all public)

| Resource | Link | Purpose |
|---|---|---|
| Zero to Hero (course) | [karpathy.ai/zero-to-hero.html](https://karpathy.ai/zero-to-hero.html) | Learn from zero to GPT, full YouTube course |
| nanoGPT (code) | [github.com/karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | Train your own GPT, 600 lines, 3 min on GPU |
| build-nanogpt | [github.com/karpathy/build-nanogpt](https://github.com/karpathy/build-nanogpt) | Build GPT commit by commit from empty file |
| llm.c | [github.com/karpathy/llm.c](https://github.com/karpathy/llm.c) | GPT-2 in pure C, no frameworks, $20 for full 124M |
| LitGPT | [github.com/Lightning-AI/litgpt](https://github.com/Lightning-AI/litgpt) | 20+ architectures, production-ready |
| HuggingFace LLM Course | [huggingface.co/learn/llm-course](https://huggingface.co/learn/llm-course/en/chapter7/6) | Full course with code, train from scratch |
| Attention Is All You Need | [arxiv.org/abs/1706.03762](https://arxiv.org/abs/1706.03762) | The original Transformer paper (15 pages) |
| paper2code skill | [github.com/PrathamLearnsToCode/paper2code](https://github.com/PrathamLearnsToCode/paper2code) | Convert any arxiv paper → working code |
| Modal.com | [modal.com](https://modal.com) | Serverless GPU, $30/mo free, A100 per-second billing |
| HuggingFace Models | [huggingface.co/models](https://huggingface.co/models) | Download pre-trained weights (the "GitHub of weights") |
| AndroidSemanticSearch | [github.com/hissain/AndroidSemanticSearch](https://github.com/hissain/AndroidSemanticSearch) | On-device vector search demo (ObjectBox + MiniLM) |
| On-Device RAG guide | [medium.com (Google Dev Expert)](https://medium.com/google-developer-experts/on-device-rag-for-app-developers-embeddings-vector-search-and-beyond-47127e954c24) | Full pipeline for local embeddings + search |
| EmbeddingGemma | [developers.googleblog.com](https://developers.googleblog.com/introducing-embeddinggemma/) | Google's on-device embedding model (300M, 100+ langs) |
| LiteRT-LM | [github.com/google-ai-edge/LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM) | On-device LLM inference with tool calling |
| ai-edge-torch | [github.com/google-ai-edge/ai-edge-torch](https://github.com/google-ai-edge/ai-edge-torch) | Convert PyTorch models to LiteRT |
| Keras → Android tutorial | [medium.com/geekculture](https://medium.com/geekculture/train-ml-model-and-build-android-application-using-tensorflow-lite-keras-6bf23d07309a) | Full walkthrough: train → convert → deploy |
| PokeClaw | [github.com/agents-io/PokeClaw](https://github.com/agents-io/PokeClaw) | Gemma 4 autonomous phone control via Accessibility |

## Tool Calling = Just Weights
Not special software. Fine-tuned weights that learned to generate <tool_call> tokens.
Train your own: create dataset × thousands of examples → fine-tune on Modal ($5-50).

## llm.c Clarification
llm.c is TRAINING code (produces weights), NOT pre-trained weights you download.
You compile it, feed data, it trains → outputs weights. Pure C, no Python.

## MemoryGraph IDs
- This pipeline: 6dd05ae5-65ae-46e0-b9eb-dedf21af9d38
- BUILDS → MainAI: fef401b5-3939-4c24-8009-810cdc1a262f
- RELATED_TO → Gemma 4 ecosystem: 4440d844-e276-4bbe-9cb6-59c3ffa5bf23
- RELATED_TO → Weights portability: 7a4a6c15-bc7a-4761-b794-1330a76751ae
- RELATED_TO → LiteRT/ONNX deep dive: 2c22e81d-dbc3-423d-aaf4-eec184b6fa25
