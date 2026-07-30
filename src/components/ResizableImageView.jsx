import { useCallback, useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'

const MIN_WIDTH = 80

export default function ResizableImageView({ node, updateAttributes, selected }) {
  const wrapperRef = useRef(null)
  const dragRef = useRef(null)

  const onHandlePointerDown = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      const wrapper = wrapperRef.current
      if (!wrapper) return
      const contentEl = wrapper.closest('.editor-content')

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: wrapper.getBoundingClientRect().width,
        // The image can never be dragged wider than the page's content column.
        maxWidth: contentEl?.getBoundingClientRect().width || 816,
      }
      event.target.setPointerCapture(event.pointerId)
    },
    [],
  )

  const onHandlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const delta = event.clientX - drag.startX
      const next = Math.round(Math.min(Math.max(drag.startWidth + delta, MIN_WIDTH), drag.maxWidth))
      updateAttributes({ width: next })
    },
    [updateAttributes],
  )

  const onHandlePointerUp = useCallback((event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }, [])

  return (
    <NodeViewWrapper
      as="div"
      className={`resizable-image${selected ? ' is-selected' : ''}`}
      ref={wrapperRef}
      style={{ width: node.attrs.width ? `${node.attrs.width}px` : undefined }}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        className="editor-image"
        style={{ width: node.attrs.width ? '100%' : 'auto' }}
        draggable={false}
      />
      <span
        className="image-resize-handle"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        role="presentation"
      />
    </NodeViewWrapper>
  )
}
