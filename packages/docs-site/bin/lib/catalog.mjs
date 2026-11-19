// The catalog: files that already exist in a repo, shown as they are, chosen by the patterns of
// <docs>/incluir.txt. bin/armar.mjs calls buildCatalog, which rebuilds <docs>/_catalogo/ from
// scratch so that afterwards docs/ holds everything the site shows and nothing else, or
// checkCatalog, which says how the catalog on disk differs from what buildCatalog would write.
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { filesUnder } from "./files.mjs";
import { globToRegExp, readPatterns } from "./glob.mjs";
import { sidebarFor } from "./sidebar.mjs";

export const CATALOG = "_catalogo";
// Pages armar writes itself at the top of the catalog; a file of the repo can't take their place.
const OWN_PAGES = new Set(["README.md", "_sidebar.md"]);
// The code language of a file that isn't Markdown, when it isn't its extension.
const LANGUAGES = { ".ttl": "turtle", ".sh": "bash", ".py": "python", ".js": "javascript", ".mjs": "javascript" };

/**
 * Rebuilds <docs>/_catalogo/ from <docs>/incluir.txt.
 * @param {string} docs the docs folder
 * @param {string} [root] the repo root the patterns are relative to; the docs folder's parent if not given
 * @returns {Promise<{ pages: { path: string, link: string }[], empty: string[] }>} the pages written,
 *   and the patterns that matched nothing
 */
export async function buildCatalog(docs, root) {
  const plan = await planCatalog(docs, root);
  await rm(plan.folder, { recursive: true, force: true });
  for (const [page, text] of plan.files) {
    const target = join(plan.folder, page);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  }
  return { pages: plan.pages, empty: plan.empty };
}

/**
 * How <docs>/_catalogo/ differs from what buildCatalog would write: a list of "falta X",
 * "sobra X" and "cambió X", empty when they match. Writes nothing.
 * @returns {Promise<{ differences: string[], empty: string[] }>}
 */
export async function checkCatalog(docs, root) {
  const plan = await planCatalog(docs, root);
  const onDisk = await filesOnDisk(plan.folder);
  const differences = [];
  for (const [page, text] of plan.files) {
    if (!onDisk.has(page)) differences.push(`falta ${page}`);
    else if ((await readFile(onDisk.get(page), "utf8")) !== text) differences.push(`cambió ${page}`);
  }
  for (const page of onDisk.keys()) {
    if (!plan.files.has(page)) differences.push(`sobra ${page}`);
  }
  return { differences: differences.sort(), empty: plan.empty };
}

/** What the catalog should hold: each page by its path inside _catalogo/, with its text. */
async function planCatalog(docs, root = dirname(resolve(docs))) {
  const docsFolder = resolve(docs);
  const repoRoot = resolve(root);
  const docsInRepo = relative(repoRoot, docsFolder).split(sep).join("/");
  if (docsInRepo === "" || docsInRepo.startsWith("..")) {
    throw new Error(`${docsFolder} tiene que ser una carpeta dentro de ${repoRoot}`);
  }

  const patterns = readPatterns(await readFile(join(docsFolder, "incluir.txt"), "utf8"));
  const shown = await filesUnder(repoRoot, "");
  // The docs folder is already on the site; the catalog is for what lives outside it.
  for (const path of shown.keys()) {
    if (path.startsWith(docsInRepo + "/")) shown.delete(path);
  }

  const chosen = [];
  const empty = [];
  for (const pattern of patterns) {
    const matcher = globToRegExp(pattern);
    const matches = [...shown.keys()].filter((path) => matcher.test(path));
    if (matches.length === 0) empty.push(pattern);
    for (const path of matches) if (!chosen.includes(path)) chosen.push(path);
  }
  chosen.sort();

  const files = new Map();
  const pages = [];
  for (const path of chosen) {
    const page = pagePath(path);
    if (OWN_PAGES.has(page)) throw new Error(`${path} ocuparía el ${page} que arma el catálogo; sacalo de incluir.txt`);
    files.set(page, pageText(path, await readFile(shown.get(path), "utf8")));
    pages.push({ path, link: `/${CATALOG}/${page}` });
  }
  const menu = sidebarFor(pages);
  files.set("_sidebar.md", `* [← Docs](/README.md)\n* [Catálogo](/${CATALOG}/README.md)\n${menu}\n`);
  files.set("README.md", indexText(menu, patterns));
  return { folder: join(docsFolder, CATALOG), files, pages, empty };
}

/** Every file now in the catalog folder, hidden ones too, by its path inside it. None if the
 *  folder doesn't exist. */
async function filesOnDisk(folder) {
  const found = new Map();
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else found.set(relative(folder, path).split(sep).join("/"), path);
    }
  };
  await walk(folder).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  return found;
}

/** Where a file of the repo lands in the catalog: Markdown as is, anything else as a page of its own. */
export function pagePath(path) {
  return path.endsWith(".md") ? path : `${path}.md`;
}

/** The page for a file of the repo. Markdown keeps its text, with its frontmatter shown as a YAML
 *  block (Docsify would draw it as a heading). Anything else goes whole inside a code block. */
export function pageText(path, text) {
  if (path.endsWith(".md")) return frontmatterAsCode(text);
  const language = LANGUAGES[extname(path)] ?? extname(path).slice(1);
  return `# ${path}\n\n${fenced(text, language)}`;
}

/** Markdown that starts with a --- block gets that block as YAML code, and the rest as it was. */
function frontmatterAsCode(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return text;
  return fenced(match[1] + "\n", "yaml") + text.slice(match[0].length);
}

/** Text inside a code block, with a fence longer than any run of backticks in it. */
export function fenced(text, language) {
  let longest = 0;
  for (const run of text.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  const fence = "`".repeat(Math.max(3, longest + 1));
  const body = text.endsWith("\n") ? text : text + "\n";
  return `${fence}${language}\n${body}${fence}\n`;
}

/** The catalog's front page: where the files come from, and the same list as the menu. */
function indexText(menu, patterns) {
  const rules = patterns.map((pattern) => `- \`${pattern}\``).join("\n");
  return `# Catálogo

Archivos del repo que se muestran tal cual, elegidos por \`incluir.txt\`:

${rules}

Lo arma \`armar.mjs\` de docs-site; no se edita a mano.

${menu}
`;
}
