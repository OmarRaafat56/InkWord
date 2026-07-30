import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// Guarantees the document always ends in an empty paragraph. Without this,
// inserting a table (or image, or list) as the very last thing in the
// document traps the cursor inside it — there's no paragraph below to click
// or arrow-key into, so a user can never start a new line after it.
export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('trailingNode'),
        appendTransaction: (_transactions, _oldState, newState) => {
          const { doc, tr, schema } = newState
          const lastNode = doc.lastChild
          if (!lastNode || lastNode.type === schema.nodes.paragraph) return null
          return tr.insert(doc.content.size, schema.nodes.paragraph.create())
        },
      }),
    ]
  },
})
