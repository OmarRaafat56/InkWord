import { jsPDF } from 'jspdf'
import { downloadBlob } from './download.js'
import { imageKey, buildImageMap } from './imagePrep.js'

// ---------------------------------------------------------------------------
// Why this exists: an earlier version of this exporter used html2pdf.js,
// which rasterizes the page into a screenshot and embeds that as an image —
// visually accurate, but the resulting PDF has no real text layer at all
// (not selectable, not searchable, not accessible, and unreadable by our own
// PDF import feature). This version builds the PDF directly from the same
// document tree the DOCX/Markdown exporters walk, drawing real text with
// jsPDF's low-level API — the PDF equivalent of what toDocx.js already does.
//
// Trade-off: jsPDF's built-in fonts are Helvetica/Times/Courier only (no
// embedding a custom Google Font here), so font-family choices map to the
// nearest of those three rather than rendering pixel-identical to the
// on-screen Source Serif / Inter. Layout, formatting, colors, images, and
// pagination are otherwise real and accurate.
// ---------------------------------------------------------------------------

const MARGIN = 72 // 1in, constant regardless of page size

// Page geometry is derived fresh per export call and threaded through `ctx`
// (as `ctx.geo`) rather than stored in module-level variables — that keeps
// this module safe if two exports were ever in flight at once, instead of
// relying on the UI never allowing that.
function pageGeometryFor(pageSize) {
  const [pageWidth, pageHeight] = pageSize === 'a4' ? [595.28, 841.89] : [612, 792]
  return {
    pageWidth,
    pageHeight,
    marginPt: MARGIN,
    contentWidth: pageWidth - MARGIN * 2,
    contentBottom: pageHeight - MARGIN,
  }
}

const BODY_SIZE = 12 // pt (~16px at 96dpi)
const HEADING_SIZES = { 1: 24, 2: 18, 3: 14.4 }
const INK = '#14171f'
const INK_SECONDARY = '#5b616e'
const BORDER = '#c7cdd6'
const SURFACE_SUNKEN = '#f4f5f7'

function mapFontFamily(cssFamily) {
  if (!cssFamily) return 'times' // matches the editor's default serif body font
  const lower = cssFamily.toLowerCase()
  if (lower.includes('courier')) return 'courier'
  if (lower.includes('georgia') || lower.includes('times') || lower.includes('serif')) return 'times'
  return 'helvetica' // arial, inter, sans-serif, trebuchet, and anything else
}

function fontStyleFor(bold, italic) {
  if (bold && italic) return 'bolditalic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

// --- Step 1: flatten a paragraph's inline content into formatting runs ----

function buildRuns(inlineNodes = []) {
  const runs = []
  inlineNodes.forEach((node) => {
    if (node.type === 'hardBreak') {
      runs.push({ isBreak: true })
      return
    }
    if (node.type !== 'text' || !node.text) return
    const marks = node.marks || []
    const has = (name) => marks.some((m) => m.type === name)
    const get = (name) => marks.find((m) => m.type === name)
    const textStyle = get('textStyle')?.attrs || {}
    const isCode = has('code')
    runs.push({
      text: node.text,
      bold: has('bold'),
      italic: has('italic'),
      underline: has('underline'),
      strike: has('strike'),
      code: isCode,
      color: textStyle.color || null,
      fontFamily: isCode ? 'courier' : textStyle.fontFamily || null,
      fontSizePt: textStyle.fontSize ? parseFloat(textStyle.fontSize) * 0.75 : null,
      highlight: get('highlight')?.attrs?.color || null,
    })
  })
  return runs
}

// --- Step 2: word-wrap runs into lines that fit maxWidth ------------------

function layoutLines(doc, runs, maxWidth, opts) {
  const lines = []
  let currentLine = []
  let currentWidth = 0

  const pushLine = () => {
    const sizes = currentLine.map((s) => s.fontSizePt).concat(opts.baseFontSizePt)
    lines.push({ segments: currentLine, width: currentWidth, fontSizePt: Math.max(...sizes) })
    currentLine = []
    currentWidth = 0
  }

  runs.forEach((run) => {
    if (run.isBreak) {
      pushLine()
      return
    }
    const family = mapFontFamily(run.fontFamily || opts.baseFontFamily)
    const style = fontStyleFor(run.bold || opts.bold, run.italic)
    const size = run.fontSizePt || opts.baseFontSizePt
    doc.setFont(family, style)
    doc.setFontSize(size)

    const words = run.text.split(' ')
    words.forEach((word, i) => {
      if (word === '' && i === 0) return
      const piece = i === 0 ? word : ' ' + word
      const pieceWidth = doc.getTextWidth(piece)
      const seg = {
        family,
        style,
        size,
        color: run.color,
        highlight: run.highlight,
        underline: run.underline,
        strike: run.strike,
        fontSizePt: size,
      }

      if (currentWidth + pieceWidth > maxWidth && currentLine.length > 0) {
        pushLine()
        const w = doc.getTextWidth(word)
        currentLine.push({ ...seg, text: word, width: w })
        currentWidth = w
      } else {
        currentLine.push({ ...seg, text: piece, width: pieceWidth })
        currentWidth += pieceWidth
      }
    })
  })

  if (currentLine.length > 0) pushLine()
  if (lines.length === 0) lines.push({ segments: [], width: 0, fontSizePt: opts.baseFontSizePt })
  return lines
}

// --- Step 3: paint one laid-out line at the cursor's current y ------------

function paintLine(doc, y, line, opts, maxWidth, originX, marker) {
  const lineHeight = line.fontSizePt * 1.35
  const baselineY = y + line.fontSizePt * 0.85

  let startX = originX
  if (opts.align === 'center') startX = originX + (maxWidth - line.width) / 2
  else if (opts.align === 'right') startX = originX + (maxWidth - line.width)

  // Pass 1: highlight backgrounds, so they sit behind the text drawn next.
  let x = startX
  line.segments.forEach((seg) => {
    if (seg.highlight) {
      doc.setFillColor(seg.highlight)
      doc.rect(x, y, seg.width, lineHeight, 'F')
    }
    x += seg.width
  })

  if (marker) {
    doc.setFont(mapFontFamily(opts.baseFontFamily), 'normal')
    doc.setFontSize(opts.baseFontSizePt)
    doc.setTextColor(opts.defaultColor)
    doc.text(marker, originX - 16, baselineY, { align: 'right' })
  }

  // Pass 2: text, underline, strikethrough.
  x = startX
  line.segments.forEach((seg) => {
    doc.setFont(seg.family, seg.style)
    doc.setFontSize(seg.size)
    doc.setTextColor(seg.color || opts.defaultColor)
    doc.text(seg.text, x, baselineY)
    if (seg.underline) {
      doc.setDrawColor(seg.color || opts.defaultColor)
      doc.setLineWidth(Math.max(0.5, seg.size * 0.04))
      doc.line(x, baselineY + 1.5, x + seg.width, baselineY + 1.5)
    }
    if (seg.strike) {
      doc.setDrawColor(seg.color || opts.defaultColor)
      doc.setLineWidth(Math.max(0.5, seg.size * 0.04))
      doc.line(x, baselineY - seg.size * 0.3, x + seg.width, baselineY - seg.size * 0.3)
    }
    x += seg.width
  })

  return lineHeight
}

function ensureSpace(doc, cursor, neededHeight, ctx) {
  if (cursor.y + neededHeight > ctx.geo.contentBottom) {
    doc.addPage()
    cursor.y = ctx.geo.marginPt
  }
}

// Renders a full text block (paragraph, heading, blockquote line, list item)
// as one or more wrapped, page-break-aware lines starting at the cursor.
function renderTextBlock(doc, cursor, runs, opts, ctx) {
  const indent = opts.indent || 0
  const maxWidth = ctx.geo.contentWidth - indent
  const lines = layoutLines(doc, runs, maxWidth, opts)

  lines.forEach((line, i) => {
    const lineHeight = line.fontSizePt * 1.35
    ensureSpace(doc, cursor, lineHeight, ctx)
    paintLine(doc, cursor.y, line, opts, maxWidth, ctx.geo.marginPt + indent, i === 0 ? opts.marker : null)
    cursor.y += lineHeight
  })

  cursor.y += opts.spacingAfter ?? BODY_SIZE * 0.6
}

// --- Block-level tree walk (mirrors toDocx.js / toMarkdown.js) ------------

function renderList(doc, cursor, listNode, ordered, depth, ctx) {
  let counter = listNode.attrs?.start || 1
  ;(listNode.content || []).forEach((item) => {
    let first = true
    ;(item.content || []).forEach((child) => {
      if (child.type === 'bulletList') {
        renderList(doc, cursor, child, false, depth + 1, ctx)
        return
      }
      if (child.type === 'orderedList') {
        renderList(doc, cursor, child, true, depth + 1, ctx)
        return
      }
      const indent = 16 * (depth + 1)
      if (child.type === 'paragraph') {
        const runs = buildRuns(child.content)
        const marker = first ? (ordered ? `${counter}.` : '\u2022') : null
        if (first && ordered) counter += 1
        renderTextBlock(
          doc,
          cursor,
          runs,
          {
            baseFontSizePt: BODY_SIZE,
            baseFontFamily: ctx.bodyFont,
            align: 'left',
            indent,
            marker,
            defaultColor: INK,
            spacingAfter: BODY_SIZE * 0.3,
          },
          ctx,
        )
        first = false
      } else {
        renderBlock(doc, cursor, child, ctx)
      }
    })
  })
}

function computeColumnWidths(rows, colCount, ctx) {
  for (const row of rows) {
    const cells = row.content || []
    if (
      cells.length === colCount &&
      cells.every((c) => Array.isArray(c.attrs?.colwidth) && c.attrs.colwidth.every(Boolean))
    ) {
      const pxWidths = cells.map((c) => c.attrs.colwidth[0])
      const totalPx = pxWidths.reduce((a, b) => a + b, 0)
      return pxWidths.map((px) => (px / totalPx) * ctx.geo.contentWidth)
    }
  }
  return Array(colCount).fill(ctx.geo.contentWidth / colCount)
}

const CELL_PAD_X = 7
const CELL_PAD_Y = 5
const CELL_FONT_SIZE = 10.5

function layoutCell(doc, cellNode, colWidth, ctx) {
  const innerWidth = colWidth - CELL_PAD_X * 2
  const blocks = cellNode.content?.length ? cellNode.content : [{ type: 'paragraph', content: [] }]
  let lines = []
  blocks.forEach((block) => {
    const runs = buildRuns(block.content)
    lines = lines.concat(
      layoutLines(doc, runs, innerWidth, { baseFontSizePt: CELL_FONT_SIZE, baseFontFamily: ctx.bodyFont }),
    )
  })
  const height = lines.reduce((sum, l) => sum + l.fontSizePt * 1.35, 0) + CELL_PAD_Y * 2
  return { lines, height: Math.max(height, CELL_FONT_SIZE * 1.35 + CELL_PAD_Y * 2) }
}

function renderTable(doc, cursor, node, ctx) {
  const rows = node.content || []
  if (rows.length === 0) return
  const colCount = Math.max(...rows.map((r) => (r.content || []).length))
  const colWidths = computeColumnWidths(rows, colCount, ctx)

  rows.forEach((row) => {
    const cells = row.content || []
    const isHeader = cells.every((c) => c.type === 'tableHeader')
    const cellLayouts = cells.map((cell, i) => layoutCell(doc, cell, colWidths[i], ctx))
    const rowHeight = Math.max(...cellLayouts.map((c) => c.height))

    ensureSpace(doc, cursor, rowHeight, ctx)
    const rowTop = cursor.y
    let x = ctx.geo.marginPt

    cells.forEach((cell, i) => {
      const w = colWidths[i]
      if (isHeader) {
        doc.setFillColor(SURFACE_SUNKEN)
        doc.rect(x, rowTop, w, rowHeight, 'F')
      }
      doc.setDrawColor(BORDER)
      doc.setLineWidth(0.75)
      doc.rect(x, rowTop, w, rowHeight, 'S')

      let y = rowTop + CELL_PAD_Y
      cellLayouts[i].lines.forEach((line) => {
        const lh = line.fontSizePt * 1.35
        paintLine(
          doc,
          y,
          line,
          { baseFontSizePt: CELL_FONT_SIZE, baseFontFamily: ctx.bodyFont, align: 'left', defaultColor: INK },
          w - CELL_PAD_X * 2,
          x + CELL_PAD_X,
          null,
        )
        y += lh
      })
      x += w
    })

    cursor.y = rowTop + rowHeight
  })

  cursor.y += BODY_SIZE * 0.6
}

function renderImage(doc, cursor, node, ctx) {
  const prepared = ctx.imageMap.get(imageKey(node))
  if (!prepared) return

  let widthPt = prepared.width * 0.75
  let heightPt = prepared.height * 0.75
  if (widthPt > ctx.geo.contentWidth) {
    heightPt = heightPt * (ctx.geo.contentWidth / widthPt)
    widthPt = ctx.geo.contentWidth
  }

  ensureSpace(doc, cursor, heightPt, ctx)
  const x = ctx.geo.marginPt + (ctx.geo.contentWidth - widthPt) / 2
  doc.addImage(prepared.dataUrl, 'PNG', x, cursor.y, widthPt, heightPt)
  cursor.y += heightPt + BODY_SIZE * 0.6
}

function renderCodeBlock(doc, cursor, code, ctx) {
  const innerWidth = ctx.geo.contentWidth - CELL_PAD_X * 2
  const lines = layoutLines(doc, [{ text: code, fontFamily: 'courier' }], innerWidth, {
    baseFontSizePt: CELL_FONT_SIZE,
    baseFontFamily: 'courier',
  })
  const blockHeight = lines.reduce((sum, l) => sum + l.fontSizePt * 1.35, 0) + CELL_PAD_Y * 2

  ensureSpace(doc, cursor, blockHeight, ctx)
  doc.setFillColor(SURFACE_SUNKEN)
  doc.rect(ctx.geo.marginPt, cursor.y, ctx.geo.contentWidth, blockHeight, 'F')

  let y = cursor.y + CELL_PAD_Y
  lines.forEach((line) => {
    const lh = line.fontSizePt * 1.35
    paintLine(
      doc,
      y,
      line,
      { baseFontSizePt: CELL_FONT_SIZE, baseFontFamily: 'courier', align: 'left', defaultColor: INK },
      innerWidth,
      ctx.geo.marginPt + CELL_PAD_X,
      null,
    )
    y += lh
  })
  cursor.y += blockHeight + BODY_SIZE * 0.6
}

function renderBlock(doc, cursor, node, ctx) {
  switch (node.type) {
    case 'paragraph': {
      const runs = buildRuns(node.content)
      renderTextBlock(
        doc,
        cursor,
        runs,
        {
          baseFontSizePt: BODY_SIZE,
          baseFontFamily: ctx.bodyFont,
          align: node.attrs?.textAlign || 'left',
          defaultColor: INK,
        },
        ctx,
      )
      break
    }
    case 'heading': {
      const level = node.attrs?.level || 1
      const sizePt = HEADING_SIZES[level] || 16
      const runs = buildRuns(node.content)
      renderTextBlock(
        doc,
        cursor,
        runs,
        {
          baseFontSizePt: sizePt,
          baseFontFamily: ctx.bodyFont,
          bold: true,
          align: node.attrs?.textAlign || 'left',
          defaultColor: INK,
          spacingAfter: sizePt * 0.4,
        },
        ctx,
      )
      break
    }
    case 'bulletList':
      renderList(doc, cursor, node, false, 0, ctx)
      break
    case 'orderedList':
      renderList(doc, cursor, node, true, 0, ctx)
      break
    case 'image':
      renderImage(doc, cursor, node, ctx)
      break
    case 'table':
      renderTable(doc, cursor, node, ctx)
      break
    case 'blockquote':
      ;(node.content || []).forEach((child) => {
        if (child.type === 'paragraph') {
          const runs = buildRuns(child.content)
          renderTextBlock(
            doc,
            cursor,
            runs,
            {
              baseFontSizePt: BODY_SIZE,
              baseFontFamily: ctx.bodyFont,
              italic: true,
              indent: 18,
              align: 'left',
              defaultColor: INK_SECONDARY,
            },
            ctx,
          )
        } else {
          renderBlock(doc, cursor, child, ctx)
        }
      })
      break
    case 'codeBlock': {
      const code = (node.content || []).map((t) => t.text).join('')
      renderCodeBlock(doc, cursor, code, ctx)
      break
    }
    case 'horizontalRule':
      ensureSpace(doc, cursor, 24, ctx)
      doc.setDrawColor(BORDER)
      doc.setLineWidth(1)
      doc.line(ctx.geo.marginPt, cursor.y + 10, ctx.geo.pageWidth - ctx.geo.marginPt, cursor.y + 10)
      cursor.y += 24
      break
    default:
      break
  }
}

export async function exportPdf(editor, filename, options = {}) {
  const geo = pageGeometryFor(options.pageSize)

  const json = editor.getJSON()
  const imageMap = await buildImageMap(json.content)
  const ctx = { bodyFont: null, imageMap, geo } // bodyFont: null -> default serif, matches the editor's document font

  const doc = new jsPDF({ unit: 'pt', format: options.pageSize === 'a4' ? 'a4' : 'letter', compress: true })
  doc.setProperties({ title: filename })
  const cursor = { y: geo.marginPt }

  const nodes = json.content?.length ? json.content : [{ type: 'paragraph', content: [] }]
  nodes.forEach((node) => renderBlock(doc, cursor, node, ctx))

  const blob = doc.output('blob')
  downloadBlob(blob, `${filename}.pdf`)
}
