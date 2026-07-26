import { EditorContent } from '@tiptap/react'

export default function EditorCanvas({ editor }) {
  return (
    <div className="page-wrap">
      <div className="page" id="editor-page">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
