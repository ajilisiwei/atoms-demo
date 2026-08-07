// Assembles the standalone preview document from a bundle result.
//
// The string produced here is both what the builder posts to the preview host
// and what is stored as `compiledHtml` on publish — the preview and the
// published page must be byte-identical.

const VENDOR_REACT_URL = "/vendor/react.js";
const DEFAULT_TITLE = "Preview";

// All three specifiers resolve to ONE URL, so the app and the renderer share a
// single React instance (hooks break across two copies).
export const IMPORT_MAP = {
  imports: {
    react: VENDOR_REACT_URL,
    "react-dom/client": VENDOR_REACT_URL,
    "react/jsx-runtime": VENDOR_REACT_URL,
  },
} as const;

export interface AssembleDocumentInput {
  js: string;
  css: string;
  title?: string;
}

// A literal "</script" or "</style" in the payload would close the inline tag
// early. Backslash-escaping the slash is inert in both JS and CSS.
function escapeInlineScript(js: string): string {
  return js.replace(/<\/(script)/gi, "<\\/$1");
}

function escapeInlineStyle(css: string): string {
  return css.replace(/<\/(style)/gi, "<\\/$1");
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function assembleDocument({
  js,
  css,
  title = DEFAULT_TITLE,
}: AssembleDocumentInput): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtmlText(title)}</title>
<script type="importmap">${JSON.stringify(IMPORT_MAP)}</script>
<style>${escapeInlineStyle(css)}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${escapeInlineScript(js)}</script>
</body>
</html>
`;
}
