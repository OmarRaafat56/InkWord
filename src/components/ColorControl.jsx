import { useRef } from 'react'
import { Ban } from 'lucide-react'

// A toolbar swatch that opens a native color picker on click and shows the
// active color as a small underline bar. A neighboring "no color" button
// clears the mark entirely.
export default function ColorControl({ icon, label, value, onChange, onClear }) {
  const inputRef = useRef(null)

  return (
    <div className="color-control">
      <button
        type="button"
        className="tb-btn color-swatch-btn"
        title={label}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
      >
        {icon}
        <span className="color-swatch-bar" style={{ background: value || 'transparent' }} />
      </button>
      <input
        ref={inputRef}
        type="color"
        className="color-input-hidden"
        value={value || '#000000'}
        onChange={(event) => onChange(event.target.value)}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        className="tb-btn tb-btn-small"
        title={`Clear ${label.toLowerCase()}`}
        aria-label={`Clear ${label.toLowerCase()}`}
        onClick={onClear}
      >
        <Ban size={14} />
      </button>
    </div>
  )
}
