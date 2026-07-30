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

- **Formatting:** bold, italic, underline, text color, background color/highlight, font family, font size
- **Structure:** headings (H1–H3), bullet lists, numbered lists (with nesting), left/center/right/justify alignment
- **Media:** insert images by upload or by pasting/dragging one in directly; drag the handle on a selected image's corner to resize it
- **Tables:** insert a table, add/remove rows and columns, delete the table, and drag column borders to resize — table controls appear in the toolbar automatically whenever the cursor is inside a table
- **Page markers:** a thin "Page N" divider shows where the document will actually break across pages in the PDF/DOCX export — it's just an indicator, not a real page boundary, so the editor stays one continuous flow. Toggle it off in the menu's Settings section if you'd rather not see it.
- **Ruler:** a visual inch ruler above the page (Letter width), with the 1" margins shaded, for an authentic printed-page reference — decorative only, it doesn't drag to resize margins.
- **Menu (top-right):** everything that isn't day-to-day formatting lives behind the ☰ button — Export, Import, page setup, and theme. See below.
- **Themes:** Light and Dark, switchable from the menu and remembered across sessions. Adding a third theme is a two-line change (see `hooks/useTheme.js`) — the menu, persistence, and CSS variable structure already support any number of them.
- **Print:** Menu → Print… triggers the browser's native print dialog with a dedicated print stylesheet (just the page content, no toolbar/chrome).

## The menu

Click the ☰ button (top-right) for:

- **Export** — Word document (.docx), PDF, Markdown, or HTML, plus Print. Each prompts for a filename (pre-filled with a timestamp) before downloading.
- **Import** — open an existing `.docx` or `.pdf` file into the editor, replacing the current content (see below).
- **Settings** — page size (Letter or A4, affects PDF/DOCX export dimensions) and whether to show the page-break markers.
- **Theme** — Light/Dark, with room for more.

## Import

Accessible from the ☰ menu → Import. Accepts `.docx` or `.pdf` files and loads them into the editor, replacing the current content (you'll be asked to confirm first).

- **DOCX** uses [mammoth.js](https://github.com/mwilliamson/mammoth.js), which converts based on Word's named styles and core formatting — headings, bold/italic/underline, lists, tables, and images all carry over well. Direct/manual text color, highlight, font family, and font size are **not** preserved on import (Word stores those as raw run properties rather than named styles, which is outside what any browser-based docx-to-HTML converter reconstructs reliably).
- **PDF** uses [pdf.js](https://mozilla.github.io/pdf.js/) to extract text and reconstructs paragraphs from line spacing, guessing headings from relative font size. PDF is a page-layout format, not a structured document format, so this recovers readable, editable text but **not** images, tables, columns, or exact layout — that's an inherent limit of extracting from PDF, not something a better heuristic fixes. If a PDF has no extractable text (e.g., a scanned image), you'll get a clear message instead of a silent empty import.

## How pagination markers work

TipTap/ProseMirror editing requires one continuous `contenteditable` region — splitting it into separate editors per page would break cursor movement and selection. Instead, the editor measures the rendered height of each top-level block (paragraph, heading, list item, table, image, etc.) after every change and, whenever the next block would land on a new page in the final export, inserts a thin "Page N" marker before it. This is purely a visual reference — it doesn't push content down to simulate real page margins, so the editor stays compact. The PDF exporter (below) computes its own, independent, exact pagination as it lays out real text, so the on-screen marker is a close preview rather than a guarantee of the exact break point.

Trade-off: markers land between blocks, not mid-paragraph the way Word can, so a single block taller than one page (a huge image, a very long table) will simply overflow past its marker.

## How each export works

| Format | Approach |
| --- | --- |
| **HTML** | Serializes the editor's own HTML (which already carries inline styles for color/alignment) into a standalone document with matching base CSS. |
| **Markdown** | Walks the editor's document tree and writes GitHub-flavored Markdown. Underline/text color/highlight have no plain-Markdown equivalent, so those fall back to small inline HTML spans, which is standard practice and renders correctly anywhere raw HTML passthrough is allowed (GitHub, VS Code, etc). |
| **DOCX** | Walks the same document tree and builds a real `.docx` with the [`docx`](https://docx.js.org) library — native Word headings, lists, tables, and images, not an HTML wrapper. |
| **PDF** | Walks the same document tree again and draws real, selectable/searchable text directly with [`jsPDF`](https://github.com/parallax/jsPDF) — word-wrapping, page breaks, colors, highlights, images, and tables are all computed and drawn from scratch, the same way the DOCX exporter builds a real `.docx` rather than a picture of one. The one trade-off: jsPDF's built-in fonts are Helvetica/Times/Courier only, so font-family choices map to the closest of those three rather than embedding the exact on-screen Google Fonts. |

Earlier versions of this app generated the PDF by screenshotting the rendered page (`html2pdf.js`) and embedding that image — visually accurate but with no real text layer at all (not selectable, not searchable, not readable by this app's own PDF import). The current approach fixes that; you can verify it yourself by opening a PDF this app exports and selecting/searching its text.

## Project structure

```
src/
  App.jsx                     top-level layout & export/import wiring
  assets/                     logo-light.png / logo-dark.png (theme-aware wordmark, swapped in App.jsx)
  hooks/useEditorInstance.js  TipTap editor configuration
  hooks/useTheme.js           theme state + persistence; THEMES array is the single source of truth for the menu
  extensions/                 FontSize, ResizableImage, Pagination, TrailingNode
  components/                 Toolbar, HamburgerMenu, Ruler, FilenameModal, EditorCanvas, ResizableImageView, etc.
  export/                     one file per export format, shared image prep, and a shared download helper
  import/                     DOCX (mammoth) and PDF (pdf.js) importers
  styles/                     design tokens (incl. light/dark theme variables), layout, and editor/page typography
public/
  favicon-light.png / favicon-dark.png / apple-touch-icon.png   browser tab icon, theme-matched via prefers-color-scheme
```

## Notes & limitations

- Images are embedded as base64 data URLs, so exported files are fully
  self-contained (no broken image links), at the cost of larger file sizes
  for image-heavy documents. DOCX and PDF export both re-encode images as
  PNG (via a shared helper in `export/imagePrep.js`), honoring a manually
  resized width when set, and otherwise capping oversized images to keep
  the file readable inside standard page margins.
- Font family/size and image width are stored as inline styles/attributes,
  so they round-trip correctly through HTML export; DOCX maps font family
  to whatever's named (Word will substitute if it's not installed) and
  PDF maps it to the nearest of jsPDF's three built-in fonts
  (Helvetica/Times/Courier), since embedding an arbitrary web font into a
  PDF is a much larger undertaking. Plain Markdown has no native syntax
  for any of this, so it falls back to inline HTML spans (same approach
  used for color/highlight/underline).
- Table column widths you've manually resized on-screen carry through to
  the PDF export proportionally; DOCX currently exports table columns at
  equal width.
- Nested tables and tables inside list items aren't part of the toolbar's
  feature set, though the exporters will do their best with anything the
  underlying editor schema allows.
- The document/page area always renders true black-on-white regardless of
  app theme (`--paper*` CSS variables, defined once in `styles/index.css`
  and never overridden by `[data-theme]`) — a dark "page" would make the
  editor lie about what will actually print or export. Only the surrounding
  chrome (toolbar, menu, canvas background) follows the theme.
