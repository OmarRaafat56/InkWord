import { downloadBlob } from './download.js'

// TipTap's getHTML() already carries inline styles for color, background
// color, and text alignment (that's how the editor stays WYSIWYG), so the
// export just needs a document shell with matching base styles for the
// elements that don't carry their own inline style (headings, lists, tables).
function buildDocument(bodyHtml, title) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #14171f;
    max-width: 816px;
    margin: 40px auto;
    padding: 0 24px;
    line-height: 1.6;
  }
  h1, h2, h3 { font-family: Georgia, 'Times New Roman', serif; line-height: 1.25; margin: 1.2em 0 0.5em; }
  h1 { font-size: 2em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.2em; }
  p { margin: 0.75em 0; }
  ul, ol { padding-left: 1.5em; margin: 0.75em 0; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  td, th { border: 1px solid #c7cdd6; padding: 6px 10px; text-align: left; }
  th { background: #f4f5f7; }
  mark { padding: 0 2px; border-radius: 2px; }
  blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #c7cdd6; color: #5b616e; }
  code { background: #f4f5f7; padding: 0.1em 0.35em; border-radius: 4px; font-family: 'Source Code Pro', monospace; }
  pre { background: #f4f5f7; padding: 12px; border-radius: 6px; overflow-x: auto; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}

export function exportHtml(editor, filename) {
  const html = buildDocument(editor.getHTML(), filename)
  const blob = new Blob([html], { type: 'text/html' })
  downloadBlob(blob, `${filename}.html`)
}
