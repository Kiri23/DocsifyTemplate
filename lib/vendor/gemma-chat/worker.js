/**
 * Gemma 4 E2B — WebGPU Web Worker with Tool Calling
 * Uses Gemma4ForConditionalGeneration + AutoProcessor.
 * Detects <tool_call> tokens in output and routes to main thread for execution.
 */
import {
  AutoProcessor,
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

// ── Model Pipeline ──────────────────────────────────────────

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

// ── Tool Call Parsing ───────────────────────────────────────

function parseToolCalls(text) {
  // Gemma 4 outputs tool calls as special tokens that get stripped by TextStreamer.
  // After stripping, the output looks like: call:FUNCTION_NAME{key:value,...}
  // We handle both the raw (stripped) and wrapped formats.
  const calls = [];
  let match;

  // Pattern 0: Stripped format (special tokens removed by TextStreamer)
  // Matches: call:scroll_to_section{heading:Next steps}
  const strippedPattern = /\bcall:(\w+)\{([^}]*)\}/g;
  while ((match = strippedPattern.exec(text)) !== null) {
    try {
      const argsStr = match[2].replace(/<\|"\|>/g, '"');
      // Try JSON parse first (handles quoted values)
      const args = JSON.parse('{' + argsStr.replace(/(\w+):/g, '"$1":').replace(/:([^",}\]]+)/g, ':"$1"') + '}');
      calls.push({ name: match[1], args });
    } catch {
      // Fallback: key:value pairs
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

  // If Pattern 0 found matches, skip other patterns (avoid duplicates)
  if (calls.length > 0) return calls;

  // Pattern 1: Gemma native format (with special token delimiters intact)
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

  // Pattern 2: JSON tool call format (model might generate this)
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

async function generate(messages) {
  const [processor, model] = await TextGenerationPipeline.getInstance();

  const chatMessages = messages.map(m => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));

  const prompt = processor.apply_chat_template(chatMessages, {
    enable_thinking: false,
    add_generation_prompt: true,
    tools: TOOLS,
  });

  const inputs = await processor(prompt, null, null, {
    add_special_tokens: false,
  });

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

  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  self.postMessage({ status: "start" });

  try {
    await model.generate({
      ...inputs,
      do_sample: false,
      max_new_tokens: 1024,
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    });
  } catch (e) {
    self.postMessage({ status: "error", data: e.toString() });
    return;
  }

  // Check for tool calls in the output
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

async function load() {
  self.postMessage({ status: "loading", data: "Loading Gemma 4 E2B..." });

  try {
    const [processor, model] = await TextGenerationPipeline.getInstance((x) => {
      self.postMessage(x);
    });

    self.postMessage({ status: "loading", data: "Compiling shaders..." });

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

// ── Message Handler ─────────────────────────────────────────

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

// Export for reference by main thread
self.TOOL_DEFINITIONS = TOOLS;
