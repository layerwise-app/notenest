import { FileText, Plus } from 'lucide-react';
import { useImperativeHandle, useRef, useState } from 'react';
import type * as React from 'react';
import { formatCommandForKey, FORMAT_COMMANDS } from '~/components/notes/editor-commands';
import type { FormatCommandId } from '~/components/notes/editor-commands';
import { useAutosize } from '~/hooks/use-autosize';
import { applyEditorState, caretCoordinates } from '~/lib/caret';
import { continueList, indentListLines, insertWikiLink } from '~/lib/markdown-format';
import type { EditorState } from '~/lib/markdown-format';
import { highlightMarkdown } from '~/lib/markdown-highlight';
import type { LineKind, TokenKind } from '~/lib/markdown-highlight';
import { normalizeTitle } from '~/lib/note-text';
import type { Note } from '~/lib/notes';
import { cn } from '~/lib/utils';

export type MarkdownEditorHandle = {
  focus: () => void;
  format: (command: FormatCommandId) => void;
  /** Inserts `[[` at the caret and opens the note picker. */
  startWikiLink: () => void;
  revealLine: (line: number) => void;
};

type MarkdownEditorProps = {
  ref?: React.Ref<MarkdownEditorHandle>;
  value: string;
  onChange: (value: string) => void;
  notes: Note[];
  currentNoteId: string;
  onCreateNote: (title: string) => void;
  variant: 'prose' | 'source';
};

type Suggest = { from: number; query: string; top: number; left: number };
type Option = { kind: 'note' | 'create'; title: string; id: string };

const OPEN_LINK = /\[\[([^[\]\n|]{0,80})$/;

// The textarea and the highlight layer must share every metric so the
// transparent textarea's caret and selection line up with the colored text.
const TEXT_METRICS = {
  prose: 'font-serif text-[18px] leading-[1.7]',
  source: 'font-mono text-[13.5px] leading-[1.8]'
};
// Faux bold keeps glyph widths identical to the regular-weight textarea.
const FAUX_BOLD = 'text-foreground [text-shadow:0.4px_0_0_currentColor]';
const LINE_CLASS: Record<LineKind, string> = {
  plain: '',
  heading: FAUX_BOLD,
  quote: 'text-muted-foreground',
  done: 'text-muted-foreground line-through decoration-muted-foreground/40',
  code: 'text-foreground/75',
  rule: ''
};
const TOKEN_CLASS: Record<TokenKind, string> = {
  text: '',
  marker: 'text-muted-foreground/60',
  strong: FAUX_BOLD,
  em: 'text-foreground',
  code: 'rounded-[3px] bg-muted text-foreground',
  mark: 'rounded-[3px] bg-highlight text-foreground',
  tag: 'text-primary',
  link: 'text-primary',
  url: 'text-muted-foreground'
};

export function MarkdownEditor({
  ref,
  value,
  onChange,
  notes,
  currentNoteId,
  onCreateNote,
  variant
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useAutosize(textareaRef, value, variant);

  function state(): EditorState | null {
    const element = textareaRef.current;
    if (!element) return null;
    return { text: element.value, start: element.selectionStart, end: element.selectionEnd };
  }

  function apply(next: EditorState) {
    if (textareaRef.current) applyEditorState(textareaRef.current, next, onChange);
    updateSuggest();
  }

  function format(command: FormatCommandId) {
    const current = state();
    if (current) apply(FORMAT_COMMANDS[command].run(current));
  }

  /** Opens the note picker while the caret sits right after an unclosed `[[`. */
  function updateSuggest() {
    const element = textareaRef.current;
    if (!element || element.selectionStart !== element.selectionEnd) {
      setSuggest(null);
      return;
    }
    const caret = element.selectionStart;
    const match = OPEN_LINK.exec(element.value.slice(0, caret));
    if (!match) {
      setSuggest(null);
      return;
    }
    const from = caret - match[0].length;
    const coords = caretCoordinates(element, from);
    const left = Math.max(0, Math.min(coords.left, element.clientWidth - 288));
    if (suggest?.query !== match[1]) setActiveIndex(0);
    setSuggest({ from, query: match[1], top: coords.top + coords.height + 4, left });
  }

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    format,
    startWikiLink: () => {
      const current = state();
      if (!current) return;
      const selected = current.text.slice(current.start, current.end);
      const inserted = `[[${selected}]]`;
      const caret = current.start + 2 + selected.length;
      apply({
        text: current.text.slice(0, current.start) + inserted + current.text.slice(current.end),
        start: caret,
        end: caret
      });
    },
    revealLine: (line: number) => {
      const element = textareaRef.current;
      if (!element) return;
      const lines = element.value.split('\n');
      const index = lines.slice(0, line).reduce((total, text) => total + text.length + 1, 0);
      element.focus({ preventScroll: true });
      element.setSelectionRange(index, index);
      const scroller = element.closest<HTMLElement>('[data-scroll-root]');
      if (!scroller) return;
      const offset = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      const top = scroller.scrollTop + offset + caretCoordinates(element, index).top - 120;
      scroller.scrollTo({ top, behavior: 'smooth' });
    }
  }));

  const options = suggest ? suggestOptions(notes, currentNoteId, suggest.query) : [];
  const open = suggest !== null && options.length > 0;

  function choose(option: Option) {
    const current = state();
    if (!current || !suggest) return;
    if (option.kind === 'create') onCreateNote(option.title);
    apply(insertWikiLink({ text: current.text, start: suggest.from + 2, end: current.end }, option.title));
    setSuggest(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((index) => (index + step + options.length) % options.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        choose(options[Math.min(activeIndex, options.length - 1)]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setSuggest(null);
        return;
      }
    }

    const command = formatCommandForKey(event);
    if (command) {
      event.preventDefault();
      format(command);
      return;
    }
    const current = state();
    if (!current || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      const next = continueList(current);
      if (next) {
        event.preventDefault();
        apply(next);
      }
    } else if (event.key === 'Tab') {
      // Only list lines capture Tab, so keyboard users can still tab out.
      const next = indentListLines(current, event.shiftKey);
      if (next) {
        event.preventDefault();
        apply(next);
      }
    }
  }

  return (
    <div className='relative'>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden break-words whitespace-pre-wrap text-ink-soft',
          TEXT_METRICS[variant]
        )}
      >
        {highlightMarkdown(value).map((line, index) => (
          <span key={index} className={LINE_CLASS[line.kind]}>
            {line.tokens.map((token, tokenIndex) => (
              <span key={tokenIndex} className={TOKEN_CLASS[token.kind]}>
                {token.text}
              </span>
            ))}
            {'\n'}
          </span>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          updateSuggest();
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (event.key.startsWith('Arrow') && !open) updateSuggest();
        }}
        onClick={updateSuggest}
        onBlur={() => setSuggest(null)}
        placeholder='Start writing…'
        aria-label='Note body (Markdown)'
        spellCheck
        rows={1}
        className={cn(
          'relative block min-h-[50vh] w-full resize-none overflow-hidden bg-transparent text-transparent caret-primary outline-none selection:bg-primary/20 placeholder:text-muted-foreground/70',
          TEXT_METRICS[variant]
        )}
      />
      {open ? (
        <div
          role='listbox'
          aria-label='Link to note'
          style={{ top: suggest.top, left: suggest.left }}
          className='absolute z-30 w-72 rounded-lg border border-border bg-popover p-1 font-sans text-popover-foreground shadow-lg'
        >
          <div className='px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
            Link to note
          </div>
          {options.map((option, index) => (
            <button
              key={option.id}
              type='button'
              role='option'
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px]',
                index === activeIndex && 'bg-accent text-accent-foreground'
              )}
            >
              {option.kind === 'note' ? (
                <FileText className='size-4 shrink-0 text-muted-foreground' />
              ) : (
                <Plus className='size-4 shrink-0 text-primary' />
              )}
              <span className='truncate'>
                {option.kind === 'create' ? `Create “${option.title}”` : option.title}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function suggestOptions(notes: Note[], currentNoteId: string, query: string): Option[] {
  const wanted = normalizeTitle(query);
  const matches = notes
    .filter(
      (note) =>
        note.deletedAt === null &&
        note.id !== currentNoteId &&
        note.title.trim() &&
        normalizeTitle(note.title).includes(wanted)
    )
    .sort((a, b) => {
      const aStarts = normalizeTitle(a.title).startsWith(wanted);
      const bStarts = normalizeTitle(b.title).startsWith(wanted);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 6);
  const options: Option[] = matches.map((note) => ({ kind: 'note', title: note.title.trim(), id: note.id }));
  const exact = matches.some((note) => normalizeTitle(note.title) === wanted);
  if (wanted && !exact) options.push({ kind: 'create', title: query.trim(), id: 'create' });
  return options;
}
