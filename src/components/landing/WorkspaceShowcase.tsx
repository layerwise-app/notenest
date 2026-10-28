import {
  ChevronRight,
  ChevronsUpDown,
  CloudCheck,
  Ellipsis,
  Menu,
  Plus,
  Search,
  SquarePen,
  Star,
  Trash2
} from 'lucide-react';
import { NoteNestMark } from '~/components/brand';
import {
  DateMention,
  MockKbd,
  MockPhoto,
  MockTodo,
  MockWindow,
  PageMention,
  SidebarLabel,
  SidebarRow
} from '~/components/landing/mock-ui';
import { SlashDemo } from '~/components/landing/slash-demo';

/** The hero product shot: sidebar tree plus an open page, built in HTML. */
export function WorkspaceShowcase() {
  return (
    <div aria-hidden='true' className='relative mx-auto w-full max-w-[1180px] select-none'>
      <MockWindow className='grid h-[650px] text-[15px] md:h-[680px] md:grid-cols-[244px_minmax(0,1fr)]'>
        <ShowcaseSidebar />
        <ShowcasePage />
      </MockWindow>
    </div>
  );
}

function ShowcaseSidebar() {
  return (
    <aside className='hidden flex-col border-r border-sidebar-border bg-sidebar p-1.5 text-sidebar-foreground md:flex'>
      <div className='flex h-10 items-center gap-2 px-2'>
        <NoteNestMark className='size-5 rounded-[5px]' />
        <span className='text-[14px] font-semibold text-foreground'>NoteNest</span>
        <ChevronsUpDown className='size-3.5 text-muted-foreground' />
        <SquarePen className='ml-auto size-4 text-muted-foreground' />
      </div>
      <SidebarRow icon={<Search className='size-4' />} label='Search' trailing={<MockKbd>⌘K</MockKbd>} />
      <SidebarRow icon={<Plus className='size-4' />} label='New page' />

      <SidebarLabel>Favorites</SidebarLabel>
      <SidebarRow icon='✈️' label='Kyoto trip' expanded={false} />
      <SidebarRow icon='🗓️' label='Weekly review' expanded={false} />

      <SidebarLabel>Pages</SidebarLabel>
      <SidebarRow icon='🚀' label='Website relaunch' expanded active />
      <SidebarRow icon='📝' label='Homepage copy' depth={1} expanded={false} />
      <SidebarRow icon='🎨' label='Brand assets' depth={1} expanded={false} />
      <SidebarRow icon='💬' label='Pricing notes' depth={1} expanded={false} />
      <SidebarRow icon='📚' label='Reading list' expanded={false} />
      <SidebarRow icon='🍳' label='Recipes' expanded={false} />
      <SidebarRow icon='🌱' label='Garden' expanded={false} />
      <SidebarRow icon='✈️' label='Kyoto trip' expanded={false} />
      <SidebarRow icon='🗓️' label='Weekly review' expanded={false} />

      <div className='mt-auto'>
        <SidebarRow icon={<Trash2 className='size-4' />} label='Trash' />
      </div>
    </aside>
  );
}

function ShowcasePage() {
  return (
    <div className='relative flex min-w-0 flex-col overflow-hidden'>
      <div className='flex h-11 shrink-0 items-center gap-1.5 px-3 text-[14px]'>
        <Menu className='size-4 text-muted-foreground md:hidden' />
        <span className='flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5'>
          <span>🚀</span>
          <span className='truncate'>Website relaunch</span>
        </span>
        <span className='ml-auto hidden items-center gap-1.5 text-[13px] text-muted-foreground sm:flex'>
          <CloudCheck className='size-4' />
          Synced
        </span>
        <Star className='ml-2 size-4 fill-(--text-yellow) text-(--text-yellow)' />
        <Ellipsis className='ml-2 size-4 text-muted-foreground' />
      </div>

      <div className='relative flex-1 overflow-hidden'>
        <div className='nn-cover h-[96px] md:h-[132px]' />
        <div className='mx-auto max-w-[680px] px-5 sm:px-10 lg:px-12'>
          <div className='relative -mt-[34px] text-[60px] leading-none md:text-[68px]'>🚀</div>
          <h3 className='mt-3 text-[30px] leading-tight font-bold tracking-[-0.02em] md:text-[38px]'>
            Website relaunch
          </h3>

          <div className='mt-4 flex gap-2.5 rounded-md bg-(--bg-yellow) px-3.5 py-3'>
            <span className='leading-6'>💡</span>
            <p className='leading-6'>
              Launch is <DateMention>Nov 12</DateMention>. Copy freezes the Monday before.
            </p>
          </div>

          <div className='mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,1fr)_200px] lg:grid-cols-[minmax(0,1fr)_220px]'>
            <div className='min-w-0'>
              <h4 className='mb-1.5 text-[20px] font-semibold tracking-[-0.01em]'>This week</h4>
              <MockTodo checked>Final homepage copy</MockTodo>
              <MockTodo checked>Export hero images</MockTodo>
              <MockTodo checked={false}>
                Review <PageMention icon='💬'>Pricing notes</PageMention>
              </MockTodo>
              <MockTodo checked={false}>QA on mobile</MockTodo>
              <SlashDemo className='mt-0.5' />
            </div>
            <MockPhoto className='hidden aspect-[4/3] w-full sm:block' />
          </div>

          <div className='mt-2 flex h-[30px] items-center gap-1.5'>
            <ChevronRight className='size-4 rotate-90 text-foreground/70' />
            <span>Redirects from the old site</span>
          </div>
          <div className='ml-6 rounded-md bg-(--bg-gray)/60 px-4 pt-2.5 pb-3 font-mono text-[12.5px] leading-[1.7] dark:bg-white/[0.04]'>
            <div className='mb-1 font-sans text-[11.5px] text-muted-foreground'>TypeScript</div>
            <CodeLines />
          </div>
        </div>
        <div className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-background to-transparent' />
      </div>
    </div>
  );
}

const keyword = 'text-(--text-purple)';
const string = 'text-(--text-green)';
const number = 'text-(--text-orange)';

function CodeLines() {
  const route = (from: string, to: string) => (
    <div className='truncate pl-4'>
      {'{ '}from: <span className={string}>'{from}'</span>, to: <span className={string}>'{to}'</span>, status:{' '}
      <span className={number}>301</span>
      {' },'}
    </div>
  );
  return (
    <>
      <div>
        <span className={keyword}>export const</span> <span className='text-(--text-blue)'>redirects</span> = [
      </div>
      {route('/blog', '/journal')}
      {route('/about-us', '/about')}
      <div>];</div>
    </>
  );
}
