// Compiles Typst text to PDF in the browser with typst.ts (Typst compiled to WebAssembly).
// Used by transportes/browser/engines.js once the typst.ts module has been downloaded.

/** Wraps a loaded typst-all-in-one.ts module so it turns Typst text into PDF bytes. */
export function typstCompilerFrom(typstModule) {
  const typst = typstModule?.$typst;
  if (!typst || typeof typst.pdf !== "function") {
    throw new Error("el módulo de typst cargó pero no exporta $typst.pdf (¿la URL apunta a typst-all-in-one.ts?)");
  }

  return {
    async compilePdf(typstSource) {
      let pdf;
      try {
        pdf = await typst.pdf({ mainContent: typstSource });
      } catch (error) {
        throw new Error(`typst no pudo compilar el documento: ${error?.message ?? error}`);
      }
      return pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf ?? []);
    },
  };
}
