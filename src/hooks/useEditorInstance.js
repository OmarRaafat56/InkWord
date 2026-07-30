import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import { FontSize } from '../extensions/FontSize.js'
import { ResizableImage } from '../extensions/ResizableImage.js'
import { Pagination } from '../extensions/Pagination.js'
import { TrailingNode } from '../extensions/TrailingNode.js'

// Reads a File object (from a paste or drop event) into a base64 data URL.
// Data URLs keep the whole document self-contained, which matters for the
// HTML/Markdown exports since there is no server to host uploaded images.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const STARTER_DOC = `
  <h1>Welcome to Inkline</h1>
  <p>This is a rich text editor. Try <strong>bold</strong>, <em>italic</em>, <u>underline</u>, colors, headings, lists, images, and tables — then export your work as a Word document, PDF, Markdown, or HTML file using the buttons above.</p>
  <p></p>
`

export default function useEditorInstance() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Pagination,
      TrailingNode,
    ],
    content: STARTER_DOC,
    editorProps: {
      attributes: {
        class: 'editor-content',
        spellCheck: 'true',
      },
      // Handles images pasted directly from the OS clipboard (e.g. a
      // screenshot), which arrive as raw files rather than an <img> tag.
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || [])
        const imageItem = items.find((item) => item.type.startsWith('image/'))
        if (!imageItem) return false

        const file = imageItem.getAsFile()
        if (!file) return false

        event.preventDefault()
        fileToDataUrl(file).then((src) => {
          const { state } = view
          const node = state.schema.nodes.image.create({ src })
          const transaction = state.tr.replaceSelectionWith(node)
          view.dispatch(transaction)
        })
        return true
      },
      // Handles images dragged in from the desktop / file explorer.
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || [])
        const imageFile = files.find((file) => file.type.startsWith('image/'))
        if (!imageFile) return false

        event.preventDefault()
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        fileToDataUrl(imageFile).then((src) => {
          const { state } = view
          const node = state.schema.nodes.image.create({ src })
          const transaction = state.tr.insert(coords?.pos ?? state.selection.from, node)
          view.dispatch(transaction)
        })
        return true
      },
    },
  })

  return editor
}
