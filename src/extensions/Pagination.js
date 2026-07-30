import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// ---------------------------------------------------------------------------
// This does NOT reflow the document into separate ProseMirror instances per
// page (that would break cursor movement and selection across a single
// contenteditable), and it does NOT try to simulate real page margins on
// screen either. It keeps the document as one continuous, compact flow and,
// after every change, measures how tall each top-level block actually
// rendered. Whenever the next block would land on a new page in the final
// PDF/DOCX export, it inserts a thin, purely-visual marker — a dashed line
// with a "Page N" label — before that block, so you always know where the
// real export will break, without the editor itself growing multiple
// page-sized gaps. The document model itself is never touched.
//
// Trade-off: breaks land between top-level blocks (paragraphs, list items,
// table rows, etc.), not mid-paragraph the way Word can. That keeps the
// implementation reliable; it also means a single block taller than one
// page (a huge image, a very long table) will simply overflow in place.
// ---------------------------------------------------------------------------

export const PAGE_HEIGHT = 1056 // 11in page at 96dpi
export const PAGE_MARGIN = 96 // 1in margin, matches the export page margins
export const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN * 2
const MARKER_HEIGHT = 30 // the on-screen marker's own height — not a real page gap

const paginationKey = new PluginKey('pagination')

function computeBreaks(view) {
  const contentDom = view.dom
  const realChildren = Array.from(contentDom.children).filter(
    (el) => !el.classList.contains('page-break-marker'),
  )

  const breaks = []
  let pageContentUsed = 0
  let pageNumber = 1
  let childIndex = 0

  view.state.doc.forEach((_node, offset) => {
    const el = realChildren[childIndex]
    childIndex += 1
    if (!el) return

    const height = el.getBoundingClientRect().height
    if (pageContentUsed > 0 && pageContentUsed + height > PAGE_CONTENT_HEIGHT) {
      pageNumber += 1
      breaks.push({ pos: offset, page: pageNumber })
      pageContentUsed = 0
    }
    pageContentUsed += height
  })

  return breaks
}

function buildDecorationSet(view) {
  const breaks = computeBreaks(view)
  const decorations = breaks.map(({ pos, page }) =>
    Decoration.widget(
      pos,
      () => {
        const marker = document.createElement('div')
        marker.className = 'page-break-marker'
        marker.style.height = `${MARKER_HEIGHT}px`
        marker.contentEditable = 'false'

        const label = document.createElement('span')
        label.className = 'page-break-marker-label'
        label.textContent = `Page ${page}`
        marker.appendChild(label)

        return marker
      },
      { side: -1, key: `page-break-${pos}` },
    ),
  )
  return DecorationSet.create(view.state.doc, decorations)
}

export const Pagination = Extension.create({
  name: 'pagination',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paginationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const measured = tr.getMeta(paginationKey)
            if (measured) return measured
            return old.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return paginationKey.getState(state)
          },
        },
        view(view) {
          let scheduled = false
          const schedule = () => {
            if (scheduled) return
            scheduled = true
            requestAnimationFrame(() => {
              scheduled = false
              if (view.isDestroyed) return
              const decorations = buildDecorationSet(view)
              view.dispatch(view.state.tr.setMeta(paginationKey, decorations))
            })
          }

          // Re-measure on every doc/view update, when images finish loading
          // (their height isn't known until then), and on window resize.
          const onLoad = (event) => {
            if (event.target instanceof HTMLImageElement) schedule()
          }
          view.dom.addEventListener('load', onLoad, true)
          window.addEventListener('resize', schedule)

          schedule()

          return {
            update: schedule,
            destroy() {
              view.dom.removeEventListener('load', onLoad, true)
              window.removeEventListener('resize', schedule)
            },
          }
        },
      }),
    ]
  },
})
