import { Download, Globe, Paperclip, Play, Volume2 } from 'lucide-react';
import { MockPhoto, MockWindow } from '~/components/landing/mock-ui';

/** A page holding an image, a video embed, a bookmark, a file, and audio. */
export function MediaVisual() {
  return (
    <MockWindow className='px-5 py-6 text-[14px] sm:px-8 sm:py-7'>
      <div className='text-[22px] font-bold tracking-[-0.015em]'>🥾 Ridge trail weekend</div>
      <div className='mt-4 grid gap-4 sm:grid-cols-2'>
        <div className='grid content-start gap-3'>
          <MockPhoto className='aspect-[4/3] w-full' />
          <div className='flex h-10 items-center gap-2.5 rounded-md px-2.5 shadow-[inset_0_0_0_1px_var(--border)]'>
            <Paperclip className='size-4 text-muted-foreground' />
            <span className='truncate'>Trail map.pdf</span>
            <span className='text-[12.5px] text-muted-foreground'>2.4 MB</span>
            <Download className='ml-auto size-4 text-muted-foreground' />
          </div>
        </div>

        <div className='grid content-start gap-3'>
          <VideoEmbed />
          <div className='flex overflow-hidden rounded-md shadow-[inset_0_0_0_1px_var(--border)]'>
            <div className='min-w-0 flex-1 px-3 py-2.5'>
              <div className='truncate font-medium'>Hiking - Wikipedia</div>
              <p className='mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground'>
                Hiking is a long, vigorous walk, usually on trails or footpaths in the countryside.
              </p>
              <div className='mt-1.5 flex items-center gap-1.5 text-[12px]'>
                <Globe className='size-3.5 text-muted-foreground' />
                <span className='truncate'>en.wikipedia.org</span>
              </div>
            </div>
            <div className='nn-cover-warm hidden w-[30%] shrink-0 min-[420px]:block' />
          </div>
          <div className='flex h-10 items-center gap-3 rounded-full bg-(--bg-gray) px-3 dark:bg-white/[0.06]'>
            <Play className='size-4 fill-current' />
            <span className='text-[12px] text-muted-foreground tabular-nums'>1:12 / 3:42</span>
            <span className='relative h-1 flex-1 rounded-full bg-foreground/15'>
              <span className='absolute inset-y-0 left-0 w-1/3 rounded-full bg-foreground/70' />
            </span>
            <Volume2 className='size-4 text-muted-foreground' />
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

function VideoEmbed() {
  return (
    <div className='relative aspect-video overflow-hidden rounded-md bg-[linear-gradient(135deg,#2f3a33_0%,#4f6650_55%,#83946f_100%)]'>
      <span className='absolute -bottom-[30%] -left-[10%] h-[70%] w-[70%] rounded-[50%] bg-black/25' />
      <span className='absolute -right-[10%] -bottom-[35%] h-[75%] w-[65%] rounded-[50%] bg-black/30' />
      <div className='absolute inset-x-0 top-0 truncate bg-linear-to-b from-black/50 to-transparent px-3 pt-2 pb-4 text-[12.5px] font-medium text-white'>
        Packing for a three-day hike
      </div>
      <span className='absolute top-1/2 left-1/2 grid h-9 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-[#e62117]'>
        <Play className='size-4 fill-white text-white' />
      </span>
      <span className='absolute bottom-2 left-2.5 rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white'>
        youtube.com
      </span>
    </div>
  );
}
