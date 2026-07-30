import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  ShadingType,
  WidthType,
  VerticalAlign,
  BorderStyle,
  LevelFormat,
} from 'docx'
import { downloadBlob } from './download.js'
import { imageKey, buildImageMap } from './imagePrep.js'

// Word has no automatic numbering for ordered lists the way it does for
// bullets, so this defines an explicit numbering scheme (1., 2., 3. …,
// re-indented per nesting depth) that paragraphs reference by name.
const ORDERED_LIST_REFERENCE = 'ordered-list'
const ORDERED_LIST_NUMBERING_CONFIG = {
  reference: ORDERED_LIST_REFERENCE,
  levels: [0, 1, 2, 3, 4].map((level) => ({
    level,
    format: LevelFormat.DECIMAL,
    text: `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: { left: 720 * (level + 1), hanging: 360 },
      },
    },
  })),
}

const HEADING_MAP = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
}

const ALIGN_MAP = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
}

function alignmentFor(node) {
  return ALIGN_MAP[node.attrs?.textAlign] || AlignmentType.LEFT
}

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function buildTextRun(node) {
  const marks = node.marks || []
  const has = (name) => marks.some((m) => m.type === name)
  const get = (name) => marks.find((m) => m.type === name)

  const options = {
    text: node.text || '',
    bold: has('bold'),
    italics: has('italic'),
    strike: has('strike'),
  }
  if (has('underline')) options.underline = {}

  const color = get('textStyle')?.attrs?.color
  if (color) options.color = color.replace('#', '')

  const fontFamily = get('textStyle')?.attrs?.fontFamily
  if (fontFamily) options.font = fontFamily.split(',')[0].replace(/["']/g, '').trim()

  const fontSize = get('textStyle')?.attrs?.fontSize
  if (fontSize) {
    const px = parseFloat(fontSize)
    if (Number.isFinite(px)) options.size = Math.round(px * 1.5) // px -> half-points (at 96dpi, 1px = 0.75pt)
  }

  const highlightColor = get('highlight')?.attrs?.color
  if (highlightColor) {
    options.shading = { type: ShadingType.CLEAR, fill: highlightColor.replace('#', ''), color: 'auto' }
  }

  if (has('code')) {
    options.font = 'Consolas'
    options.shading = options.shading || { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' }
  }

  return new TextRun(options)
}

function buildInlineChildren(node) {
  const children = (node.content || [])
    .map((child) => {
      if (child.type === 'text') return buildTextRun(child)
      if (child.type === 'hardBreak') return new TextRun({ text: '', break: 1 })
      return null
    })
    .filter(Boolean)
  return children.length ? children : [new TextRun('')]
}

function buildParagraph(node, extra = {}) {
  const options = { children: buildInlineChildren(node), alignment: alignmentFor(node), ...extra }
  if (node.type === 'heading') options.heading = HEADING_MAP[node.attrs?.level] || HeadingLevel.HEADING_1
  return new Paragraph(options)
}

function buildListParagraphs(listNode, ordered, depth) {
  const paragraphs = []
  ;(listNode.content || []).forEach((item) => {
    ;(item.content || []).forEach((child) => {
      if (child.type === 'bulletList') {
        paragraphs.push(...buildListParagraphs(child, false, depth + 1))
      } else if (child.type === 'orderedList') {
        paragraphs.push(...buildListParagraphs(child, true, depth + 1))
      } else if (child.type === 'paragraph') {
        const extra = ordered
          ? { numbering: { reference: ORDERED_LIST_REFERENCE, level: depth } }
          : { bullet: { level: depth } }
        paragraphs.push(buildParagraph(child, extra))
      } else {
        paragraphs.push(...buildBlocks([child], null))
      }
    })
  })
  return paragraphs
}

function buildTable(node, imageMap) {
  const rows = (node.content || []).map((rowNode) => {
    const cells = (rowNode.content || []).map((cellNode) => {
      const isHeader = cellNode.type === 'tableHeader'
      const cellChildren = cellNode.content?.length ? buildBlocks(cellNode.content, imageMap) : [new Paragraph('')]
      return new TableCell({
        children: cellChildren,
        shading: isHeader ? { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })
    })
    return new TableRow({ children: cells })
  })
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })
}

function buildBlocks(nodes = [], imageMap) {
  const out = []
  nodes.forEach((node) => {
    switch (node.type) {
      case 'paragraph':
      case 'heading':
        out.push(buildParagraph(node))
        break
      case 'bulletList':
        out.push(...buildListParagraphs(node, false, 0))
        break
      case 'orderedList':
        out.push(...buildListParagraphs(node, true, 0))
        break
      case 'image': {
        const prepared = imageMap?.get(imageKey(node))
        if (prepared) {
          const base64 = prepared.dataUrl.split(',')[1]
          out.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type: 'png',
                  data: base64ToUint8Array(base64),
                  transformation: { width: prepared.width, height: prepared.height },
                }),
              ],
            }),
          )
        }
        break
      }
      case 'table':
        out.push(buildTable(node, imageMap))
        out.push(new Paragraph(''))
        break
      case 'blockquote':
        ;(node.content || []).forEach((child) => {
          if (child.type === 'paragraph') {
            out.push(
              buildParagraph(child, {
                indent: { left: 720 },
                border: { left: { color: 'C7CDD6', space: 8, style: BorderStyle.SINGLE, size: 12 } },
              }),
            )
          } else {
            out.push(...buildBlocks([child], imageMap))
          }
        })
        break
      case 'codeBlock': {
        const code = (node.content || []).map((t) => t.text).join('')
        out.push(
          new Paragraph({
            children: [new TextRun({ text: code, font: 'Consolas' })],
            shading: { type: ShadingType.CLEAR, fill: 'F4F5F7', color: 'auto' },
          }),
        )
        break
      }
      case 'horizontalRule':
        out.push(
          new Paragraph({
            border: { bottom: { color: 'C7CDD6', space: 1, style: BorderStyle.SINGLE, size: 6 } },
          }),
        )
        break
      default:
        break
    }
  })
  return out
}

// Standard page dimensions in twips (1440 twips = 1 inch).
const PAGE_SIZES = {
  letter: { width: 12240, height: 15840 }, // 8.5in x 11in
  a4: { width: 11906, height: 16838 }, // 210mm x 297mm
}

export async function exportDocx(editor, filename, options = {}) {
  const json = editor.getJSON()
  const imageMap = await buildImageMap(json.content)

  const children = buildBlocks(json.content, imageMap)
  const pageSize = PAGE_SIZES[options.pageSize] || PAGE_SIZES.letter

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: pageSize,
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: children.length ? children : [new Paragraph('')],
      },
    ],
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 24 } },
      },
    },
    numbering: {
      config: [ORDERED_LIST_NUMBERING_CONFIG],
    },
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${filename}.docx`)
}
