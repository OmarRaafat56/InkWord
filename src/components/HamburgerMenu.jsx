import { useEffect, useRef, useState } from 'react'
import { Menu, FileText, FileDown, Hash, Code2, Upload, Printer, Check } from 'lucide-react'
import { THEMES } from '../hooks/useTheme.js'

const EXPORT_FORMATS = [
  { id: 'docx', label: 'Word document', ext: '.docx', icon: FileText },
  { id: 'pdf', label: 'PDF', ext: '.pdf', icon: FileDown },
  { id: 'markdown', label: 'Markdown', ext: '.md', icon: Hash },
  { id: 'html', label: 'HTML', ext: '.html', icon: Code2 },
]

export default function HamburgerMenu({
  onExport,
  onImportFile,
  onPrint,
  pageSize,
  onPageSizeChange,
  showPageMarkers,
  onTogglePageMarkers,
  theme,
  onThemeChange,
  disabled,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleExportClick = (formatId) => {
    setOpen(false)
    onExport(formatId)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setOpen(false)
    if (file) onImportFile(file)
  }

  const handlePrintClick = () => {
    setOpen(false)
    onPrint()
  }

  return (
    <div className="hamburger-root" ref={rootRef}>
      <button
        type="button"
        className="hamburger-btn"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menu"
        title="Menu"
      >
        <Menu size={19} />
      </button>

      {open && (
        <div className="hamburger-menu" role="menu">
          <div className="menu-section">
            <span className="menu-section-label">Export</span>
            {EXPORT_FORMATS.map(({ id, label, ext, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className="menu-item"
                role="menuitem"
                onClick={() => handleExportClick(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
                <span className="menu-item-ext">{ext}</span>
              </button>
            ))}
            <button type="button" className="menu-item" role="menuitem" onClick={handlePrintClick}>
              <Printer size={16} />
              <span>Print…</span>
            </button>
          </div>

          <div className="menu-divider" />

          <div className="menu-section">
            <span className="menu-section-label">Import</span>
            <button type="button" className="menu-item" role="menuitem" onClick={handleImportClick}>
              <Upload size={16} />
              <span>Open .docx or .pdf…</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="menu-divider" />

          <div className="menu-section">
            <span className="menu-section-label">Settings</span>
            <div className="menu-setting-row">
              <span>Page size</span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={pageSize === 'letter' ? 'is-active' : ''}
                  onClick={() => onPageSizeChange('letter')}
                >
                  Letter
                </button>
                <button
                  type="button"
                  className={pageSize === 'a4' ? 'is-active' : ''}
                  onClick={() => onPageSizeChange('a4')}
                >
                  A4
                </button>
              </div>
            </div>
            <label className="menu-setting-row menu-checkbox-row">
              <span>Show page-break markers</span>
              <input type="checkbox" checked={showPageMarkers} onChange={(e) => onTogglePageMarkers(e.target.checked)} />
            </label>
          </div>

          <div className="menu-divider" />

          <div className="menu-section">
            <span className="menu-section-label">Theme</span>
            <div className="theme-swatch-row">
              {THEMES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`theme-swatch${theme === t.id ? ' is-active' : ''}`}
                  onClick={() => onThemeChange(t.id)}
                  title={t.label}
                >
                  <span
                    className="theme-swatch-circle"
                    style={{ background: t.swatch, borderColor: t.swatchBorder }}
                  >
                    {theme === t.id && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
