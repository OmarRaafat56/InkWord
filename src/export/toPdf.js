import html2pdf from 'html2pdf.js'

// Renders the *actual DOM* of the editor page to a canvas and drops that
// into a PDF. This is the most reliable way to guarantee the PDF matches
// the editor view exactly, since every inline style, font, color, and
// layout choice the browser already computed is reused as-is.
export async function exportPdf(filename) {
  const source = document.getElementById('editor-page')
  if (!source) return

  const clone = source.cloneNode(true)
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'))
  clone.removeAttribute('contenteditable')
  clone.style.boxShadow = 'none'
  clone.style.margin = '0'

  // Render off-screen so the clone doesn't flash on screen mid-export.
  const stage = document.createElement('div')
  stage.style.position = 'fixed'
  stage.style.top = '0'
  stage.style.left = '-10000px'
  stage.appendChild(clone)
  document.body.appendChild(stage)

  const options = {
    filename: `${filename}.pdf`,
    margin: 0.6,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'avoid-all'] },
  }

  try {
    await html2pdf().set(options).from(clone).save()
  } finally {
    document.body.removeChild(stage)
  }
}
