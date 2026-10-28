import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { EmojiPicker } from '~/components/workspace/EmojiPicker';

/** A highlighted box with an icon, like Notion's callout. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      icon: {
        default: '💡',
        parseHTML: (element) => element.getAttribute('data-icon') || '💡',
        renderHTML: (attributes) => ({ 'data-icon': attributes.icon })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }, { tag: 'aside' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },

  renderMarkdown(node, helpers) {
    const body = helpers.renderChildren(node.content ?? [], '\n\n');
    const lines = `${node.attrs?.icon ?? '💡'} ${body}`.split('\n');
    return lines.map((line) => (line ? `> ${line}` : '>')).join('\n');
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  }
});

function CalloutView({ node, updateAttributes, editor }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const icon = String(node.attrs.icon ?? '💡');
  return (
    <NodeViewWrapper
      className='notion-callout'
      data-type='callout'
      data-block-color={node.attrs.blockColor ?? undefined}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            contentEditable={false}
            className='notion-callout-icon'
            disabled={!editor.isEditable}
            aria-label='Change icon'
          >
            {icon}
          </button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-auto p-0'>
          <EmojiPicker
            onSelect={(emoji) => {
              updateAttributes({ icon: emoji });
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <NodeViewContent className='notion-callout-body' />
    </NodeViewWrapper>
  );
}
