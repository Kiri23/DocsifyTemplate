/**
 * LLM Chat Worker — WebGPU inference with tool calling.
 * Supports multiple models via dynamic config from main thread.
 * Detects tool_call tokens in output and routes to main thread for execution.
 */
import {
  AutoProcessor,
  AutoTokenizer,
  AutoModelForCausalLM,
  Gemma4ForConditionalGeneration,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4";

// ── Tool Definitions (sent to model in system prompt) ────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "export_page",
      description: "Export the current documentation page to a file. Use when the user asks to export, download, or save the page as PDF, LaTeX, or Markdown.",
      parameters: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["pdf", "latex-branded", "markdown"],
            description: "The export format",
          },
        },
        required: ["format"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Navigate to a different documentation page. Use when the user asks to go to, open, or show a specific page or section.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The page path from the sidebar, e.g. /content/guide/getting-started",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "switch_tab",
      description: "Switch between Quick Start and Technical Reference tabs on the current page. Use when the user asks to see the technical view, quick start, or switch tabs.",
      parameters: {
        type: "object",
        properties: {
          tab: {
            type: "string",
            enum: ["quick-start", "technical"],
            description: "Which tab to switch to",
          },
        },
        required: ["tab"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_docs",
      description: "Search across all documentation pages. Use when the user asks to find, search, or look up something across the docs.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_component",
      description: "Generate a YAML code fence component for the documentation. Use when the user asks to create, add, or build a card grid, API endpoint, status flow, entity schema, config example, step guide, side-by-side comparison, file tree, or directive table.",
      parameters: {
        type: "object",
        properties: {
          component: {
            type: "string",
            enum: ["card-grid", "api-endpoint", "status-flow", "entity-schema", "config-example", "step-type", "side-by-side", "file-tree", "directive-table"],
            description: "The component type to generate",
          },
          description: {
            type: "string",
            description: "What the user wants the component to contain",
          },
        },
        required: ["component", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scroll_to_section",
      description: "Scroll to a specific heading or section on the current page. Use when the user asks to go to a section, jump to a heading, or show a specific part.",
      parameters: {
        type: "object",
        properties: {
          heading: {
            type: "string",
            description: "The heading text to scroll to",
          },
        },
        required: ["heading"],
      },
    },
  },
];

// ── Model Pipeline (dynamic) ─────────────────────────────────

let currentProcessor = null;
let currentModel = null;
let currentModelId = null;

// Model class map: architecture string → import class
const MODEL_CLASSES = {
  'gemma4': Gemma4ForConditionalGeneration,
  'causal-lm': AutoModelForCausalLM,
};

async function loadModel(config, progress_callback) {
  const ModelClass = MODEL_CLASSES[config.architecture || 'causal-lm'];

  // Multimodal models (gemma4) use AutoProcessor; text-only use AutoTokenizer
  if (config.architecture === 'gemma4') {
    currentProcessor = await AutoProcessor.from_pretrained(config.id, {
      progress_callback,
    });
  } else {
    currentProcessor = await AutoTokenizer.from_pretrained(config.id, {
      progress_callback,
    });
  }

  currentModel = await ModelClass.from_pretrained(config.id, {
    dtype: config.dtype || 'q4f16',
    device: 'webgpu',
    use_external_data_format: config.useExternalData !== false,
    progress_callback,
  });

  currentModelId = config.id;
  return [currentProcessor, currentModel];
}

const stopping_criteria = new InterruptableStoppingCriteria();

// ── Tool Call Parsing ───────────────────────────────────────

function parseToolCalls(text) {
  const calls = [];
  let match;

  // Pattern 0: Stripped format (special tokens removed by TextStreamer)
  const strippedPattern = /\bcall:(\w+)\{([^}]*)\}/g;
  while ((match = strippedPattern.exec(text)) !== null) {
    try {
      const argsStr = match[2].replace(/<\|"\|>/g, '"');
      const args = JSON.parse('{' + argsStr.replace(/(\w+):/g, '"$1":').replace(/:([^",}\]]+)/g, ':"$1"') + '}');
      calls.push({ name: match[1], args });
    } catch {
      const args = {};
      match[2].split(',').forEach(pair => {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1) return;
        const k = pair.slice(0, colonIdx).trim().replace(/<\|"\|>/g, '');
        const v = pair.slice(colonIdx + 1).trim().replace(/<\|"\|>/g, '');
        if (k && v) args[k] = v;
      });
      calls.push({ name: match[1], args });
    }
  }

  if (calls.length > 0) return calls;

  // Pattern 1: Gemma native format (with special token delimiters)
  const nativePattern = /<\|tool_call>call:(\w+)\{([^}]*)\}<tool_call\|>/g;
  while ((match = nativePattern.exec(text)) !== null) {
    try {
      const argsStr = match[2].replace(/<\|"\|>/g, '"');
      const args = JSON.parse('{' + argsStr + '}');
      calls.push({ name: match[1], args });
    } catch {
      const args = {};
      match[2].split(',').forEach(pair => {
        const [k, v] = pair.split(':').map(s => s.trim().replace(/<\|"\|>/g, ''));
        if (k && v) args[k] = v;
      });
      calls.push({ name: match[1], args });
    }
  }

  // Pattern 2: JSON tool call format
  const jsonPattern = /```tool_call\s*\n?([\s\S]*?)\n?```/g;
  while ((match = jsonPattern.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      calls.push({ name: parsed.name || parsed.function, args: parsed.args || parsed.arguments || parsed.parameters || {} });
    } catch {}
  }

  // Pattern 3: Inline JSON function call
  const inlinePattern = /\{"(?:tool_call|function_call|name)":\s*"(\w+)"[^}]*"(?:args|arguments|parameters)":\s*(\{[^}]+\})\s*\}/g;
  while ((match = inlinePattern.exec(text)) !== null) {
    try {
      calls.push({ name: match[1], args: JSON.parse(match[2]) });
    } catch {}
  }

  return calls;
}

// ── Generation ──────────────────────────────────────────────

async function generate(messages, config) {
  if (!currentProcessor || !currentModel) {
    self.postMessage({ status: "error", data: "Model not loaded" });
    return;
  }

  const isMultimodal = config && config.architecture === 'gemma4';

  const templateOpts = {
    add_generation_prompt: true,
  };
  if (isMultimodal) templateOpts.enable_thinking = false;
  if (config && config.nativeToolCalling) templateOpts.tools = TOOLS;

  let inputs;
  if (isMultimodal) {
    // Gemma4: messages need {type:"text", text:...} content format
    const chatMessages = messages.map(m => ({
      role: m.role,
      content: [{ type: "text", text: m.content }],
    }));
    const prompt = currentProcessor.apply_chat_template(chatMessages, templateOpts);
    inputs = await currentProcessor(prompt, null, null, { add_special_tokens: false });
  } else {
    // Text-only: apply_chat_template → string prompt → tokenize
    const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
    templateOpts.tokenize = false;
    const prompt = currentProcessor.apply_chat_template(chatMessages, templateOpts);
    inputs = currentProcessor(prompt);
  }

  let startTime;
  let numTokens = 0;
  let tps;
  let fullOutput = '';

  const token_callback_function = () => {
    startTime ??= performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
  };

  const callback_function = (output) => {
    fullOutput += output;
    self.postMessage({ status: "update", output, tps, numTokens });
  };

  // AutoProcessor has .tokenizer, AutoTokenizer IS the tokenizer
  const tokenizer = currentProcessor.tokenizer || currentProcessor;
  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  self.postMessage({ status: "start" });

  try {
    await currentModel.generate({
      ...inputs,
      do_sample: false,
      max_new_tokens: config?.maxNewTokens || 1024,
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    });
  } catch (e) {
    self.postMessage({ status: "error", data: e.toString() });
    return;
  }

  const toolCalls = parseToolCalls(fullOutput);
  if (toolCalls.length > 0) {
    self.postMessage({ status: "tool_calls", calls: toolCalls, rawOutput: fullOutput });
  }

  self.postMessage({ status: "complete" });
}

// ── Check / Load ────────────────────────────────────────────

async function check() {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("WebGPU not supported (no adapter)");
  } catch (e) {
    self.postMessage({ status: "error", data: e.toString() });
  }
}

// Stored config for current model (used in generate)
let activeConfig = null;

async function load(config) {
  const label = config.label || config.id;
  self.postMessage({ status: "loading", data: `Loading ${label}...` });

  try {
    const [processor, model] = await loadModel(config, (x) => {
      self.postMessage(x);
    });

    self.postMessage({ status: "loading", data: "Compiling shaders..." });

    // Warm-up: build a tiny prompt and generate 1 token to compile shaders
    const isMultimodal = config.architecture === 'gemma4';
    let inputs;
    if (isMultimodal) {
      const warmupMsg = [{ role: "user", content: [{ type: "text", text: "hi" }] }];
      const prompt = processor.apply_chat_template(warmupMsg, { enable_thinking: false, add_generation_prompt: true });
      inputs = await processor(prompt, null, null, { add_special_tokens: false });
    } else {
      const warmupMsg = [{ role: "user", content: "hi" }];
      const prompt = processor.apply_chat_template(warmupMsg, { tokenize: false, add_generation_prompt: true });
      inputs = processor(prompt);
    }
    await model.generate({ ...inputs, max_new_tokens: 1 });

    activeConfig = config;
    self.postMessage({ status: "ready" });
  } catch (e) {
    self.postMessage({ status: "error", data: e.toString() });
  }
}

// ── Message Handler ─────────────────────────────────────────

self.addEventListener("message", async (e) => {
  const { type, data } = e.data;
  switch (type) {
    case "check":
      check();
      break;
    case "load":
      // data = model config object
      load(data);
      break;
    case "generate":
      stopping_criteria.reset();
      generate(data, activeConfig);
      break;
    case "interrupt":
      stopping_criteria.interrupt();
      break;
    case "reset":
      stopping_criteria.reset();
      break;
  }
});
