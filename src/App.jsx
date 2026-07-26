import { useState } from 'react'
import useEditorInstance from './hooks/useEditorInstance.js'
import Toolbar from './components/Toolbar.jsx'
import ExportBar from './components/ExportBar.jsx'
import EditorCanvas from './components/EditorCanvas.jsx'
import FilenameModal from './components/FilenameModal.jsx'
import { exportHtml } from './export/toHtml.js'
import { exportMarkdown } from './export/toMarkdown.js'
import { exportDocx } from './export/toDocx.js'
import { exportPdf } from './export/toPdf.js'
import './styles/App.css'
import './styles/editor.css'

export default function App() {
  const editor = useEditorInstance()
  const [pendingFormat, setPendingFormat] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleConfirmExport = async (filename) => {
    setPendingFormat(null)
    setIsExporting(true)
    try {
      if (pendingFormat === 'html') exportHtml(editor, filename)
      else if (pendingFormat === 'markdown') exportMarkdown(editor, filename)
      else if (pendingFormat === 'docx') await exportDocx(editor, filename)
      else if (pendingFormat === 'pdf') await exportPdf(filename)
    } catch (err) {
      console.error('Export failed:', err)
      window.alert('Something went wrong while exporting. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Inkline</span>
          <span className="brand-tag">rich text editor</span>
        </div>
        <ExportBar onExport={setPendingFormat} disabled={!editor || isExporting} />
      </header>

      <Toolbar editor={editor} />

      <main className="canvas-area">
        <EditorCanvas editor={editor} />
      </main>

      {isExporting && (
        <div className="export-toast" role="status">
          Preparing your file…
        </div>
      )}

      {pendingFormat && (
        <FilenameModal
          format={pendingFormat}
          onCancel={() => setPendingFormat(null)}
          onConfirm={handleConfirmExport}
        />
      )}
    </div>
  )
}
