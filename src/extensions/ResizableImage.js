import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ResizableImageView from '../components/ResizableImageView.jsx'

// Extends the base Image node with a `width` attribute (persisted as an
// inline style, so it round-trips through HTML/PDF export automatically)
// and a custom node view that adds a drag handle for resizing.
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.style.width || element.getAttribute('width')
          const parsed = width ? parseInt(width, 10) : null
          return Number.isFinite(parsed) ? parsed : null
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { style: `width: ${attributes.width}px; height: auto;` }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
