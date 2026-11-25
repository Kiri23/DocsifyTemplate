// Counts the shown lines of a diff as the page does. The page cannot import this file, so template.html has a copy of
// the code between each pair of markers. check.mjs checks that the copies are the same.

// hidden-blocks:start
// Unchanged code between a `//{` line and a `//}` line only gives context to the change. The page hides each such block
// behind one row, `// ▸ <n> more lines`, until the reader clicks it. Returns the lines as the page shows them first
// (`collapsed`), the lines with all blocks open (`expanded`), and for each collapsed line its line number in `expanded`.
export const EXPANDER = /^\/\/ ▸ \d+ more lines?$/
export function splitHiddenBlocks(lines) {
	const collapsed = []
	const expanded = []
	const expandedLineOf = []
	let block = null
	for (const line of lines) {
		if (!block && /^\s*\/\/\{\s*$/.test(line)) {
			block = { indent: line.match(/^\s*/)[0], lines: [] }
			continue
		}
		if (block && /^\s*\/\/\}\s*$/.test(line)) {
			const count = block.lines.length
			collapsed.push(`${block.indent}// ▸ ${count} more line${count === 1 ? "" : "s"}`)
			expandedLineOf.push(expanded.length + 1)
			for (const hiddenLine of block.lines) expanded.push(hiddenLine)
			block = null
			continue
		}
		if (block) {
			block.lines.push(line)
			continue
		}
		collapsed.push(line)
		expanded.push(line)
		expandedLineOf.push(expanded.length)
	}
	return { collapsed, expanded, expandedLineOf }
}
// hidden-blocks:end

// diff-lines:start
// Line-level LCS diff for the plain view that shows before the diff viewer loads.
// As in the diff viewer (`ignoreWhitespace`), leading and trailing whitespace does not count. Thus a line that only
// changes its indentation (for example, code that the PR wraps in a `try`) is an unchanged row, with the new text.
export function diffLines(oldLines, newLines) {
	const n = oldLines.length
	const m = newLines.length
	const oldKeys = oldLines.map(line => line.trim())
	const newKeys = newLines.map(line => line.trim())
	const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			table[i][j] = oldKeys[i] === newKeys[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
		}
	}
	const rows = []
	let i = 0
	let j = 0
	while (i < n && j < m) {
		if (oldKeys[i] === newKeys[j]) {
			rows.push({ kind: "same", text: newLines[j] })
			i++
			j++
			continue
		}
		if (table[i + 1][j] >= table[i][j + 1]) {
			rows.push({ kind: "del", text: oldLines[i++] })
			continue
		}
		rows.push({ kind: "add", text: newLines[j++] })
	}
	while (i < n) rows.push({ kind: "del", text: oldLines[i++] })
	while (j < m) rows.push({ kind: "add", text: newLines[j++] })
	return rows
}
// diff-lines:end
