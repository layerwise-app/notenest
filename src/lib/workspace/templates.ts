// Starter pages offered on an empty page and in the sidebar's Templates menu.
// Each builds editor JSON, so templates can use callouts, toggles, and to-dos.
import type { JSONContent } from '@tiptap/core';

export type TemplateId = 'meeting' | 'journal' | 'project' | 'reading';

export type PageTemplate = {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
  build: (date: Date) => { title: string; icon: string; content: JSONContent };
};

const longDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });
const p = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', ...(content.length ? { content } : {}) });
const h = (level: 1 | 2 | 3, value: string): JSONContent => ({ type: 'heading', attrs: { level }, content: [text(value)] });
const todo = (value = ''): JSONContent => ({ type: 'taskItem', attrs: { checked: false }, content: [p(...(value ? [text(value)] : []))] });
const bullet = (value = ''): JSONContent => ({ type: 'listItem', content: [p(...(value ? [text(value)] : []))] });
const bold = (value: string) => text(value, [{ type: 'bold' }]);
const callout = (icon: string, ...content: JSONContent[]): JSONContent => ({ type: 'callout', attrs: { icon, blockColor: 'gray_background' }, content });
const toggle = (summary: string, ...content: JSONContent[]): JSONContent => ({
  type: 'details',
  attrs: { open: true },
  content: [
    { type: 'detailsSummary', content: [text(summary)] },
    { type: 'detailsContent', content: content.length ? content : [p()] }
  ]
});
const date = (value: Date): JSONContent => ({ type: 'dateMention', attrs: { date: isoDate(value) } });
const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'meeting',
    name: 'Meeting notes',
    icon: '🗓️',
    description: 'Agenda, notes, and action items.',
    build: (now) => ({
      title: 'Meeting notes',
      icon: '🗓️',
      content: doc(
        callout('💡', p(bold('Date: '), date(now), text('  ·  '), bold('Attendees: '))),
        h(2, 'Agenda'),
        { type: 'orderedList', content: [bullet()] },
        h(2, 'Notes'),
        p(),
        h(2, 'Action items'),
        { type: 'taskList', content: [todo()] }
      )
    })
  },
  {
    id: 'journal',
    name: 'Daily journal',
    icon: '📔',
    description: 'Focus for the day, notes, and gratitude.',
    build: (now) => ({
      title: longDate.format(now),
      icon: '📔',
      content: doc(
        h(2, 'Today’s focus'),
        { type: 'taskList', content: [todo(), todo()] },
        h(2, 'Notes'),
        p(),
        toggle('Grateful for', { type: 'bulletList', content: [bullet()] })
      )
    })
  },
  {
    id: 'project',
    name: 'Project brief',
    icon: '🚀',
    description: 'Goals, scope, milestones, and open questions.',
    build: () => ({
      title: 'Project brief',
      icon: '🚀',
      content: doc(
        callout('🎯', p(bold('Goal: '), text('What does success look like?'))),
        h(2, 'Background'),
        p(),
        h(2, 'Scope'),
        { type: 'bulletList', content: [bullet('In scope: '), bullet('Out of scope: ')] },
        h(2, 'Milestones'),
        { type: 'taskList', content: [todo('Kickoff'), todo('First draft'), todo('Launch')] },
        toggle('Open questions')
      )
    })
  },
  {
    id: 'reading',
    name: 'Reading notes',
    icon: '📚',
    description: 'Summary, highlights, and takeaways.',
    build: () => ({
      title: 'Reading notes',
      icon: '📚',
      content: doc(
        p(bold('Author: '), text(' ')),
        h(2, 'Summary'),
        p(),
        h(2, 'Highlights'),
        { type: 'blockquote', content: [p()] },
        h(2, 'Takeaways'),
        { type: 'bulletList', content: [bullet()] }
      )
    })
  }
];

export const getTemplate = (id: TemplateId) => PAGE_TEMPLATES.find((template) => template.id === id)!;

const code = (language: string, value: string): JSONContent => ({ type: 'codeBlock', attrs: { language }, content: [text(value)] });
const kbd = (value: string) => text(value, [{ type: 'code' }]);

/** A tour of the editor, offered on an empty workspace. */
export function welcomePage(): { title: string; icon: string; content: JSONContent } {
  return {
    title: 'Getting started',
    icon: '👋',
    content: doc(
      p(text('Welcome to NoteNest. Everything here is a block you can edit, move, and turn into something else.')),
      callout('💡', p(text('Type '), kbd('/'), text(' anywhere for the block menu. Select text for the formatting toolbar.'))),
      h(2, 'Try it out'),
      {
        type: 'taskList',
        content: [
          todo('Click the checkbox to finish a to-do'),
          todo('Hover a block and drag ⋮⋮ to move it'),
          todo('Click ⋮⋮ to turn a block into a heading, list, or callout'),
          todo('Press ⌘K to search your pages')
        ]
      },
      toggle('Markdown shortcuts work as you type', {
        type: 'bulletList',
        content: [
          bullet('# , ## , ### for headings'),
          bullet('- or * for a bulleted list, 1. for a numbered list'),
          bullet('[] for a to-do, > for a toggle, " for a quote'),
          bullet('``` for code, --- for a divider'),
          bullet('**bold**, *italic*, `code`, ~~strike~~, ==highlight==')
        ]
      }),
      h(2, 'Rich content'),
      p(text('Add images, video, audio, files, embeds, and web bookmarks with '), kbd('/image'), text(', '), kbd('/video'), text(', or '), kbd('/embed'), text('. Paste or drop files to upload them once you sign in.')),
      code('typescript', "const greeting = 'Hello, NoteNest';\nconsole.log(greeting);"),
      { type: 'blockquote', content: [p(text('Pages nest inside pages. Use '), kbd('/page'), text(' or the + beside any page in the sidebar.'))] },
      { type: 'horizontalRule' },
      p(text('Mention a page with '), kbd('@'), text(', link one with '), kbd('[['), text(', and add an emoji with '), kbd(':'), text('.'))
    )
  };
}
