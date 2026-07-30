import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

// PDF is a page-layout format, not a structured document format — there is
// no "this run is bold" or "this is a heading" data to read, only glyphs at
// x/y coordinates. This reconstructs paragraphs from line spacing and
// guesses headings from relative font size. It recovers readable, editable
// text faithfully; it does NOT recover images, tables, columns, or exact
// visual layout. That's a fundamental limitation of extracting from PDF,
// not something a better heuristic fixes.

const LINE_TOLERANCE = 3 // px difference still counted as "the same line"
const HEADING_SIZE_RATIO = 1.2 // font must be this much bigger than body text
const HEADING_MAX_WORDS = 14 // and short, to avoid flagging a big opening paragraph

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function groupIntoLines(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines = []
  let current = null

  for (const item of sorted) {
    if (current && Math.abs(item.y - current.y) <= LINE_TOLERANCE) {
      current.items.push(item)
    } else {
      current = { y: item.y, items: [item] }
      lines.push(current)
    }
  }

  return lines
    .map((line) => ({
      y: line.y,
      text: line.items.map((i) => i.text).join(' ').replace(/\s+/g, ' ').trim(),
      fontSize: Math.max(...line.items.map((i) => i.fontSize)),
    }))
    .filter((line) => line.text.length > 0)
}

function groupIntoParagraphs(lines, bodyFontSize) {
  const paragraphs = []
  let current = null
  let prevY = null
  let prevFontSize = bodyFontSize

  for (const line of lines) {
    const gap = prevY === null ? 0 : prevY - line.y
    const expectedLineHeight = prevFontSize * 1.4
    const isNewParagraph = current === null || gap > expectedLineHeight * 1.3

    const isHeading =
      line.fontSize >= bodyFontSize * HEADING_SIZE_RATIO && line.text.split(' ').length <= HEADING_MAX_WORDS

    if (isHeading) {
      if (current) paragraphs.push(current)
      paragraphs.push({ type: 'heading', text: line.text })
      current = null
    } else if (isNewParagraph) {
      if (current) paragraphs.push(current)
      current = { type: 'paragraph', text: line.text }
    } else {
      current.text += ' ' + line.text
    }

    prevY = line.y
    prevFontSize = line.fontSize
  }
  if (current) paragraphs.push(current)
  return paragraphs
}

export async function importPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const allBlocks = []
  const allFontSizes = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    const items = textContent.items
      .filter((item) => item.str && item.str.trim().length > 0)
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        fontSize: Math.hypot(item.transform[2], item.transform[3]) || 12,
      }))

    if (items.length === 0) continue

    items.forEach((i) => allFontSizes.push(i.fontSize))
    const lines = groupIntoLines(items)
    allBlocks.push(lines)
  }

  if (allFontSizes.length === 0) {
    return { html: '<p></p>', warnings: ['No extractable text was found in this PDF (it may be a scanned image).'] }
  }

  // Use the most common font size in the document as "body text" to compare
  // headings against, rather than an arbitrary fixed threshold.
  const counts = new Map()
  allFontSizes.forEach((size) => {
    const rounded = Math.round(size)
    counts.set(rounded, (counts.get(rounded) || 0) + 1)
  })
  const bodyFontSize = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]

  const htmlParts = []
  allBlocks.forEach((lines) => {
    const paragraphs = groupIntoParagraphs(lines, bodyFontSize)
    paragraphs.forEach((block) => {
      const tag = block.type === 'heading' ? 'h2' : 'p'
      htmlParts.push(`<${tag}>${escapeHtml(block.text)}</${tag}>`)
    })
  })

  return {
    html: htmlParts.join('\n') || '<p></p>',
    warnings: [
      'Imported as plain text reconstructed from the PDF — images, tables, columns, and exact layout are not preserved.',
    ],
  }
}
