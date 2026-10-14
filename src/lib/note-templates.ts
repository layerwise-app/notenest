// Starter content for new notes. Templates are plain Markdown, so they
// sync like any other note and need no schema support.

export type TemplateId = 'meeting' | 'journal' | 'brief';

export type NoteTemplate = {
  id: TemplateId;
  name: string;
  build: (date: Date) => { title: string; content: string };
};

const longDate = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' });
const weekday = new Intl.DateTimeFormat('en', { weekday: 'long' });

/** Title used to find or create the daily note for `date`. */
export function dailyNoteTitle(date: Date) {
  return longDate.format(date);
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting',
    name: 'Meeting notes',
    build: (date) => ({
      title: 'Meeting notes',
      content: [
        `**Date:** ${longDate.format(date)}`,
        '**Attendees:** ',
        '',
        '## Agenda',
        '1. ',
        '',
        '## Notes',
        '',
        '',
        '## Action items',
        '- [ ] ',
        '',
        '#meetings'
      ].join('\n')
    })
  },
  {
    id: 'journal',
    name: 'Daily journal',
    build: (date) => ({
      title: dailyNoteTitle(date),
      content: [
        `${weekday.format(date)} · #journal`,
        '',
        '## Focus',
        '- [ ] ',
        '',
        '## Notes',
        '',
        '',
        '## Grateful for',
        '- '
      ].join('\n')
    })
  },
  {
    id: 'brief',
    name: 'Project brief',
    build: () => ({
      title: 'Project brief',
      content: [
        '## Goal',
        '',
        '',
        '## Scope',
        '- **In:** ',
        '- **Out:** ',
        '',
        '## Milestones',
        '- [ ] Kickoff',
        '- [ ] First draft',
        '- [ ] Launch',
        '',
        '## Open questions',
        '- ',
        '',
        '#projects'
      ].join('\n')
    })
  }
];

export function getTemplate(id: TemplateId) {
  const template = NOTE_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  return template;
}
