# Session Log — 2026-04-20
**Branch:** `explore/custom-elements-v2`
**PR:** #22

---

## Cómo empezó — Claude Design

La sesión empezó investigando **Claude Design** (Anthropic Labs). El insight no fue sobre el producto en sí — fue sobre el patrón arquitectónico detrás:

> *Claude (el modelo) = engine. Canva / PPTX / Claude Code handoff = adapters.*

Anthropic construyó la inteligencia de diseño como engine y los outputs son adaptadores intercambiables. El mismo patrón que React:

- `react` = reconciler (engine)
- `react-dom` = adapter para browser
- `react-native` = adapter para móvil

**La validación**: Christian había llegado a este mismo patrón — engine/transport — por primeros principios. Claude Design lo valida con millones de dólares. React lo valida con 20 millones de developers. LLVM, Pandoc, unified — todos el mismo patrón.

> *No estás loco. Estás pensando como la gente que construye las herramientas que todos los demás usan.*

---

## Por qué lanzamos a Web Components

PR #22 existía para explorar Custom Elements. La pregunta era: ¿qué desbloquea para el producto?

**El problema que resolvía:** el patrón anterior requería el lifecycle de Docsify para montar componentes:

```
YAML → placeholder div → Docsify doneEach → mountAll() → Preact
                                ↑ acoplado a Docsify
```

**La solución — Custom Elements:**

```
YAML → <entity-schema data-props="..."> → browser connectedCallback → Preact
              ↑ HTML válido en cualquier contexto
```

El browser mismo es el adaptador. `connectedCallback` dispara cuando el tag llega al DOM — no importa quién lo puso ahí (Docsify, Astro, plain HTML).

**Lo que esto significó para el producto:** dejamos de ser "un plugin de Docsify" y nos convertimos en un engine que funciona en cualquier framework.

Probado en `test/no-docsify-demo.html` — componente montado con zero Docsify, zero framework, solo un `<script>` tag.

---

## Lo que aprendimos sobre cómo los grandes diseñan así

**GitHub** usa Custom Elements en producción desde 2014. Razón: el framework cambia, el browser no. Cuando migraron de jQuery, los elementos sobrevivieron.

**YouTube** construyó toda su UI con Custom Elements.

**React 19** adoptó Custom Elements como ciudadano de primera clase — Meta validó el bet.

**Preact tiene `preact-custom-element`** — un paquete oficial que hace exactamente lo que necesitábamos: `register(Component, 'tag', ['observedAttrs'])`.

**El patrón común:** Custom Elements = punto de entrada (browser standard). El engine de reactividad (Preact, Lit, React) vive adentro. Nadie lo ve desde afuera.

---

## Los beneficios concretos que logramos

### 1. Componentes son pure functions — nunca tocan el renderer

```js
function EntitySchema({ data }) {
  return html`<div>${data.name}</div>`
}
// Zero conocimiento de Custom Elements, Docsify, o mounting strategy
```

Para cambiar Preact por React: reescribes `defineCustomElements`. Los componentes nunca cambian.

### 2. `withJsonProps` — el bridge invisible

HTML attributes son siempre strings. YAML genera objetos complejos. `withJsonProps` parsea el JSON blob antes de que el componente lo vea:

```
HTML:  data-props='{"name":"User","fields":[...]}'   ← string
       ↓ withJsonProps
Preact: { data: { name: "User", fields: [...] } }    ← objeto
```

El componente nunca sabe que vino de un string.

### 3. El DAG quedó limpio

```
components/         ← pure Preact functions, zero deps externos
core/               ← pure functions (markdown-transform, registry, config)
serializers/        ← text output (latex, typst, markdown)
custom-elements.js  ← bridge components ↔ browser
adapters/           ← única capa que conoce Docsify/Astro
```

Cada capa solo conoce la capa de abajo. Nunca hacia arriba.

### 4. Dead code eliminado

Removidos: `renderers/preact.js`, `renderers/index.js`, `adapters/react/`, `adapters/vue/`, `DocsComponent.astro` — 181 líneas de patrón viejo.

El patrón `createPlaceholder → mountAll` está completamente reemplazado.

### 5. Package renombrado

`packages/docsify-plugin/` → `packages/docs-engine/` — el nombre ahora refleja lo que realmente es: un engine de documentación agnóstico al framework.

---

## El insight más importante de la sesión

> *El renderer se pasa al callback del Custom Element — los componentes nunca tienen que cambiar.*

Este es el momento donde el engine quedó verdaderamente desacoplado. El Custom Element es la interfaz pública. Lo que vive adentro (Preact hoy, React mañana) es un detalle de implementación.

---

## Próximos pasos

- **CSS fix pendiente**: `display: block` en custom elements — el code block tiene un offset visual y el copy button se solapa. El fix está en theme.css pero no funcionó — investigar por qué.
- **Verificar Docsify**: confirmar que los componentes YAML siguen renderizando correctamente en `docs/` con el nuevo adapter (sin `renderer.mountAll()`).
- **Astro adapter**: `remark-components.js` y `rehype-components.js` siguen funcionando — verificar contra proyecto Astro real.
- **Merge PR #22** cuando CSS esté resuelto.
