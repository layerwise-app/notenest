// The top of a page: cover, icon, title, and backlinks.
import { useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, ImageIcon, Smile } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { useAutosize } from '~/hooks/use-autosize';
import { randomIcon } from '~/lib/emoji-data';
import { isLive, pageTitle } from '~/lib/pages/page';
import type { Page } from '~/lib/pages/page';
import { updatePage, useWorkspace } from '~/lib/workspace/store';
import { uploadFile } from '~/lib/uploads';
import { filePath } from '~/lib/note-files';
import { cn } from '~/lib/utils';
import { COVER_GRADIENTS, coverStyle, randomCover } from './covers';
import { EmojiPicker } from './EmojiPicker';

export function PageHeader({
  page,
  editable,
  signedIn,
  onRequestSignIn,
  onTitleEnter,
  onTitleDown
}: {
  page: Page;
  editable: boolean;
  signedIn: boolean;
  onRequestSignIn: () => void;
  /** Enter in the title: move into the body, carrying any text after the caret. */
  onTitleEnter: (rest: string) => void;
  onTitleDown: () => void;
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [iconOpen, setIconOpen] = useState(false);
  useAutosize(titleRef, page.title, page.id);
  const hasCover = Boolean(page.cover);

  return (
    <div className='notion-page-header'>
      {hasCover ? (
        <Cover page={page} editable={editable} signedIn={signedIn} onRequestSignIn={onRequestSignIn} />
      ) : (
        <div className='h-[72px] max-sm:h-12' />
      )}
      <div className='notion-page-inner'>
        {page.icon ? (
          <Popover open={iconOpen} onOpenChange={(open) => setIconOpen(open && editable)}>
            <PopoverTrigger asChild>
              <button
                type='button'
                className={cn('notion-page-icon', hasCover && 'has-cover')}
                aria-label='Change icon'
                disabled={!editable}
              >
                {page.icon}
              </button>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-auto p-0'>
              <EmojiPicker
                onSelect={(emoji) => {
                  updatePage(page.id, { icon: emoji });
                  setIconOpen(false);
                }}
                onRemove={() => {
                  updatePage(page.id, { icon: null });
                  setIconOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        ) : null}

        {editable ? (
          <div className={cn('notion-page-controls', page.icon && 'mt-1')}>
            {!page.icon ? (
              <button type='button' className='notion-button text-[14px]' onClick={() => updatePage(page.id, { icon: randomIcon() })}>
                <Smile className='size-4' /> Add icon
              </button>
            ) : null}
            {!page.cover ? (
              <button type='button' className='notion-button text-[14px]' onClick={() => updatePage(page.id, { cover: randomCover(), coverY: 50 })}>
                <ImageIcon className='size-4' /> Add cover
              </button>
            ) : null}
          </div>
        ) : null}

        <textarea
          ref={titleRef}
          rows={1}
          value={page.title}
          readOnly={!editable}
          placeholder='New page'
          aria-label='Page title'
          onChange={(event) => updatePage(page.id, { title: event.target.value.replace(/\n/g, ' ') })}
          onKeyDown={(event) => {
            const target = event.currentTarget;
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              const rest = target.value.slice(target.selectionEnd);
              if (rest) updatePage(page.id, { title: target.value.slice(0, target.selectionStart) });
              onTitleEnter(rest);
            } else if (event.key === 'ArrowDown' && target.selectionStart === target.value.length) {
              event.preventDefault();
              onTitleDown();
            }
          }}
          className='notion-title'
          data-page-title
        />
        <Backlinks page={page} />
      </div>
    </div>
  );
}

function Backlinks({ page }: { page: Page }) {
  const pages = useWorkspace((state) => state.pages);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const needle = `"pageId":"${page.id}"`;
  const linking = Object.values(pages).filter(
    (other) => other.id !== page.id && isLive(other) && other.content.includes(needle) && !(other.id === page.parentId && !other.content.includes(`"type":"pageMention","attrs":{"pageId":"${page.id}"`))
  );
  if (!linking.length) return null;
  return (
    <div className='mt-1 mb-2'>
      <button type='button' className='notion-button -ml-2 text-[14px] text-muted-foreground' onClick={() => setOpen((value) => !value)}>
        <ArrowUpRight className='size-4' />
        {linking.length} backlink{linking.length === 1 ? '' : 's'}
      </button>
      {open ? (
        <div className='mt-1 flex flex-col'>
          {linking.map((other) => (
            <button
              key={other.id}
              type='button'
              className='notion-button -ml-2 justify-start text-[14px]'
              onClick={() => void navigate({ to: '/notes/$pageId', params: { pageId: other.id } })}
            >
              <span className='w-5 text-center'>{other.icon ?? '📄'}</span>
              <span className='truncate border-b border-[var(--border)] font-medium'>{pageTitle(other)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Cover({ page, editable, signedIn, onRequestSignIn }: { page: Page; editable: boolean; signedIn: boolean; onRequestSignIn: () => void }) {
  const { background, image } = coverStyle(page.cover);
  const [repositioning, setRepositioning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [y, setY] = useState(page.coverY);
  const ref = useRef<HTMLDivElement>(null);

  function onPointerDown(event: React.PointerEvent) {
    if (!repositioning || !ref.current) return;
    event.preventDefault();
    const startY = event.clientY;
    const startValue = y;
    const height = ref.current.clientHeight;
    const onMove = (move: PointerEvent) => setY(Math.max(0, Math.min(100, startValue - ((move.clientY - startY) / height) * 100)));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div
      ref={ref}
      className={cn('notion-cover group', repositioning && 'cursor-move')}
      style={image ? undefined : { background }}
      onPointerDown={onPointerDown}
    >
      {image ? <img src={image} alt='' draggable={false} style={{ objectPosition: `center ${repositioning ? y : page.coverY}%` }} /> : null}
      {repositioning ? <div className='notion-cover-hint'>Drag image to reposition</div> : null}
      {editable ? (
        <div className={cn('notion-cover-controls', (repositioning || pickerOpen) && 'opacity-100')}>
          {repositioning ? (
            <>
              <button
                type='button'
                className='notion-cover-button'
                onClick={() => {
                  updatePage(page.id, { coverY: Math.round(y) });
                  setRepositioning(false);
                }}
              >
                Save position
              </button>
              <button type='button' className='notion-cover-button' onClick={() => { setY(page.coverY); setRepositioning(false); }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button type='button' className='notion-cover-button'>Change cover</button>
                </PopoverTrigger>
                <PopoverContent align='end' className='w-[440px] max-w-[calc(100vw-24px)] p-0'>
                  <CoverPicker page={page} signedIn={signedIn} onRequestSignIn={onRequestSignIn} onDone={() => setPickerOpen(false)} />
                </PopoverContent>
              </Popover>
              {image ? (
                <button type='button' className='notion-cover-button' onClick={() => { setY(page.coverY); setRepositioning(true); }}>
                  Reposition
                </button>
              ) : null}
              <button type='button' className='notion-cover-button' onClick={() => updatePage(page.id, { cover: null })}>
                Remove
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CoverPicker({ page, signedIn, onRequestSignIn, onDone }: { page: Page; signedIn: boolean; onRequestSignIn: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<'gallery' | 'upload' | 'link'>('gallery');
  const [link, setLink] = useState('');
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    setProgress(0);
    try {
      const attached = await uploadFile(file, page.id, setProgress);
      updatePage(page.id, { cover: filePath(attached.id), coverY: 50 });
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t upload the image.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className='flex flex-col'>
      <div className='flex gap-1 border-b border-border px-2 pt-1.5'>
        {(['gallery', 'upload', 'link'] as const).map((item) => (
          <button
            key={item}
            type='button'
            onClick={() => setTab(item)}
            className={cn('-mb-px border-b-2 px-2 pb-1.5 text-[14px] capitalize', tab === item ? 'border-foreground' : 'border-transparent text-muted-foreground')}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === 'gallery' ? (
        <div className='grid max-h-72 grid-cols-4 gap-2 overflow-y-auto p-3'>
          {COVER_GRADIENTS.map((item) => (
            <button
              key={item.id}
              type='button'
              aria-label={item.id}
              className='h-16 rounded-[4px] ring-offset-2 hover:opacity-85 focus-visible:ring-2'
              style={{ background: item.css }}
              onClick={() => {
                updatePage(page.id, { cover: `gradient:${item.id}`, coverY: 50 });
                onDone();
              }}
            />
          ))}
        </div>
      ) : tab === 'upload' ? (
        <div className='p-3'>
          {signedIn ? (
            <label className='notion-button h-9 w-full cursor-pointer justify-center border border-border'>
              {progress === null ? 'Upload file' : `Uploading… ${Math.round(progress * 100)}%`}
              <input type='file' accept='image/*' className='hidden' disabled={progress !== null} onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} />
            </label>
          ) : (
            <button type='button' className='notion-button h-9 w-full justify-center border border-border' onClick={onRequestSignIn}>
              Sign in to upload images
            </button>
          )}
          <p className='mt-2 text-center text-[12px] text-muted-foreground'>Images wider than 1500 pixels work best.</p>
        </div>
      ) : (
        <form
          className='flex flex-col gap-2 p-3'
          onSubmit={(event) => {
            event.preventDefault();
            const value = link.trim();
            if (!/^https?:\/\//i.test(value)) {
              toast.error('Paste an image link that starts with https://');
              return;
            }
            updatePage(page.id, { cover: value, coverY: 50 });
            onDone();
          }}
        >
          <input autoFocus value={link} onChange={(event) => setLink(event.target.value)} placeholder='Paste an image link…' className='notion-input w-full' />
          <button type='submit' className='mx-auto h-8 w-60 rounded-md bg-primary text-[14px] font-medium text-primary-foreground hover:opacity-90'>
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
