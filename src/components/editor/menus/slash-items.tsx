// The `/` menu's commands, grouped like Notion's.
import type { Editor, Range } from '@tiptap/core';
import {
  AtSign,
  AudioLines,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Code2,
  Columns2,
  Columns3,
  Columns4,
  FileText,
  Globe,
  Image,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  ListTree,
  Minus,
  Paperclip,
  Quote,
  Sigma,
  Smile,
  SquareFunction,
  Table,
  Type,
  Video
} from 'lucide-react';
import type { ReactNode } from 'react';
import { COLOR_LABELS, COLORS } from '../colors';
import { insertBlocks, selectedBlock, turnInto } from '../blocks';
import type { BlockTypeId } from '../blocks';
import type { EditorEnv } from '../editor-env';
import { openFromSlash } from '../extensions/suggestions';
import { openMathEditor } from '../nodes/math';
import { columnsJSON } from '../nodes/columns';

export type SlashItem = {
  id: string;
  title: string;
  description: string;
  group: string;
  keywords: string;
  icon: ReactNode;
  shortcut?: string;
  run: (editor: Editor, range: Range) => void;
};

const glyph = (text: string, className = '') => <span className={`font-semibold ${className}`}>{text}</span>;

const turn = (type: BlockTypeId) => (editor: Editor, range: Range) => {
  editor.chain().focus().deleteRange(range).run();
  turnInto(editor, type);
};

const insert = (json: object) => (editor: Editor, range: Range) => insertBlocks(editor, json, range);

export function slashItems(env: EditorEnv): SlashItem[] {
  const items: SlashItem[] = [
    { id: 'text', group: 'Basic blocks', title: 'Text', description: 'Just start writing with plain text.', keywords: 'paragraph plain', icon: <Type />, run: turn('paragraph') },
    {
      id: 'page',
      group: 'Basic blocks',
      title: 'Page',
      description: 'Embed a sub-page inside this page.',
      keywords: 'subpage new',
      icon: <FileText />,
      run: (editor, range) => {
        const id = env.createSubpage();
        insertBlocks(editor, { type: 'pageBlock', attrs: { pageId: id } }, range);
        env.openPage(id);
      }
    },
    { id: 'todo', group: 'Basic blocks', title: 'To-do list', description: 'Track tasks with a to-do list.', keywords: 'todo task checkbox check', icon: <ListChecks />, shortcut: '[]', run: turn('taskList') },
    { id: 'h1', group: 'Basic blocks', title: 'Heading 1', description: 'Big section heading.', keywords: 'h1 title', icon: glyph('H1'), shortcut: '#', run: turn('heading1') },
    { id: 'h2', group: 'Basic blocks', title: 'Heading 2', description: 'Medium section heading.', keywords: 'h2 subtitle', icon: glyph('H2'), shortcut: '##', run: turn('heading2') },
    { id: 'h3', group: 'Basic blocks', title: 'Heading 3', description: 'Small section heading.', keywords: 'h3', icon: glyph('H3'), shortcut: '###', run: turn('heading3') },
    {
      id: 'table',
      group: 'Basic blocks',
      title: 'Table',
      description: 'Add a simple table.',
      keywords: 'grid rows columns',
      icon: <Table />,
      run: (editor, range) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    { id: 'bullet', group: 'Basic blocks', title: 'Bulleted list', description: 'Create a simple bulleted list.', keywords: 'ul unordered bullet', icon: <List />, shortcut: '-', run: turn('bulletList') },
    { id: 'numbered', group: 'Basic blocks', title: 'Numbered list', description: 'Create a list with numbering.', keywords: 'ol ordered number', icon: <ListOrdered />, shortcut: '1.', run: turn('orderedList') },
    { id: 'toggle', group: 'Basic blocks', title: 'Toggle list', description: 'Toggles can hide and show content inside.', keywords: 'collapse details expand', icon: <ChevronRight />, shortcut: '>', run: turn('toggle') },
    { id: 'quote', group: 'Basic blocks', title: 'Quote', description: 'Capture a quote.', keywords: 'blockquote citation', icon: <Quote />, shortcut: '"', run: turn('quote') },
    {
      id: 'divider',
      group: 'Basic blocks',
      title: 'Divider',
      description: 'Visually divide blocks.',
      keywords: 'hr horizontal rule line separator',
      icon: <Minus />,
      shortcut: '---',
      run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
    {
      id: 'link-page',
      group: 'Basic blocks',
      title: 'Link to page',
      description: 'Link to an existing page.',
      keywords: 'reference mention page',
      icon: <Link2 />,
      run: (editor, range) => {
        openFromSlash('link');
        editor.chain().focus().deleteRange(range).insertContent('[[').run();
      }
    },
    { id: 'callout', group: 'Basic blocks', title: 'Callout', description: 'Make writing stand out.', keywords: 'note info warning tip aside', icon: glyph('💡', 'text-[18px]'), run: turn('callout') },

    { id: 'image', group: 'Media', title: 'Image', description: 'Upload or embed with a link.', keywords: 'picture photo img', icon: <Image />, run: insert({ type: 'image' }) },
    { id: 'video', group: 'Media', title: 'Video', description: 'Embed from YouTube, Vimeo, or upload.', keywords: 'movie youtube vimeo', icon: <Video />, run: insert({ type: 'video' }) },
    { id: 'audio', group: 'Media', title: 'Audio', description: 'Upload or embed with a link.', keywords: 'sound music mp3 podcast', icon: <AudioLines />, run: insert({ type: 'audio' }) },
    { id: 'code', group: 'Media', title: 'Code', description: 'Capture a code snippet.', keywords: 'snippet program syntax', icon: <Code2 />, shortcut: '```', run: turn('codeBlock') },
    { id: 'file', group: 'Media', title: 'File', description: 'Upload or embed with a link.', keywords: 'attachment upload pdf document', icon: <Paperclip />, run: insert({ type: 'fileBlock' }) },
    { id: 'bookmark', group: 'Media', title: 'Web bookmark', description: 'Save a link as a visual bookmark.', keywords: 'link url preview', icon: <Bookmark />, run: insert({ type: 'bookmark' }) },
    { id: 'embed', group: 'Media', title: 'Embed', description: 'For Figma, Maps, Loom, and more.', keywords: 'iframe figma maps loom codepen spotify', icon: <Globe />, run: insert({ type: 'embed' }) },

    { id: 'toc', group: 'Advanced blocks', title: 'Table of contents', description: 'Show an outline of this page.', keywords: 'toc outline headings', icon: <ListTree />, run: insert({ type: 'tableOfContents' }) },
    {
      id: 'equation',
      group: 'Advanced blocks',
      title: 'Block equation',
      description: 'Display a standalone math equation.',
      keywords: 'math latex formula katex tex',
      icon: <SquareFunction />,
      run: (editor, range) => {
        insertBlocks(editor, { type: 'blockMath', attrs: { latex: '' } }, range);
        const pos = editor.state.selection.from;
        requestAnimationFrame(() => openMathEditor(editor, 'block', pos));
      }
    },
    { id: 'columns2', group: 'Advanced blocks', title: '2 columns', description: 'Create two columns of blocks.', keywords: 'columns layout side', icon: <Columns2 />, run: insert(columnsJSON(2)) },
    { id: 'columns3', group: 'Advanced blocks', title: '3 columns', description: 'Create three columns of blocks.', keywords: 'columns layout', icon: <Columns3 />, run: insert(columnsJSON(3)) },
    { id: 'columns4', group: 'Advanced blocks', title: '4 columns', description: 'Create four columns of blocks.', keywords: 'columns layout', icon: <Columns4 />, run: insert(columnsJSON(4)) },

    {
      id: 'mention',
      group: 'Inline',
      title: 'Mention a page',
      description: 'Link to a page inline.',
      keywords: 'at reference link',
      icon: <AtSign />,
      run: (editor, range) => {
        openFromSlash('mention');
        editor.chain().focus().deleteRange(range).insertContent('@').run();
      }
    },
    {
      id: 'date',
      group: 'Inline',
      title: 'Date',
      description: 'Insert today’s date.',
      keywords: 'today time reminder calendar',
      icon: <CalendarDays />,
      run: (editor, range) => {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        editor.chain().focus().deleteRange(range).insertContent([{ type: 'dateMention', attrs: { date } }, { type: 'text', text: ' ' }]).run();
      }
    },
    {
      id: 'emoji',
      group: 'Inline',
      title: 'Emoji',
      description: 'Search for an emoji to place in text.',
      keywords: 'emoticon smiley face',
      icon: <Smile />,
      run: (editor, range) => {
        openFromSlash('emoji');
        editor.chain().focus().deleteRange(range).insertContent(':').run();
      }
    },
    {
      id: 'inline-equation',
      group: 'Inline',
      title: 'Inline equation',
      description: 'Insert math in a line of text.',
      keywords: 'math latex formula tex',
      icon: <Sigma />,
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).insertInlineMath({ latex: 'x' }).run();
        const pos = editor.state.selection.from - 1;
        requestAnimationFrame(() => openMathEditor(editor, 'inline', pos));
      }
    }
  ];

  const colorItem = (id: string, title: string, swatch: ReactNode, color: Parameters<Editor['commands']['setBlockColor']>[1]): SlashItem => ({
    id,
    group: 'Color',
    title,
    description: '',
    keywords: 'color colour',
    icon: swatch,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const block = selectedBlock(editor);
      if (block) editor.commands.setBlockColor(block.pos, color);
    }
  });
  items.push(colorItem('color-default', 'Default', <span className='notion-swatch'>A</span>, null));
  for (const color of COLORS) {
    items.push(colorItem(`color-${color}`, COLOR_LABELS[color], <span className='notion-swatch' data-text-color={color}>A</span>, color));
  }
  for (const color of COLORS) {
    items.push(
      colorItem(`bg-${color}`, `${COLOR_LABELS[color]} background`, <span className='notion-swatch' data-bg-color={color}>A</span>, `${color}_background`)
    );
  }
  return items;
}

/** Notion-like matching: titles that start with the query rank first. */
export function filterSlashItems(items: SlashItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items.filter((item) => item.group !== 'Color');
  const scored = items.flatMap((item) => {
    const title = item.title.toLowerCase();
    const score = title.startsWith(q)
      ? 0
      : title.split(/\s+/).some((word) => word.startsWith(q))
        ? 1
        : title.includes(q)
          ? 2
          : item.keywords.split(' ').some((word) => word.startsWith(q)) || item.shortcut === q
            ? 3
            : -1;
    return score < 0 ? [] : [{ item, score }];
  });
  return scored.sort((a, b) => a.score - b.score).map(({ item }) => item);
}
