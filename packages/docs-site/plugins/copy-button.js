// El botón de copiar del sitio como primitivo de UI SDK: una persona hace clic y copia al
// portapapeles; un agente lo ve en snapshot ("copy-button") y llama act({ action: "copy" }), que
// además devuelve el texto copiado para que funcione incluso en un navegador headless sin
// portapapeles compartido. Lo dibujan code-window.js, terminal.js, components/pr/diff.js y
// components/pr/example.js.
import { definePrimitive } from "@ui-sdk/core/primitive";
import { createChange } from "@ui-sdk/core/input-source";
import { createParts, wrappedButton } from "@ui-sdk/web/define-element";

const RESET_MS = 1600;

export const copyButtonPrimitive = definePrimitive({
  name: "copy-button",
  options: { text: "value" },
  // `status` (y no `value`) para que UI SDK no lo retenga como campo de formulario offPage al
  // cambiar de página en Docsify.
  state: () => ({ status: "idle" }),
  api: (context) => {
    const change = createChange(context);
    let timer;
    let readText = () => context.options().text ?? "";
    const scheduleReset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => change("status", "idle", { reason: "reset" }), RESET_MS);
    };
    const copy = (event) => {
      const text = String(readText() ?? "");
      change("status", "copied", { reason: event ? "press" : "agent", event });
      scheduleReset();
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          // Si falla el portapapeles al clic humano, el botón lo avisa; al agente igual le vuelve `text`.
          if (event) change("status", "failed", { reason: "clipboard-error", event });
        });
      }
      return text;
    };
    return {
      copy,
      internal: {
        setReader(fn) {
          readText = fn;
        },
        clearTimer() {
          clearTimeout(timer);
        },
      },
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "button",
      focus: "native",
      press: ({ api }, event) => api.copy(event),
      attrs: (state) => ({
        type: "button",
        "aria-live": "polite",
        "data-copied": state.status === "copied" ? "" : undefined,
      }),
      bind: (el, part) => {
        const host = el.closest("as-copy-button");
        // El target es el <button> interno: copiamos el aria-label del host si el botón no lo trae,
        // para que snapshot() y los lectores de pantalla distingan cada bloque por su etiqueta.
        const hostLabel = host?.getAttribute("aria-label");
        if (hostLabel && !el.hasAttribute("aria-label")) el.setAttribute("aria-label", hostLabel);
        part.api.internal.setReader(() =>
          host?.text ??
          part.options?.().text ??
          host?.getAttribute("data-copy") ??
          el.closest(".window")?.querySelector("pre")?.textContent ??
          ""
        );
        const show = () => {
          const { status } = part.store.get();
          el.textContent = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy";
        };
        show();
        const stop = part.store.subscribe(show);
        return () => {
          stop();
          part.api.internal.clearTimer();
        };
      },
    }),
  }),
  // Lo único que el agente puede disparar en este botón: copiar y recibir el texto copiado.
  agent: { actions: ["copy"] },
});

/** Registra `<as-copy-button>`; plugins/ui-sdk.js lo llama antes de crear el agente. */
export function defineCopyButton() {
  if (customElements.get("as-copy-button")) return;
  createParts(copyButtonPrimitive, {
    root: { tag: "as-copy-button", target: wrappedButton, display: "contents" },
  });
}
