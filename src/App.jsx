import { useState } from 'react'
import useEditorInstance from './hooks/useEditorInstance.js'
import useTheme from './hooks/useTheme.js'
import Toolbar from './components/Toolbar.jsx'
import HamburgerMenu from './components/HamburgerMenu.jsx'
import Ruler from './components/Ruler.jsx'
import EditorCanvas from './components/EditorCanvas.jsx'
import FilenameModal from './components/FilenameModal.jsx'
import { exportHtml } from './export/toHtml.js'
import { exportMarkdown } from './export/toMarkdown.js'
import { exportDocx } from './export/toDocx.js'
import { exportPdf } from './export/toPdf.js'
import { importDocx } from './import/fromDocx.js'
import { importPdf } from './import/fromPdf.js'
import logoLight from './assets/logo-light.png'
import logoDark from './assets/logo-dark.png'
import './styles/App.css'
import './styles/editor.css'

export default function App() {
  const editor = useEditorInstance()
  const [theme, setTheme] = useTheme()
  const [pendingFormat, setPendingFormat] = useState(null)
  const [busyMessage, setBusyMessage] = useState(null)
  const [pageSize, setPageSize] = useState('letter')
  const [showPageMarkers, setShowPageMarkers] = useState(true)

  const handleConfirmExport = async (filename) => {
    setPendingFormat(null)
    setBusyMessage('Preparing your file…')
    try {
      if (pendingFormat === 'html') exportHtml(editor, filename)
      else if (pendingFormat === 'markdown') exportMarkdown(editor, filename)
      else if (pendingFormat === 'docx') await exportDocx(editor, filename, { pageSize })
      else if (pendingFormat === 'pdf') await exportPdf(editor, filename, { pageSize })
    } catch (err) {
      console.error('Export failed:', err)
      window.alert('Something went wrong while exporting. Please try again.')
    } finally {
      setBusyMessage(null)
    }
  }

  const handleImport = async (file) => {
    if (!editor) return
    const isDocx = /\.docx$/i.test(file.name)
    const isPdf = /\.pdf$/i.test(file.name)
    if (!isDocx && !isPdf) {
      window.alert('Please choose a .docx or .pdf file.')
      return
    }

    const confirmed = window.confirm(
      'Importing will replace everything currently in the editor. Continue?',
    )
    if (!confirmed) return

    setBusyMessage(isDocx ? 'Importing Word document…' : 'Extracting text from PDF…')
    try {
      const { html, warnings } = isDocx ? await importDocx(file) : await importPdf(file)
      editor.commands.setContent(html, true)
      if (warnings?.length) {
        console.warn('Import warnings:', warnings)
        window.alert(
          isDocx
            ? "Imported. Note: direct text color, highlight, font, and size formatting from Word aren't preserved on import — only structural formatting (headings, bold/italic/underline, lists, tables, images) carries over."
            : warnings[0],
        )
      }
    } catch (err) {
      console.error('Import failed:', err)
      window.alert('Something went wrong reading that file. It may be corrupted or password-protected.')
    } finally {
      setBusyMessage(null)
    }
  }

  return (
    <div className={`app${showPageMarkers ? '' : ' hide-page-markers'}`}>
      <header className="topbar">
        <div className="brand">
          <img src={theme === 'dark' ? logoDark : logoLight} alt="Inkline" className="brand-logo" />
          <span className="brand-tag">rich text editor</span>
        </div>
        <HamburgerMenu
          onExport={setPendingFormat}
          onImportFile={handleImport}
          onPrint={() => window.print()}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          showPageMarkers={showPageMarkers}
          onTogglePageMarkers={setShowPageMarkers}
          theme={theme}
          onThemeChange={setTheme}
          disabled={!editor || !!busyMessage}
        />
      </header>

      <Toolbar editor={editor} />
      <Ruler />

      <main className="canvas-area">
        <EditorCanvas editor={editor} />
      </main>

      {busyMessage && (
        <div className="export-toast" role="status">
          {busyMessage}
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
