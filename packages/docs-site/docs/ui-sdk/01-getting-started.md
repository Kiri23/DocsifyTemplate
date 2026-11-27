# 1. Getting Started (Hello World)

Un solo componente `<ui-collapsible>` en una página HTML y un objeto `window.agent` que lo lee y lo abre. Sin frameworks, sin build, sin MCP.

> **Aclaración clave antes de empezar:** en UI SDK, **"agente" (`window.agent`) no es un modelo como Opus ni Claude Code**. Es el objeto JavaScript que vive en tu página y expone tres herramientas (`snapshot`, `query`, `act`) sobre los componentes montados. El modelo vive afuera y llama a esas herramientas.

## El archivo mínimo

Copiá este archivo con el botón `Copy` (que también es un primitivo de UI SDK: `Copy html`), guardalo como `hello.html` y abrilo en un navegador:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>UI SDK Hello World</title>
    <script type="importmap">
      {
        "imports": {
          "@ui-sdk/web/collapsible": "https://esm.sh/@ui-sdk/web@0.1.0-beta.17/collapsible?deps=@ui-sdk/core@0.1.0-beta.17",
          "@ui-sdk/web/agent": "https://esm.sh/@ui-sdk/web@0.1.0-beta.17/agent?deps=@ui-sdk/core@0.1.0-beta.17"
        }
      }
    </script>
  </head>
  <body>
    <ui-collapsible aria-label="Notas de despliegue">
      <ui-collapsible-trigger>
        <button type="button" aria-expanded="false">Notas de despliegue</button>
      </ui-collapsible-trigger>
      <ui-collapsible-panel hidden>
        Último deploy: v0.1.0-beta.17 · sin cambios de esquema · rollback listo.
      </ui-collapsible-panel>
    </ui-collapsible>

    <script type="module">
      import "@ui-sdk/web/collapsible";
      import { createAgent } from "@ui-sdk/web/agent";

      window.agent = createAgent({ allow: () => true });
    </script>
  </body>
</html>
```

Dos detalles importantes de ese archivo:

1. `createAgent({ allow: () => true })` escucha cada primitivo que se monta en la página y construye el objeto `window.agent`.
2. Los dos imports fijan el mismo `?deps=@ui-sdk/core@0.1.0-beta.17`. Si hubiera dos copias de `@ui-sdk/core` en memoria, el componente se registraría en una copia y el agente leería la otra (`snapshot()` volvería vacío `[]`).

## Probalo vivo acá mismo

El bloque de abajo monta ese mismo `<ui-collapsible>` real en esta página. Podés usar los botones, hacer clic directo en `"Notas de despliegue"`, o abrir la consola de DevTools y correr `window.agent.snapshot()` y `window.agent.act(...)` a mano:

<!-- as: ui-demo paso="hello" -->
Demo interactiva de Hello World (`--components propios/ui-sdk-demos.js`).

## Qué escribe el agente y qué contesta la página

<!-- as: terminal command="DevTools Console · window.agent" line-ms="90" exit="0" -->
```console
> window.agent.snapshot()
[{"ref":"c1","component":"collapsible","actions":["setOpen","press"],"label":"Notas de despliegue","open":false}]

> await window.agent.act({ steps: [{ ref: "Notas de despliegue", action: "setOpen", args: [true] }] })
{"ok":true,"steps":[{"step":0,"ref":"c1","changes":[{"component":"collapsible","label":"Notas de despliegue","key":"open","value":true}]}],…}

> window.agent.snapshot()
[{"ref":"c1","component":"collapsible","actions":["setOpen","press"],"label":"Notas de despliegue","open":true,"buttons":["Notas de despliegue"]}]
```

Fijate que en `act` ni siquiera hizo falta pasar `"c1"`: UI SDK resuelve el componente por su etiqueta (`"Notas de despliegue"`). Y si la persona hace clic en el botón para cerrarlo, la siguiente llamada a `window.agent.snapshot()` ya devuelve `"open": false`: persona y agente tocan exactamente el mismo estado.

En el archivo suelto `hello.html`, `snapshot()` devuelve solo `Notas de despliegue`. Acá en esta página de docs también aparecen los `copy-button` (`Copy html`, `Copy: DevTools Console · window.agent`), porque los botones de copiar del sitio son primitivos de UI SDK.
