import mammoth from 'mammoth'

// mammoth converts based on Word's named styles (Heading 1, Strong, etc.)
// and core run flags (bold/italic), which covers the vast majority of real
// documents. Underline needs an explicit style-map entry to come through.
// Direct/manual text color, highlight color, font family, and font size are
// NOT preserved — Word stores those as raw run properties rather than named
// styles, and mammoth's conversion model is style-based, not a full-fidelity
// re-implementation of the OOXML renderer. This mirrors the honest
// trade-off of every browser-based docx-to-HTML converter, not just ours.
const STYLE_MAP = ["u => u", "p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh"]

export async function importDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: STYLE_MAP,
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((data) => ({ src: `data:${image.contentType};base64,${data}` })),
      ),
    },
  )
  return { html: result.value, warnings: result.messages.map((m) => m.message) }
}
