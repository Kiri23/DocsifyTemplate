// Which files of a folder may be shown. serve.mjs serves only these and armar.mjs copies only
// these: hidden files and folders (.env, .git…) stay out, and so does a link to a file outside
// the folder.
import { readdir, realpath, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const SKIP = new Set(["node_modules"]);

/** Every file under a folder, by its URL path ("/bin/SCRIPTS.md" → its place on disk). A request
 *  is looked up here, never turned into a path, so "/../" can't reach outside the folder. */
export async function filesUnder(root, prefix) {
  const found = new Map();
  const inside = (await realpath(root)) + sep;
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() || (entry.isSymbolicLink() && await linksInside(path, inside))) {
        found.set(prefix + relative(root, path).split(sep).join("/"), path);
      }
    }
  };
  await walk(root);
  return found;
}

/** Whether a link points at a file inside the folder (`inside` ends with the separator). */
async function linksInside(path, inside) {
  const target = await realpath(path).catch(() => null);
  return target !== null && target.startsWith(inside) && (await stat(target)).isFile();
}
