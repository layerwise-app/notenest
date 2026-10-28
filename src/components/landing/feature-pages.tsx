import { ImageIcon, RotateCcw, Search, Star, Trash2 } from 'lucide-react';
import { MockMenu, MockWindow, SidebarLabel, SidebarRow } from '~/components/landing/mock-ui';

/** A nested sidebar mid-drag, a page header with cover, and Trash. */
export function PagesVisual() {
  return (
    <div className='grid gap-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-5'>
      <MockWindow className='bg-sidebar p-1.5 text-sidebar-foreground'>
        <SidebarLabel>Favorites</SidebarLabel>
        <SidebarRow icon='🌱' label='Garden' expanded={false} />
        <SidebarLabel>Pages</SidebarLabel>
        <SidebarRow icon='🏡' label='Home' expanded />
        <SidebarRow icon='🌱' label='Garden' depth={1} expanded active />
        <SidebarRow icon='🥕' label='Spring planting' depth={2} expanded={false} />
        <SidebarRow icon='🐝' label='Pollinator list' depth={2} expanded={false} />
        <SidebarRow icon='🧾' label='Bills' depth={1} expanded={false} />
        <SidebarRow icon='📚' label='Reading list' expanded={false} />
        <div className='relative'>
          {/* Drop indicator and the row being dragged. */}
          <div className='mx-2 h-0.5 rounded-full bg-primary' />
          <div className='absolute top-1 left-6 z-10 w-[78%] rounded-md bg-popover opacity-90 shadow-(--menu-shadow)'>
            <SidebarRow icon='🍳' label='Recipes' expanded={false} />
          </div>
        </div>
        <SidebarRow icon='✈️' label='Kyoto trip' expanded={false} className='opacity-60' />
        <SidebarRow icon='🗓️' label='Weekly review' expanded={false} />
        <div className='mt-3'>
          <SidebarRow icon={<Trash2 className='size-4' />} label='Trash' active />
        </div>
      </MockWindow>

      <div className='grid content-start gap-4 sm:gap-5'>
        <MockWindow>
          <div className='nn-cover-warm relative h-20 sm:h-24'>
            <span className='absolute right-2.5 bottom-2 flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-[12px] text-foreground/80'>
              <ImageIcon className='size-3.5' />
              Change cover
            </span>
          </div>
          <div className='px-5 pb-4'>
            <div className='relative -mt-6 text-[44px] leading-none'>🌱</div>
            <div className='mt-2 flex items-center gap-2'>
              <span className='text-[22px] font-bold tracking-[-0.015em]'>Garden</span>
              <Star className='ml-auto size-4 fill-(--text-yellow) text-(--text-yellow)' />
            </div>
            <div className='mt-2 grid gap-1 text-[14px]'>
              <span>🥕 Spring planting</span>
              <span>🐝 Pollinator list</span>
            </div>
          </div>
        </MockWindow>

        <MockMenu className='p-1.5'>
          <div className='flex h-8 items-center gap-2 rounded-md px-2 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]'>
            <Search className='size-3.5' />
            Search pages in Trash
          </div>
          <div className='mt-1'>
            {[
              ['📄', 'Old roadmap', 'Home'],
              ['🧪', 'Test page', 'Garden'],
              ['🥗', 'Summer menu', 'Recipes']
            ].map(([icon, title, parent]) => (
              <div key={title} className='flex h-9 items-center gap-2 rounded-md px-2 first:bg-(--hover)'>
                <span>{icon}</span>
                <span className='min-w-0 truncate'>{title}</span>
                <span className='truncate text-[12px] text-muted-foreground'>in {parent}</span>
                <span className='ml-auto flex items-center gap-1 text-muted-foreground'>
                  <span className='grid size-6 place-items-center rounded'>
                    <RotateCcw className='size-3.5' />
                  </span>
                  <span className='grid size-6 place-items-center rounded'>
                    <Trash2 className='size-3.5' />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </MockMenu>
      </div>
    </div>
  );
}
