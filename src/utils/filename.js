// Builds a default filename like "document-2026-07-26-1432" so exports
// never collide with each other when a user exports several formats in a row.
export function defaultFilename() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `document-${date}-${time}`
}

// Strips characters that are invalid (or awkward) in filenames across
// Windows, macOS, and Linux, and trims it to a sane length.
export function sanitizeFilename(name) {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ')
  return cleaned.slice(0, 120) || defaultFilename()
}
