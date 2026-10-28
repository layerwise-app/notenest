// The editor's extensions. `schemaExtensions` defines the document (nodes and
// marks) and is shared with Markdown import/export; `editorExtensions` adds
// the interactive parts (menus, shortcuts, paste and drop handling).
import type { AnyExtension } from '@tiptap/core';
import { Mathematics } from '@tiptap/extension-mathematics';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import Typography from '@tiptap/extension-typography';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { BlockColorExtension } from './extensions/block-color';
import { Highlight, TextColor } from './extensions/color-marks';
import { FileDrop } from './extensions/file-drop';
import { NotionKeymap } from './extensions/keymap';
import { MarkdownPaste } from './extensions/markdown-paste';
import { Suggestions } from './extensions/suggestions';
import { Bookmark } from './nodes/bookmark';
import { Callout } from './nodes/callout';
import { CodeBlock } from './nodes/code-block';
import { Column, ColumnList } from './nodes/columns';
import { Embed } from './nodes/embed';
import { mathClickHandlers } from './nodes/math';
import { AudioBlock, FileBlock, ImageBlock, VideoBlock } from './nodes/media';
import { DateMention, PageMention } from './nodes/mentions';
import { PageBlock } from './nodes/page-block';
import { Quote } from './nodes/quote';
import { TableOfContents } from './nodes/toc';
import { Toggle, ToggleContent, ToggleExit, ToggleInputRule, ToggleSummary } from './nodes/toggle';

export function schemaExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      blockquote: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null }
      },
      dropcursor: { color: 'rgba(35, 131, 226, 0.45)', width: 4 },
      trailingNode: { node: 'paragraph' }
    }),
    Quote,
    TaskList,
    TaskItem.configure({ nested: true }),
    Toggle,
    ToggleSummary,
    ToggleContent,
    TableKit.configure({ table: { resizable: true, cellMinWidth: 80, lastColumnResizable: true } }),
    CodeBlock,
    TextColor,
    Highlight,
    BlockColorExtension,
    Callout,
    ColumnList,
    Column,
    PageBlock,
    PageMention,
    DateMention,
    TableOfContents,
    Mathematics.configure({
      katexOptions: { throwOnError: false },
      blockOptions: { onClick: (node, pos) => mathClickHandlers.block?.(node, pos) },
      inlineOptions: { onClick: (node, pos) => mathClickHandlers.inline?.(node, pos) }
    }),
    ImageBlock,
    VideoBlock,
    AudioBlock,
    FileBlock,
    Embed,
    Bookmark
  ];
}

const PLACEHOLDERS: Record<string, string> = {
  heading: '',
  detailsSummary: 'Toggle',
  codeBlock: ''
};

export function editorExtensions(): AnyExtension[] {
  return [
    ...schemaExtensions(),
    Typography.configure({
      openDoubleQuote: false,
      closeDoubleQuote: false,
      openSingleQuote: false,
      closeSingleQuote: false
    }),
    ToggleInputRule,
    ToggleExit,
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: true,
      placeholder: ({ node, editor }) => {
        if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
        if (node.type.name in PLACEHOLDERS) return PLACEHOLDERS[node.type.name];
        const { $from } = editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          const name = $from.node(depth).type.name;
          if (name === 'taskItem') return 'To-do';
          if (name === 'listItem') return 'List';
          if (name === 'blockquote') return 'Empty quote';
          if (name === 'callout') return 'Type something…';
          if (name === 'detailsContent') return 'Empty toggle. Type or drop blocks inside.';
          if (name === 'tableCell' || name === 'tableHeader') return '';
        }
        return 'Write something, or press ‘/’ for commands…';
      }
    }),
    Suggestions,
    NotionKeymap,
    MarkdownPaste,
    FileDrop
  ];
}
