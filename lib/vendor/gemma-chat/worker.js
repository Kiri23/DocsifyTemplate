/**
 * Gemma 4 E2B — WebGPU Web Worker
 * Uses Gemma4ForConditionalGeneration + AutoProcessor (not CausalLM).
 * Streams tokens back to the main thread.
 */
import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4";

class TextGenerationPipeline {
  static model_id = "onnx-community/gemma-4-E2B-it-ONNX";

  static async getInstance(progress_callback = null) {
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= Gemma4ForConditionalGeneration.from_pretrained(this.model_id, {
      dtype: "q4f16",
      device: "webgpu",
      use_external_data_format: true,
      progress_callback,
    });

    return Promise.all([this.processor, this.model]);
  }
}

const stopping_criteria = new InterruptableStoppingCriteria();

async function generate(messages) {
  const [processor, model] = await TextGenerationPipeline.getInstance();

  // Build chat prompt (text-only, no images/audio)
  const chatMessages = messages.map(m => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));

  const prompt = processor.apply_chat_template(chatMessages, {
    enable_thinking: false,
    add_generation_prompt: true,
  });

  const inputs = await processor(prompt, null, null, {
    add_special_tokens: false,
  });

  let startTime;
  let numTokens = 0;
  let tps;

  const token_callback_function = () => {
    startTime ??= performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
  };

  const callback_function = (output) => {
    self.postMessage({ status: "update", output, tps, numTokens });
  };

  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  self.postMessage({ status: "start" });

  const outputs = await model.generate({
    ...inputs,
    do_sample: false,
    max_new_tokens: 1024,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true,
  });

  self.postMessage({ status: "complete" });
}

async function check() {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("WebGPU not supported (no adapter)");
  } catch (e) {
    self.postMessage({ status: "error", data: e.toString() });
  }
}

async function load() {
  self.postMessage({ status: "loading", data: "Loading Gemma 4 E2B..." });

  try {
    const [processor, model] = await TextGenerationPipeline.getInstance((x) => {
      self.postMessage(x);
    });

    self.postMessage({ status: "loading", data: "Compiling shaders..." });

    // Warm up with dummy input
    const prompt = processor.apply_chat_template(
      [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      { enable_thinking: false, add_generation_prompt: true }
    );
    const inputs = await processor(prompt, null, null, { add_special_tokens: false });
    await model.generate({ ...inputs, max_new_tokens: 1 });

    self.postMessage({ status: "ready" });
  } catch (e) {
    self.postMessage({ status: "error", data: e.toString() });
  }
}

self.addEventListener("message", async (e) => {
  const { type, data } = e.data;
  switch (type) {
    case "check":
      check();
      break;
    case "load":
      load();
      break;
    case "generate":
      stopping_criteria.reset();
      generate(data);
      break;
    case "interrupt":
      stopping_criteria.interrupt();
      break;
    case "reset":
      stopping_criteria.reset();
      break;
  }
});
