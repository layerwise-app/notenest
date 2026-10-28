// The empty state of a media block ("Add an image", …) and its Upload /
// Embed link popover, plus the row shown while a file uploads.
import type { Editor } from '@tiptap/core';
import type { NodeViewProps } from '@tiptap/react';
import { Bookmark, Code, Film, ImageIcon, Paperclip, Volume2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import { useEditorEnv } from '../editor-env';
import { isNodeSelected, useEditable } from './parts';
import type { UploadState } from './upload-store';
import { safeHttpUrl } from './urls';

export type MediaKind = 'image' | 'video' | 'audio' | 'file' | 'embed' | 'bookmark';

type Copy = { icon: LucideIcon; label: string; placeholder: string; submit: string; accept?: string; hint?: string };

const COPY: Record<MediaKind, Copy> = {
  image: { icon: ImageIcon, label: 'Add an image', placeholder: 'Paste the image link…', submit: 'Embed image', accept: 'image/*' },
  video: { icon: Film, label: 'Embed a video', placeholder: 'Paste the video link…', submit: 'Embed video', accept: 'video/*', hint: 'Works with YouTube, Vimeo, Loom, and video files.' },
  audio: { icon: Volume2, label: 'Add audio', placeholder: 'Paste the audio link…', submit: 'Embed audio', accept: 'audio/*' },
  file: { icon: Paperclip, label: 'Upload or embed a file', placeholder: 'Paste the file link…', submit: 'Embed file' },
  embed: { icon: Code, label: 'Embed anything', placeholder: 'Paste in https://…', submit: 'Embed link', hint: 'Works with YouTube, Figma, Google Maps, CodePen, Spotify, and more.' },
  bookmark: { icon: Bookmark, label: 'Add a web bookmark', placeholder: 'Paste in https://…', submit: 'Create bookmark', hint: 'Create a visual bookmark from a link.' }
};

export const mediaIcon = (kind: MediaKind) => COPY[kind].icon;

type PlaceholderProps = {
  kind: MediaKind;
  editor: Editor;
  getPos: NodeViewProps['getPos'];
  selected: boolean;
  /** Receives a checked http(s) URL. */
  onLink: (url: string) => void;
  /** Omitted for blocks that only take links. */
  onFile?: (file: File) => void;
};

export function MediaPlaceholder({ kind, editor, getPos, selected, onLink, onFile }: PlaceholderProps) {
  const editable = useEditable(editor);
  const { signedIn, requestSignIn } = useEditorEnv();
  const copy = COPY[kind];
  const Icon = copy.icon;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'upload' | 'link'>(onFile ? 'upload' : 'link');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refocusEditor = useRef(false);

  // A block just added from the slash menu arrives selected: open right away
  // (on mount only). Wait a frame so the block is in the page before the
  // popover measures it.
  useEffect(() => {
    if (!editor.isEditable || !isNodeSelected(editor, getPos)) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const submitLink = (event: React.FormEvent) => {
    event.preventDefault();
    const url = safeHttpUrl(link);
    if (!url) {
      setError('Enter a valid link.');
      return;
    }
    setOpen(false);
    onLink(url);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={anchor}
          className={cn('media-placeholder', selected && 'is-selected', !editable && 'is-readonly')}
          onClick={() => editable && setOpen(true)}
        >
          <Icon className='media-placeholder-icon' />
          <span>{copy.label}</span>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align='center'
        sideOffset={6}
        className='media-popover w-auto gap-0 p-0'
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (refocusEditor.current) editor.commands.focus();
          refocusEditor.current = false;
        }}
        onEscapeKeyDown={() => {
          refocusEditor.current = true;
        }}
        onInteractOutside={(event) => {
          // Clicking the placeholder again keeps the popover open.
          if (anchor.current?.contains(event.target as Node)) event.preventDefault();
        }}
        // Keep keys typed here away from editor-level handlers in the React tree.
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div ref={panel}>
          <div className='media-popover-tabs' role='tablist'>
            {onFile && (
              <button type='button' role='tab' aria-selected={tab === 'upload'} onClick={() => setTab('upload')}>
                Upload
              </button>
            )}
            <button type='button' role='tab' aria-selected={tab === 'link'} onClick={() => setTab('link')}>
              Embed link
            </button>
          </div>
          {tab === 'upload' && onFile ? (
            <div className='media-popover-panel'>
              {signedIn ? (
                <>
                  <button type='button' className='media-upload-button' data-autofocus onClick={() => fileInput.current?.click()}>
                    Upload file
                  </button>
                  <input
                    ref={fileInput}
                    type='file'
                    accept={copy.accept}
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      setOpen(false);
                      onFile(file);
                    }}
                  />
                </>
              ) : (
                <button
                  type='button'
                  className='media-upload-button'
                  data-autofocus
                  onClick={() => {
                    setOpen(false);
                    requestSignIn();
                  }}
                >
                  Sign in to upload files
                </button>
              )}
            </div>
          ) : (
            <form className='media-popover-panel' onSubmit={submitLink}>
              <input
                className='notion-input media-link-input'
                data-autofocus
                value={link}
                placeholder={copy.placeholder}
                autoComplete='off'
                spellCheck={false}
                autoFocus
                onChange={(event) => {
                  setLink(event.target.value);
                  setError(null);
                }}
              />
              <button type='submit' className='media-primary-button'>
                {copy.submit}
              </button>
              {error && <p className='media-popover-error'>{error}</p>}
              {copy.hint && <p className='media-popover-hint'>{copy.hint}</p>}
            </form>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className='media-progress' role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
      <div style={{ width: `${Math.round(progress * 100)}%` }} />
    </div>
  );
}

/** The block while its file uploads. */
export function UploadingRow({ kind, upload }: { kind: MediaKind; upload: UploadState | undefined }) {
  const Icon = COPY[kind].icon;
  const progress = upload?.progress ?? 0;
  return (
    <div className='media-placeholder is-uploading' aria-busy='true'>
      <Icon className='media-placeholder-icon' />
      <span className='media-uploading-name'>{upload?.name ?? 'Uploading…'}</span>
      <span className='media-uploading-percent'>{progress >= 1 ? 'Finishing…' : `${Math.round(progress * 100)}%`}</span>
      <UploadProgress progress={progress} />
    </div>
  );
}
