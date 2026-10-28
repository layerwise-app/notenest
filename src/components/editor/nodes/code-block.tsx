import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { common, createLowlight } from 'lowlight';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';

const lowlight = createLowlight(common);

export const CODE_LANGUAGES: { id: string; label: string }[] = [
  { id: 'plaintext', label: 'Plain text' },
  { id: 'bash', label: 'Bash' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'css', label: 'CSS' },
  { id: 'diff', label: 'Diff' },
  { id: 'go', label: 'Go' },
  { id: 'graphql', label: 'GraphQL' },
  { id: 'xml', label: 'HTML' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'json', label: 'JSON' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'less', label: 'Less' },
  { id: 'lua', label: 'Lua' },
  { id: 'makefile', label: 'Makefile' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'objectivec', label: 'Objective-C' },
  { id: 'perl', label: 'Perl' },
  { id: 'php', label: 'PHP' },
  { id: 'python', label: 'Python' },
  { id: 'r', label: 'R' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'rust', label: 'Rust' },
  { id: 'scss', label: 'SCSS' },
  { id: 'shell', label: 'Shell' },
  { id: 'sql', label: 'SQL' },
  { id: 'swift', label: 'Swift' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'yaml', label: 'YAML' }
];

const ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  html: 'xml',
  sh: 'bash',
  zsh: 'bash',
  py: 'python',
  rb: 'ruby',
  yml: 'yaml',
  md: 'markdown',
  text: 'plaintext',
  txt: 'plaintext'
};

export const normalizeLanguage = (language: string | null | undefined) => {
  const value = (language ?? '').toLowerCase();
  return ALIASES[value] ?? value;
};

/** Code with syntax highlighting, a language picker, and a copy button. */
export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  }
}).configure({
  lowlight,
  defaultLanguage: 'plaintext',
  enableTabIndentation: true,
  tabSize: 2,
  HTMLAttributes: { class: 'notion-code' }
});

function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = normalizeLanguage(node.attrs.language) || 'plaintext';
  const label = CODE_LANGUAGES.find((item) => item.id === language)?.label ?? language;

  function copy() {
    void navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <NodeViewWrapper className='notion-code-block'>
      <div className='notion-code-toolbar' contentEditable={false}>
        {editor.isEditable ? (
          <DropdownMenu>
            <DropdownMenuTrigger className='notion-code-chip'>
              {label}
              <ChevronDown className='size-3' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='max-h-80 overflow-y-auto'>
              {CODE_LANGUAGES.map((item) => (
                <DropdownMenuItem key={item.id} onSelect={() => updateAttributes({ language: item.id })}>
                  {item.label}
                  {item.id === language ? <Check className='ml-auto size-3.5' /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className='notion-code-chip'>{label}</span>
        )}
        <button type='button' className='notion-code-chip' onClick={copy}>
          {copied ? <Check className='size-3' /> : <Copy className='size-3' />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre spellCheck={false}>
        <NodeViewContent<'code'> as='code' className={`hljs language-${language}`} />
      </pre>
    </NodeViewWrapper>
  );
}
