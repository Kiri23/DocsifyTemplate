---
name: Termux ML blockers — what doesn't work locally and workarounds
description: PyTorch, ONNX Runtime, numpy all fail in native Termux. Documented blockers, root causes, and the working alternatives (HF API, proot Ubuntu, VPS).
type: feedback
---

## Termux ML Stack: What Fails and Why

### What DOESN'T work in native Termux (April 2026)

| Package | Blocker | Root cause |
|---|---|---|
| **PyTorch** | `pkg install python-torch` broken (symbol errors), pip build takes 1+ week | Bionic libc + non-standard linker |
| **ONNX Runtime** | No prebuilt wheel for android/aarch64, pip rejects manylinux wheel | Platform tag mismatch |
| **numpy** | Termux prebuilt needs Python 3.13, we have 3.12. Source build fails (meson/ninja chain) | Python version mismatch + build toolchain |
| **sentence-transformers** | Depends on PyTorch | Transitive dependency |
| **Transformers.js v4 (Node)** | Hard-requires `onnxruntime-node` which has no Android ARM64 binaries | No native bindings |

### What DOES work

| Package | How |
|---|---|
| **tokenizers** | `pip install tokenizers` — needed `maturin` built from cargo first (`unset LD_PRELOAD && cargo install maturin --no-default-features`) |
| **huggingface_hub** | `pip install huggingface_hub` — pure Python, works fine |
| **maturin** | Built from cargo after unsetting LD_PRELOAD (linker namespace fix) |

### Working alternatives for ML inference

| Path | How | From Claude Code? |
|---|---|---|
| **HF Inference API** | `curl` with HF token from Doppler (`global/dev_huggingface/ACCESS_TOKEN`) | **YES** — proven working |
| **proot-distro Ubuntu** | `proot-distro login ubuntu` then `pip install onnxruntime sentence-transformers` | **NO** — can't nest proot (Claude Code already runs in proot) |
| **VPS (Ollama)** | Run embedding models on VPS, call via HTTP | **YES** |
| **Browser (Transformers.js)** | WebGPU works in Chrome for inference | **YES** (via DocsifyTemplate) |

### The maturin/tokenizers fix (for future reference)

```bash
# The LD_PRELOAD fix is key — Termux's libtermux-exec-ld-preload.so breaks cargo build-scripts
unset LD_PRELOAD
cargo install maturin --no-default-features  # ~5 min
export PATH="$HOME/.cargo/bin:$PATH"
pip install tokenizers  # now works
```

**Why:** Cargo build-scripts are ELF executables that can't access the Termux LD_PRELOAD library from the default linker namespace. Unsetting LD_PRELOAD fixes the namespace error.

**How to apply:** Whenever building Rust-based Python packages in Termux, unset LD_PRELOAD first.

### HF Token location
- Doppler: project `global`, config `dev_huggingface`, key `ACCESS_TOKEN`
- Fetch: `doppler secrets get ACCESS_TOKEN --plain -p global -c dev_huggingface`

### HF Embedding API endpoint (working, April 2026)
```
POST https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction
Authorization: Bearer $HF_TOKEN
Body: {"inputs": ["text1", "text2"], "options": {"wait_for_model": true}}
→ Returns: array of 384-dim float vectors
```

### Storage audit (April 2026)
- Termux prefix: 5.9 GB
- Cargo cache: 1.2 GB (cleanable)
- Phone: 228 GB total, 139 GB free — no storage concern
