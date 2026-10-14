// Tokenizes Markdown source for the editor's highlight layer. The layer sits
// behind a transparent textarea, so tokens may only change color or
// background, never glyph widths; the caret stays aligned with the text.
import { codeAwareLines, tagSource, wikiLinkSource } from './note-text.ts';

export type TokenKind = 'text' | 'marker' | 'strong' | 'em' | 'code' | 'mark' | 'tag' | 'link' | 'url';
export type LineKind = 'plain' | 'heading' | 'quote' | 'done' | 'code' | 'rule';
export type Token = { kind: TokenKind; text: string };
export type HighlightLine = { kind: LineKind; tokens: Token[] };

const INLINE = new RegExp(
  [
    '(?<code>`[^`\\n]+`)',
    `(?<wiki>${wikiLinkSource()})`,
    '(?<link>\\[[^\\]\\n]+\\]\\([^)\\s]+\\))',
    '(?<strong>\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__)',
    '(?<em>\\*[^*\\s][^*\\n]*\\*|(?<![\\p{L}\\p{N}])_[^_\\s][^_\\n]*_(?![\\p{L}\\p{N}]))',
    '(?<mark>==[^=\\n]+==)',
    `(?<tag>${tagSource()})`,
    '(?<url>https?:\\/\\/[^\\s<>()]+)'
  ].join('|'),
  'gu'
);

const HEADING = /^(\s{0,3}#{1,6}\s+)(.*)$/;
const QUOTE = /^(\s*(?:>\s?)+)(.*)$/;
const LIST = /^(\s*(?:[-*+]|\d+[.)])\s+)(\[[ xX]\](?=\s|$))?(.*)$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;

/** Splits inline Markdown into colored spans; the concatenated text is unchanged. */
export function highlightInline(text: string): Token[] {
  const tokens: Token[] = [];
  const push = (kind: TokenKind, value: string) => {
    if (!value) return;
    const last = tokens.at(-1);
    if (last && last.kind === kind) last.text += value;
    else tokens.push({ kind, text: value });
  };
  const wrap = (match: string, open: number, close: number, kind: TokenKind) => {
    push('marker', match.slice(0, open));
    push(kind, match.slice(open, match.length - close));
    push('marker', match.slice(match.length - close));
  };

  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const value = match[0];
    const groups = match.groups ?? {};
    push('text', text.slice(cursor, match.index));
    cursor = match.index + value.length;
    if (groups.code) wrap(value, 1, 1, 'code');
    else if (groups.wiki) wrap(value, 2, 2, 'link');
    else if (groups.link) {
      const split = value.indexOf('](');
      push('marker', '[');
      push('link', value.slice(1, split));
      push('url', value.slice(split));
    } else if (groups.strong) wrap(value, 2, 2, 'strong');
    else if (groups.em) wrap(value, 1, 1, 'em');
    else if (groups.mark) wrap(value, 2, 2, 'mark');
    else if (groups.tag) push('tag', value);
    else push('url', value);
  }
  push('text', text.slice(cursor));
  return tokens;
}

/** Highlights a whole note, one entry per source line. */
export function highlightMarkdown(content: string): HighlightLine[] {
  return codeAwareLines(content).map(({ text, code }) => {
    if (code) return { kind: 'code', tokens: text ? [{ kind: 'text', text }] : [] };
    if (RULE.test(text)) return { kind: 'rule', tokens: [{ kind: 'marker', text }] };

    const heading = HEADING.exec(text);
    if (heading) {
      return { kind: 'heading', tokens: [{ kind: 'marker', text: heading[1] }, ...highlightInline(heading[2])] };
    }

    const quote = QUOTE.exec(text);
    const prefix: Token[] = [];
    let rest = text;
    let kind: LineKind = 'plain';
    if (quote) {
      prefix.push({ kind: 'marker', text: quote[1] });
      rest = quote[2];
      kind = 'quote';
    }
    const list = LIST.exec(rest);
    if (list) {
      prefix.push({ kind: 'marker', text: list[1] + (list[2] ?? '') });
      rest = list[3];
      if (list[2] && list[2] !== '[ ]') kind = 'done';
    }
    return { kind, tokens: [...prefix, ...highlightInline(rest)].filter((token) => token.text) };
  });
}
