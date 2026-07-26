import { useState } from 'react'
import { X } from 'lucide-react'
import { defaultFilename, sanitizeFilename } from '../utils/filename.js'

const EXTENSIONS = {
  docx: '.docx',
  pdf: '.pdf',
  markdown: '.md',
  html: '.html',
}

const LABELS = {
  docx: 'Word document',
  pdf: 'PDF',
  markdown: 'Markdown',
  html: 'HTML',
}

export default function FilenameModal({ format, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultFilename())
  const extension = EXTENSIONS[format]

  const handleSubmit = (event) => {
    event.preventDefault()
    onConfirm(sanitizeFilename(name))
  }

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">Export as {LABELS[format]}</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Cancel export">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="modal-label" htmlFor="filename-input">
            File name
          </label>
          <div className="filename-row">
            <input
              id="filename-input"
              type="text"
              className="filename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            <span className="filename-extension">{extension}</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Export
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
