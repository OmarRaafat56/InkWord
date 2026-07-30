import { useRef } from 'react'
import { Upload } from 'lucide-react'

export default function ImportButton({ onImport, disabled }) {
  const inputRef = useRef(null)

  const handleChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-importing the same file twice in a row
    if (file) onImport(file)
  }

  return (
    <>
      <button
        type="button"
        className="import-btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="Import a .docx or .pdf file"
      >
        <Upload size={15} />
        <span>Import</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </>
  )
}
