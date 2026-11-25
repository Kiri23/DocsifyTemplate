// UI SDK (ui-sdk.dev, Apache-2.0) on the site: it registers the `ui-*` elements that the views of
// the components draw (components/pr/) and creates the agent bridge, so an AI agent can read the
// page's components and use them (open a decision, switch the diffs to unified) through three
// tools: snapshot, query and act. A fourth tool, `read`, gives the agent the prose of the page,
// which UI SDK's snapshot doesn't carry (plugins/page-text.js). It sits next to UI SDK's agent,
// in an object of its own: the library's object stays as UI SDK made it.
//
// site.js imports this before Docsify starts: the bridge hears each component as it is made, so it
// has to exist before the first page is drawn. Every @ui-sdk module comes from the import map of
// site.js, with the same version and the same copy of @ui-sdk/core: with two copies the bridge
// sees no components (its snapshot comes back empty).
import "@ui-sdk/web/accordion";
import "@ui-sdk/web/collapsible";
import "@ui-sdk/web/segmented-control";
import "@ui-sdk/web/hover-card";
import { createAgent, registerTools } from "@ui-sdk/web/agent";
import { defineStepper } from "./stepper.js";
import { pageText, readTool } from "./page-text.js";

/**
 * A docs page changes nothing that can't be undone: the agent may open, close and switch views.
 * A site can pass its own `allow` (for example, to ask the reader first).
 * @param {{ allow?: (step: object) => boolean | Promise<boolean> }} [options]
 */
export function uiSdk({ allow = () => true } = {}) {
  // Our own primitives, next to UI SDK's elements: the bridge sees them alike.
  defineStepper();
  const agent = createAgent({ allow });
  const read = readTool();
  // For an agent that drives the browser (Playwright, an extension, agente/pagina_mcp.py): UI SDK's
  // agent as it is, and the page's `read` with its description beside it.
  window.agent = agent;
  window.pageText = { read: read.run, tool: read.tool };
  // WebMCP: a browser that has an agent of its own gets the four tools. `read` registers the way
  // UI SDK's registerTools registers its three (test/pr_agente.py checks it with a fake browser).
  const context = document.modelContext;
  if (context) {
    registerTools(agent, { allow });
    context.registerTool?.({
      ...read.tool,
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: (input) => read.run(input),
    })?.catch?.(() => {});
  }
  return pageText(read);
}
