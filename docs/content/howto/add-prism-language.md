# How to add a Prism syntax language

This guide shows you how to enable syntax highlighting for an additional programming language.

## Prerequisites

- A running DocsifyTemplate project

## Steps

### 1. Find the Prism component URL

Look up the language name on the [Prism CDN listing](https://cdn.jsdelivr.net/npm/prismjs@1/components/). The filename follows the pattern `prism-{language}.min.js`.

### 2. Add the script tag

Open `docs/index.html`. Find the existing Prism language imports and add a new `<script>` tag after them:

```html
<script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-python.min.js"></script>
```

Replace `python` with your target language.

### 3. Use the language in markdown

In any markdown file, use the language name as the code fence identifier:

````markdown
```python
print("highlighted")
```
````

## Verification

Refresh a page containing a code block with the new language. The code displays with syntax highlighting.

## See also

- [Prism.js supported languages](https://prismjs.com/#supported-languages) — full list of available languages
