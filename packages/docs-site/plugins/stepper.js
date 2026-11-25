// The stepper's behavior (components/stepper.js) as a UI SDK primitive: which step is open, the
// dots and the panels that follow it, the arrow keys, and what an agent can do with it. The agent
// bridge of plugins/ui-sdk.js finds every primitive on the page, so an agent sees the stepper in its
// snapshot ("stepper: value 2") and moves it with act: setValue(3), next(), previous(). Nobody
// writes a tool for it: the `agent` key below is the whole agent API.
//
// UI SDK could draw this with its own elements: ui-tabs has a tab list, tabs, panels and the arrow
// keys. The stepper is built with definePrimitive on purpose, as the example of a component of our
// own that UI SDK doesn't ship (a terminal, a board, the glossary as a table) and that joins the
// bridge the same way: declare its state and its actions once, and the mouse, the keyboard and an
// agent use them alike.
//
// The imports are files of the same UI SDK version that the ui-* elements load (the import map of
// site.js), so the page keeps one copy of @ui-sdk/core: with two, the bridge doesn't see this one.
import { definePrimitive } from "@ui-sdk/core/primitive";
import { createChange } from "@ui-sdk/core/input-source";
import { createParts, wrappedButton } from "@ui-sdk/web/define-element";

/** The step a stepper starts at, or one it is asked for, as a whole number from 1 to `count`. */
function stepOf(value, count) {
  const step = Number(value);
  if (!Number.isInteger(step) || step < 1 || step > count) {
    throw new Error(`No step ${JSON.stringify(value)}: this stepper has steps 1 to ${count}.`);
  }
  return step;
}

export const stepperPrimitive = definePrimitive({
  name: "stepper",
  options: { count: "number", defaultValue: "number", onValueChange: "callback" },
  state: (options) => ({ value: options.defaultValue ?? 1, count: options.count ?? 1 }),
  sync: (options) => (options.count ? { count: options.count } : {}),
  controlled: ["value"],
  api: (context) => {
    const change = createChange(context);
    const count = () => context.store.get().count;
    const current = () => context.store.get().value;
    const setValue = (step, event) => change("value", stepOf(step, count()), { reason: event ? "item-press" : "agent", event });
    return {
      setValue,
      next: (event) => current() < count() && setValue(current() + 1, event),
      previous: (event) => current() > 1 && setValue(current() - 1, event),
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "group",
      // A link to a step's heading (from "On this page" or the search) opens that step.
      bind: (el, part) => {
        const follow = () => {
          const id = new URLSearchParams(location.hash.split("?")[1] ?? "").get("id");
          const heading = id && document.getElementById(id);
          const panel = heading && el.contains(heading) && heading.closest("as-stepper-panel");
          if (!panel) return;
          part.api.setValue(panel.getAttribute("value"));
          requestAnimationFrame(() => heading.scrollIntoView());
        };
        addEventListener("hashchange", follow);
        return () => removeEventListener("hashchange", follow);
      },
    }),
    list: slot({
      role: "tablist",
      keys: ["ArrowLeft", "ArrowRight", "Home", "End"],
      on: {
        keydown: (event, { el, api, store }) => {
          const tabs = [...el.querySelectorAll('[role="tab"]')];
          const now = store.get().value;
          const to = { ArrowRight: (now % tabs.length) + 1, ArrowLeft: ((now + tabs.length - 2) % tabs.length) + 1, Home: 1, End: tabs.length }[event.key];
          if (!to) return;
          event.preventDefault();
          api.setValue(to, event);
          tabs[to - 1].focus();
        },
      },
    }),
    tab: slot({
      role: "tab",
      focus: "roving",
      props: { value: "number" },
      press: ({ api, props }, event) => api.setValue(props.value, event),
      attrs: (state, { id, props }) => ({
        type: "button",
        id: `${id}-tab-${props.value}`,
        "aria-selected": String(state.value === props.value),
        "aria-controls": `${id}-panel-${props.value}`,
        tabindex: state.value === props.value ? "0" : "-1",
        "data-done": props.value < state.value ? "" : undefined,
      }),
    }),
    panel: slot({
      role: "tabpanel",
      props: { value: "number" },
      attrs: (state, { id, props }) => ({
        id: `${id}-panel-${props.value}`,
        "aria-labelledby": `${id}-tab-${props.value}`,
        hidden: state.value === props.value ? undefined : "",
      }),
    }),
    previous: slot({
      role: "button",
      focus: "native",
      press: ({ api }, event) => api.previous(event),
      attrs: (state) => ({ type: "button", disabled: state.value === 1 ? "" : undefined }),
    }),
    next: slot({
      role: "button",
      focus: "native",
      press: ({ api }, event) => api.next(event),
      attrs: (state) => ({ type: "button", disabled: state.value === state.count ? "" : undefined }),
    }),
    status: slot({
      bind: (el, part) => {
        const show = () => {
          const { value, count } = part.store.get();
          el.textContent = `Paso ${value} de ${count}`;
        };
        show();
        return part.store.subscribe(show);
      },
    }),
  }),
  // What an agent can do: go to a step, or one forward or back. The bridge would guess these three
  // from their names alone (set…, next, previous); the key says it, and keeps any other method out.
  agent: { actions: ["setValue", "next", "previous"] },
});

/** The stepper's elements; components/stepper.js draws them. */
export function defineStepper() {
  if (customElements.get("as-stepper")) return;
  createParts(stepperPrimitive, {
    root: "as-stepper",
    list: "as-stepper-list",
    tab: { tag: "as-stepper-tab", target: wrappedButton, display: "contents" },
    panel: "as-stepper-panel",
    previous: { tag: "as-stepper-previous", target: wrappedButton, display: "contents" },
    next: { tag: "as-stepper-next", target: wrappedButton, display: "contents" },
    status: "as-stepper-status",
  });
}
