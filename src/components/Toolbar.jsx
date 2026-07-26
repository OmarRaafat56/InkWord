import { useRef } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImagePlus,
  Table as TableIcon,
  Undo2,
  Redo2,
  Palette,
  Highlighter,
  Rows,
  Columns,
  Trash2,
} from 'lucide-react'
import ToolbarButton from './ToolbarButton.jsx'
import ColorControl from './ColorControl.jsx'

const HEADING_OPTIONS = [
  { value: 'paragraph', label: 'Body text' },
  { value: '1', label: 'Heading 1' },
  { value: '2', label: 'Heading 2' },
  { value: '3', label: 'Heading 3' },
]

function currentHeadingValue(editor) {
  for (const level of [1, 2, 3]) {
    if (editor.isActive('heading', { level })) return String(level)
  }
  return 'paragraph'
}

export default function Toolbar({ editor }) {
  const fileInputRef = useRef(null)

  if (!editor) return null

  const handleHeadingChange = (event) => {
    const value = event.target.value
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().setHeading({ level: Number(value) }).run()
    }
  }

  const handleImagePick = () => fileInputRef.current?.click()

  const handleImageFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run()
    }
    reader.readAsDataURL(file)
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const inTable = editor.isActive('table')

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="tb-group">
        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 size={17} />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 size={17} />
        </ToolbarButton>
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <select
          className="heading-select"
          value={currentHeadingValue(editor)}
          onChange={handleHeadingChange}
          aria-label="Paragraph style"
        >
          {HEADING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={17} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={17} />
        </ToolbarButton>
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <ColorControl
          icon={<Palette size={17} />}
          label="Text color"
          value={editor.getAttributes('textStyle').color}
          onChange={(color) => editor.chain().focus().setColor(color).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorControl
          icon={<Highlighter size={17} />}
          label="Background color"
          value={editor.getAttributes('highlight').color}
          onChange={(color) => editor.chain().focus().setHighlight({ color }).run()}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={17} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={17} />
        </ToolbarButton>
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <ToolbarButton
          label="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={17} />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={17} />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={17} />
        </ToolbarButton>
      </div>

      <div className="tb-divider" />

      <div className="tb-group">
        <ToolbarButton label="Insert image" onClick={handleImagePick}>
          <ImagePlus size={17} />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          style={{ display: 'none' }}
        />
        <ToolbarButton label="Insert table" onClick={insertTable}>
          <TableIcon size={17} />
        </ToolbarButton>
      </div>

      {inTable && (
        <>
          <div className="tb-divider" />
          <div className="tb-group tb-group-table">
            <span className="tb-group-label">Table</span>
            <ToolbarButton label="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
              <Rows size={16} />+
            </ToolbarButton>
            <ToolbarButton label="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Rows size={16} />+
            </ToolbarButton>
            <ToolbarButton label="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
              <Rows size={16} /><Trash2 size={12} />
            </ToolbarButton>
            <ToolbarButton label="Add column left" onClick={() => editor.chain().focus().addColumnBefore().run()}>
              <Columns size={16} />+
            </ToolbarButton>
            <ToolbarButton label="Add column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns size={16} />+
            </ToolbarButton>
            <ToolbarButton label="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <Columns size={16} /><Trash2 size={12} />
            </ToolbarButton>
            <ToolbarButton label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 size={16} />
            </ToolbarButton>
          </div>
        </>
      )}
    </div>
  )
}
