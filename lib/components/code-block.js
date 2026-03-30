// Code Block Component — syntax-highlighted code with copy button
// No dependencies. Registers window.CodeBlock and window.copyToClipboard.

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.CodeBlock = function CodeBlock(props) {
  const { code = '', language = 'text', title = '' } = props;
  const escapedCode = escapeHtml(code);

  return `
    <div class="code-block-container mb-6">
      ${title ? `
        <div class="bg-gray-800 text-gray-200 px-4 py-2 text-sm font-medium rounded-t-lg">
          ${escapeHtml(title)}
        </div>
      ` : ''}
      <div class="relative">
        <pre class="!mt-0 ${title ? '!rounded-t-none' : ''}"><code class="language-${language}">${escapedCode}</code></pre>
        <button
          class="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded transition-colors"
          onclick="copyToClipboard(this)"
          data-code="${escapedCode.replace(/"/g, '&quot;')}"
        >
          Copy
        </button>
      </div>
    </div>
  `;
};

window.copyToClipboard = function(button) {
  const code = button.getAttribute('data-code')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  navigator.clipboard.writeText(code).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
};
