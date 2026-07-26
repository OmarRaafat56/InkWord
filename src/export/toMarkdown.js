import { downloadBlob } from './download.js'

// Plain Markdown has no syntax for underline, text color, or background
// color, so those fall back to small inline HTML snippets — this is
// standard practice for GitHub-flavored Markdown and renders correctly in
// any Markdown viewer that allows raw HTML passthrough (GitHub, VS Code,
// most static site generators).

function escapeCell(text) {
  return text.replace(/\|/g, '\\|').replace(/\n/g, '<br>')
}

function renderMarks(text, marks = []) {
  const has = (name) => marks.some((m) => m.type === name)
  const get = (name) => marks.find((m) => m.type === name)

  if (!text) return text
  if (has('code')) return `\`${text}\``

  let result = text
  if (has('bold')) result = `**${result}**`
  if (has('italic')) result = `*${result}*`
  if (has('strike')) result = `~~${result}~~`
  if (has('underline')) result = `<u>${result}</u>`

  const color = get('textStyle')?.attrs?.color
  if (color) result = `<span style="color:${color}">${result}</span>`

  const highlightColor = get('highlight')?.attrs?.color
  if (highlightColor) result = `<mark style="background-color:${highlightColor}">${result}</mark>`

  return result
}

function renderInline(content = []) {
  return content
    .map((node) => {
      if (node.type === 'text') return renderMarks(node.text, node.marks)
      if (node.type === 'hardBreak') return '  \n'
      if (node.type === 'image') return renderImage(node)
      return ''
    })
    .join('')
}

function renderImage(node) {
  const alt = node.attrs?.alt || node.attrs?.title || ''
  const src = node.attrs?.src || ''
  return `![${alt}](${src})`
}

function wrapAlign(node, text) {
  const align = node.attrs?.textAlign
  if (align && align !== 'left') {
    return `<div align="${align}">\n\n${text}\n\n</div>`
  }
  return text
}

function renderListItems(listNode, ordered, depth) {
  const indent = '  '.repeat(depth)
  let counter = listNode.attrs?.start || 1
  const lines = []

  ;(listNode.content || []).forEach((item) => {
    const marker = ordered ? `${counter++}.` : '-'
    const prefixLen = marker.length + 1
    let markerUsed = false

    ;(item.content || []).forEach((child) => {
      if (child.type === 'bulletList') {
        lines.push(...renderListItems(child, false, depth + 1))
      } else if (child.type === 'orderedList') {
        lines.push(...renderListItems(child, true, depth + 1))
      } else if (child.type === 'paragraph') {
        const text = renderInline(child.content)
        if (!markerUsed) {
          lines.push(`${indent}${marker} ${text}`)
          markerUsed = true
        } else {
          lines.push(`${indent}${' '.repeat(prefixLen)}${text}`)
        }
      } else {
        const rendered = renderBlock(child)
        if (rendered) lines.push(`${indent}${' '.repeat(prefixLen)}${rendered}`)
      }
    })

    if (!markerUsed) lines.push(`${indent}${marker}`)
  })

  return lines
}

function renderTable(node) {
  const rows = node.content || []
  if (rows.length === 0) return ''

  const cellText = (cell) =>
    escapeCell((cell.content || []).map((block) => renderInline(block.content)).join(' '))

  const [headerRow, ...bodyRows] = rows
  const headerCells = (headerRow.content || []).map(cellText)
  const separator = headerCells.map(() => '---')
  const lines = [`| ${headerCells.join(' | ')} |`, `| ${separator.join(' | ')} |`]

  bodyRows.forEach((row) => {
    const cells = (row.content || []).map(cellText)
    lines.push(`| ${cells.join(' | ')} |`)
  })

  return lines.join('\n')
}

function renderBlock(node) {
  switch (node.type) {
    case 'paragraph': {
      const text = renderInline(node.content)
      return text ? wrapAlign(node, text) : ''
    }
    case 'heading': {
      const level = node.attrs?.level || 1
      const text = renderInline(node.content)
      return wrapAlign(node, `${'#'.repeat(level)} ${text}`)
    }
    case 'bulletList':
      return renderListItems(node, false, 0).join('\n')
    case 'orderedList':
      return renderListItems(node, true, 0).join('\n')
    case 'image':
      return renderImage(node)
    case 'table':
      return renderTable(node)
    case 'blockquote': {
      const inner = (node.content || []).map(renderBlock).filter(Boolean).join('\n\n')
      return inner
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n')
    }
    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = (node.content || []).map((t) => t.text).join('')
      return '```' + lang + '\n' + code + '\n```'
    }
    case 'horizontalRule':
      return '---'
    default:
      return ''
  }
}

export function docToMarkdown(json) {
  const blocks = (json.content || []).map(renderBlock).filter((b) => b !== '')
  return blocks.join('\n\n') + '\n'
}

export function exportMarkdown(editor, filename) {
  const markdown = docToMarkdown(editor.getJSON())
  const blob = new Blob([markdown], { type: 'text/markdown' })
  downloadBlob(blob, `${filename}.md`)
}
