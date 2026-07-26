# Inkline — Rich Text Editor

A WYSIWYG rich text editor built with React and TipTap, with export to
**.docx**, **.pdf**, **.markdown**, and **.html**.

## Run it

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open the URL Vite prints (usually `http://localhost:5173`).

> This project uses [Vite](https://vitejs.dev) instead of Create React App —
> CRA is no longer maintained by the React team, and Vite gives a faster,
> more reliable `npm install` for the same plain React app. `npm start` and
> `npm run dev` both work; `npm run build` produces a static `dist/` folder
> you can deploy anywhere (Netlify, Vercel, GitHub Pages, S3, etc.).

## Features

- **Formatting:** bold, italic, underline, text color, background color/highlight
- **Structure:** headings (H1–H3), bullet lists, numbered lists (with nesting), left/center/right alignment
- **Media:** insert images by upload or by pasting/dragging one in directly
- **Tables:** insert a table, add/remove rows and columns, delete the table — table controls appear in the toolbar automatically whenever the cursor is inside a table
- **Export:** one button per format at the top of the editor; each prompts for a filename (pre-filled with a timestamp) before downloading

## How each export works

| Format | Approach |
| --- | --- |
| **HTML** | Serializes the editor's own HTML (which already carries inline styles for color/alignment) into a standalone document with matching base CSS. |
| **Markdown** | Walks the editor's document tree and writes GitHub-flavored Markdown. Underline/text color/highlight have no plain-Markdown equivalent, so those fall back to small inline HTML spans, which is standard practice and renders correctly anywhere raw HTML passthrough is allowed (GitHub, VS Code, etc). |
| **DOCX** | Walks the same document tree and builds a real `.docx` with the [`docx`](https://docx.js.org) library — native Word headings, lists, tables, and images, not an HTML wrapper. |
| **PDF** | Clones the actual rendered editor page and rasterizes it with `html2pdf.js`, so the PDF matches on-screen formatting pixel-for-pixel. |

## Project structure

```
src/
  App.jsx                  top-level layout & export wiring
  hooks/useEditorInstance.js  TipTap editor configuration
  components/               Toolbar, ExportBar, FilenameModal, EditorCanvas, etc.
  export/                    one file per export format + a shared download helper
  styles/                    design tokens, layout, and editor/page typography
```

## Notes & limitations

- Images are embedded as base64 data URLs, so exported files are fully
  self-contained (no broken image links), at the cost of larger file sizes
  for image-heavy documents.
- The DOCX export re-encodes images as PNG and caps their width to keep the
  file readable inside standard page margins.
- Nested tables and tables inside list items aren't part of the toolbar's
  feature set, though the exporters will do their best with anything the
  underlying editor schema allows.
