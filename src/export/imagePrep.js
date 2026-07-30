// Normalizes every pasted/uploaded image to PNG bytes (regardless of its
// original format — WEBP, GIF, etc.) and reports its pixel dimensions,
// honoring a manually resized width when set. Shared by the DOCX and PDF
// exporters so both stay consistent and neither depends on a source format
// their target library doesn't support.

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function prepareImagePng(src, requestedWidthPx, maxWidthPx = 700) {
  const img = await loadImageElement(src)
  const naturalWidth = img.naturalWidth || 400
  const naturalHeight = img.naturalHeight || 300
  const aspect = naturalHeight / naturalWidth

  let width = requestedWidthPx || naturalWidth
  let height = requestedWidthPx ? Math.round(width * aspect) : naturalHeight
  if (width > maxWidthPx) {
    height = Math.round((height * maxWidthPx) / width)
    width = maxWidthPx
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(img, 0, 0, width, height)

  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

// Images are keyed by `src + width` (not just src) so the same pasted image
// resized differently in two places exports at each of its actual sizes.
export function imageKey(node) {
  return `${node.attrs?.src || ''}::${node.attrs?.width || ''}`
}

export function collectImageNodes(nodes = [], acc = new Map()) {
  nodes.forEach((node) => {
    if (node.type === 'image' && node.attrs?.src) {
      const key = imageKey(node)
      if (!acc.has(key)) acc.set(key, { src: node.attrs.src, width: node.attrs.width || null })
    }
    if (node.content) collectImageNodes(node.content, acc)
  })
  return acc
}

export async function buildImageMap(rootContent) {
  const entries = Array.from(collectImageNodes(rootContent).entries())
  const prepared = await Promise.all(entries.map(([, info]) => prepareImagePng(info.src, info.width)))
  return new Map(entries.map(([key], i) => [key, prepared[i]]))
}
