---
name: PyImageSearch tutorial index
description: 774 tutorials indexed. Sitemap at aiDocs/pyimagesearch/SITEMAP_URLS.txt. Search with grep to find tutorials on any ML/CV topic before crawling.
type: reference
---

# PyImageSearch Tutorial Reference

## How to search for tutorials

```bash
# Search the sitemap for any topic
grep -i "embedding" /storage/emulated/0/Documents/aiDocs/pyimagesearch/SITEMAP_URLS.txt
grep -i "transformer" /storage/emulated/0/Documents/aiDocs/pyimagesearch/SITEMAP_URLS.txt
grep -i "onnx" /storage/emulated/0/Documents/aiDocs/pyimagesearch/SITEMAP_URLS.txt
```

## How to crawl a tutorial

```bash
curl -s -X POST "http://crawl.core.internal/crawl" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["URL_HERE"], "priority": 10}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['results'][0]['markdown'])" \
  > /storage/emulated/0/Documents/aiDocs/pyimagesearch/SLUG.md
```

Note: crawl4ai uses HTTP (not HTTPS) at `http://crawl.core.internal/crawl`. Response is `results[0].markdown`.

## Files
- Sitemap index: `/storage/emulated/0/Documents/aiDocs/pyimagesearch/SITEMAP_URLS.txt` (774 URLs)
- Crawled tutorials: `/storage/emulated/0/Documents/aiDocs/pyimagesearch/*.md`
- Sitemap URL: `https://pyimagesearch.com/post-sitemap.xml`

## Already crawled (13 tutorials)
- DeepSeek-V3 series (4 parts): theory, MLA, MoE, multi-token prediction
- Embeddings + vector search (3 parts): TF-IDF vs embeddings, FAISS, Ollama RAG
- On-device: SmolVLM in browser, local LLMs at edge
- Deployment: PyTorch → ONNX → FastAPI
- KV-cache optimization (2 parts)
- Siamese networks (Keras/TF)

## Key topics covered (grep-able)
ML fundamentals, deep learning, CNN, RNN, transformer, attention, embeddings, vector search, FAISS, RAG, ONNX, deployment, YOLO, SAM, DeepSeek, Qwen, siamese networks, contrastive learning, GAN, object detection, image segmentation, pose estimation, OCR, face detection, OpenCV
