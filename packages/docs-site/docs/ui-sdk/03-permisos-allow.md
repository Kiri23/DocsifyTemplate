# 3. Permisos con `allow`

Hasta ahora creamos el agente con `createAgent({ allow: () => true })`: todo pasa. En una app real hay acciones seguras (abrir un panel de vista previa) y acciones que querés frenar o pedirle confirmación a la persona (pasar un entorno a `produccion`).

En `@ui-sdk/core@0.1.0-beta.17`, antes de ejecutar cada paso de `act`, UI SDK llama a `allow(step)` con:

```js
{ ref, component, label, action, args }
```

- Si `allow(step)` devuelve `true` (o una `Promise<true>`), la acción se ejecuta.
- Si devuelve `false`, UI SDK **rechaza el paso sin tocar el componente** y detiene los pasos restantes de ese `act`.

```js
const guardedAgent = createAgent({
  allow: (step) => {
    if (step.label === "Entorno de deploy" && step.args?.[0] === "produccion") {
      return false;
    }
    return true;
  },
});
```

## Probalo vivo acá mismo

Esta demo crea un `window.guardedAgent` real con esa regla. Probá disparar `"abrir Vista previa"`, `"pasar a staging"` y `"pasar a produccion"`. Después apagá la regla con el switch y volvé a probar:

<!-- as: ui-demo paso="allow" -->
Demo interactiva de `createAgent({ allow })` (`--components propios/ui-sdk-demos.js`).

## Qué pasa cuando `allow` dice que sí vs cuando dice que no

<!-- as: terminal command="guardedAgent.act · acción permitida" exit="0" -->
```console
> await window.guardedAgent.act({ steps: [{ ref: "Vista previa", action: "setOpen", args: [true] }] })
allow({"ref":"c1","component":"collapsible","label":"Vista previa","action":"setOpen","args":[true]}) → true
{"ok":true,"steps":[{"step":0,"ref":"c1","changes":[{"component":"collapsible","label":"Vista previa","key":"open","value":true}]}],…}
```

<!-- as: terminal command="guardedAgent.act · acción bloqueada por allow" exit="1" -->
```console
> await window.guardedAgent.act({ steps: [{ ref: "Entorno de deploy", action: "setValue", args: ["produccion"] }] })
allow({"ref":"c2","component":"segmented-control","label":"Entorno de deploy","action":"setValue","args":["produccion"]}) → false
{"ok":false,"error":{"step":0,"message":"The app refused setValue on c2."},"steps":[],"appeared":[],"values":{"c2 Entorno de deploy":"staging"}}
```

La regla vive en tu app, en código determinista — nunca depende de que el modelo "se acuerde" de no apretar un botón.
