// The patterns of incluir.txt: which paths of a repo the catalog shows. A pattern is matched
// against the list of files that may be shown (lib/files.mjs), never used to read the disk, so it
// can't reach a hidden file or leave the repo. Written by hand so it behaves the same on every
// Node the machines run (v22 in the justfile, v24 on the Mac, Termux's).

// A regular expression that matches the paths a pattern names, relative to the repo root.
//   *    any part of one name: skills/*/SKILL.md
//   **/  any number of folders, also none: **/*.ttl is also proyecto.ttl at the root
//   ?    one character
// Everything else matches itself.
export function globToRegExp(pattern) {
  const glob = pattern.replace(/^\.?\//, "");
  let source = "";
  let i = 0;
  while (i < glob.length) {
    if (glob.startsWith("**/", i)) {
      source += "(?:[^/]+/)*";
      i += 3;
    } else if (glob.startsWith("**", i)) {
      source += ".*";
      i += 2;
    } else if (glob[i] === "*") {
      source += "[^/]*";
      i += 1;
    } else if (glob[i] === "?") {
      source += "[^/]";
      i += 1;
    } else {
      source += glob[i].replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${source}$`);
}

/** The patterns of an incluir.txt: one per line; blank lines and lines starting with # don't count. */
export function readPatterns(text) {
  const patterns = [];
  for (const line of text.split("\n")) {
    const pattern = line.trim();
    if (pattern === "" || pattern.startsWith("#")) continue;
    patterns.push(pattern);
  }
  return patterns;
}
