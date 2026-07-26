import { FileText, FileDown, Hash, Code2 } from 'lucide-react'

const FORMATS = [
  { id: 'docx', label: '.docx', icon: FileText },
  { id: 'pdf', label: '.pdf', icon: FileDown },
  { id: 'markdown', label: '.md', icon: Hash },
  { id: 'html', label: '.html', icon: Code2 },
]

export default function ExportBar({ onExport, disabled }) {
  return (
    <div className="export-bar" aria-label="Export document">
      {FORMATS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className="export-btn"
          onClick={() => onExport(id)}
          disabled={disabled}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
