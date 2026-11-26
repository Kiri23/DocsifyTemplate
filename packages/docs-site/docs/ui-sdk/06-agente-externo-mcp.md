# 6. Agente afuera: Claude Code + `pagina_mcp.py`

Cuando no tenés Chrome con el flag de WebMCP —o cuando querés que **Claude Code** (u otro cliente MCP) opere tu página desde la terminal— entra el último eslabón: `packages/docs-site/agente/pagina_mcp.py`.

## El recorrido completo de punta a punta

```text
Ida:
  Claude Code (LLM afuera)
    → pagina_mcp.py (servidor MCP sobre stdin/stdout, JSON-RPC 2.0)
      → Chromium headless (Playwright abre http://localhost:<puerto>/#/<pagina>)
        → window.agent (UI SDK) / window.pageText (read)
          → stepperPrimitive / ui-* (mueve el estado)
            → DOM que ve la persona

Vuelta:
  La persona hace clic o usa el teclado
    → el primitivo actualiza el mismo estado
      → el siguiente window.agent.snapshot() devuelve el nuevo valor
```

Así es exactamente como `pagina_mcp.py` conecta MCP con `window.agent` (líneas 53 y 99):

```python
# Al arrancar (línea 53): pide a la página el catálogo de 4 herramientas
tools = page.evaluate("[...window.agent.tools, window.pageText.tool]")

# En cada tools/call de Claude Code (línea 99): delega a la página
out = page.evaluate(
    "([name, input]) => Promise.resolve(name === 'read' ? window.pageText.read(input) : window.agent[name](input))",
    [name, arguments],
)
```

Claude Code **nunca ve el DOM ni ejecuta código arbitrario** en la página: solo recibe las 4 herramientas que la página decidió exponer (`snapshot`, `query`, `act`, `read`).

## Probalo vivo acá mismo

Este trazador ejecuta llamadas reales contra los componentes `ui-*` de abajo y muestra el mensaje JSON-RPC 2.0 exacto que viaja entre Claude Code y `pagina_mcp.py`, iluminando los 6 saltos de ida y la vuelta cuando hacés clic como persona:

<!-- as: ui-demo paso="mcp" -->
Trazador interactivo de los 6 saltos MCP (`--components propios/ui-sdk-demos.js`).

## Cómo se conecta Claude Code en la terminal

<!-- as: terminal command="claude --strict-mcp-config (pagina_mcp.py)" line-ms="85" exit="0" -->
```console
$ claude --strict-mcp-config --mcp-config '{"mcpServers":{"pagina":{"command":"python3","args":["packages/docs-site/agente/pagina_mcp.py","packages/docs-site/docs","--page","componentes/stepper"]}}}'
…
→ {"jsonrpc":"2.0","id":1,"method":"tools/list"}
← 4 tools: act, query, snapshot, read

→ {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"snapshot","arguments":{}}}
← [{"ref":"c1","component":"stepper","label":"Pasos","value":1,"actions":["setValue","next","previous"],…}]

→ {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"act","arguments":{"steps":[{"ref":"Pasos","action":"setValue","args":[3]}]}}}
← {"ok":true,"steps":[{"step":0,"ref":"c1","changes":[{"component":"stepper","label":"Pasos","key":"value","value":3}]}],"appeared":[],"values":{"c1 Pasos":3}}
```

Con esto cerraste el círculo entero: el mismo `<as-stepper>` que viste en el Paso 4 se opera igual desde DevTools (Paso 1–3), desde un navegador con WebMCP (Paso 5), o desde Claude Code a través de `pagina_mcp.py` (Paso 6).
