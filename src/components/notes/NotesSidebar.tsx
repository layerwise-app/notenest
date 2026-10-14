import { Link } from '@tanstack/react-router';
import {
  CalendarDays,
  ChevronDown,
  Command,
  FileText,
  Folder,
  LogOut,
  Moon,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Sun,
  Trash2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type * as React from 'react';
import { NoteNestLogo } from '~/components/brand';
import { IconButton, Kbd, SectionLabel } from '~/components/notes/note-ui';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import type { SyncStatus } from '~/hooks/use-notebook';
import { signOut } from '~/lib/auth-client';
import type { NotesView } from '~/lib/notebook';
import { NOTE_TEMPLATES } from '~/lib/note-templates';
import type { TemplateId } from '~/lib/note-templates';
import type { TagCount } from '~/lib/note-text';
import type { NoteFolder } from '~/lib/notes';
import { cn } from '~/lib/utils';

type SidebarProps = {
  view: NotesView;
  onViewChange: (view: NotesView) => void;
  counts: { all: number; pinned: number; trash: number };
  folders: NoteFolder[];
  folderCounts: Map<string, number>;
  tags: TagCount[];
  onNewNote: () => void;
  onTemplate: (id: TemplateId) => void;
  onToday: () => void;
  onNewFolder: () => void;
  onRenameFolder: (folder: NoteFolder) => void;
  onDeleteFolder: (folder: NoteFolder) => void;
  onOpenPalette: () => void;
  account: {
    user: { name: string; email: string } | null;
    syncStatus: SyncStatus;
    storageError: boolean;
  };
};

export function NotesSidebar(props: SidebarProps) {
  const { view, onViewChange, counts, folders, folderCounts, tags } = props;

  return (
    <nav aria-label='Notebook' className='flex h-full flex-col bg-sidebar px-2.5 pt-3 pb-2.5 text-sidebar-foreground'>
      <div className='flex h-8 items-center justify-between pl-1.5'>
        <Link to='/' aria-label='NoteNest home' className='rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
          <NoteNestLogo className='[&_svg]:size-6 [&>span:last-child]:text-[17px]' />
        </Link>
        <IconButton label='Command palette' shortcut='⌘K' onClick={props.onOpenPalette}>
          <Command className='size-4' />
        </IconButton>
      </div>

      <div className='mt-4 flex'>
        <button
          type='button'
          onClick={props.onNewNote}
          className='flex h-8 min-w-0 flex-1 items-center gap-2 rounded-l-md border border-border bg-paper px-2.5 text-[13px] font-medium shadow-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30'
        >
          <Plus className='size-4 text-primary' />
          New note
          <Kbd className='ml-auto h-[18px] text-[10.5px]'>⌥⌘N</Kbd>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type='button'
              aria-label='New note from template'
              className='grid h-8 w-7 place-items-center rounded-r-md border border-l-0 border-border bg-paper text-muted-foreground shadow-xs outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30'
            >
              <ChevronDown className='size-3.5' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52'>
            <DropdownMenuLabel className='text-xs text-muted-foreground'>Start from a template</DropdownMenuLabel>
            {NOTE_TEMPLATES.map((template) => (
              <DropdownMenuItem key={template.id} onSelect={() => props.onTemplate(template.id)}>
                {template.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className='mt-3 space-y-0.5'>
        <Row icon={<FileText />} label='All notes' count={counts.all} active={view === 'all'} onClick={() => onViewChange('all')} />
        <Row icon={<CalendarDays />} label='Today' onClick={props.onToday} />
        <Row icon={<Pin />} label='Pinned' count={counts.pinned} active={view === 'pinned'} onClick={() => onViewChange('pinned')} />
      </div>

      <div className='-mx-2.5 mt-1 min-h-0 flex-1 overflow-y-auto px-2.5'>
        <div className='flex items-center justify-between pt-4 pb-1 pl-2.5'>
          <SectionLabel>Folders</SectionLabel>
          <IconButton label='New folder' onClick={props.onNewFolder} className='size-6'>
            <Plus className='size-3.5' />
          </IconButton>
        </div>
        <div className='space-y-0.5'>
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              count={folderCounts.get(folder.id) ?? 0}
              active={view === `folder:${folder.id}`}
              onClick={() => onViewChange(`folder:${folder.id}`)}
              onRename={() => props.onRenameFolder(folder)}
              onDelete={() => props.onDeleteFolder(folder)}
            />
          ))}
          {!folders.length ? (
            <p className='px-2.5 py-1 text-[12.5px] text-muted-foreground'>No folders yet.</p>
          ) : null}
        </div>

        {tags.length ? (
          <>
            <SectionLabel className='px-2.5 pt-5 pb-1.5'>Tags</SectionLabel>
            <div className='space-y-0.5'>
              {tags.map(({ tag, count }) => (
                <Row
                  key={tag}
                  icon={<span className='w-4 text-center text-[13px] font-medium'>#</span>}
                  label={tag}
                  count={count}
                  compact
                  active={view === `tag:${tag}`}
                  onClick={() => onViewChange(`tag:${tag}`)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className='mt-2 space-y-2'>
        <Row icon={<Trash2 />} label='Recently deleted' count={counts.trash} active={view === 'trash'} onClick={() => onViewChange('trash')} />
        <AccountRow {...props.account} />
      </div>
    </nav>
  );
}

type RowProps = {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  compact?: boolean;
  onClick: () => void;
};

function Row({ icon, label, count, active, compact, onClick }: RowProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        compact ? 'h-7' : 'h-8',
        active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/60'
      )}
    >
      <span aria-hidden className={cn('flex shrink-0 text-muted-foreground [&_svg]:size-4', active && 'text-primary')}>
        {icon}
      </span>
      <span className='truncate'>{label}</span>
      {count !== undefined && count > 0 ? (
        <span className='ml-auto text-xs font-normal text-muted-foreground tabular-nums'>{count}</span>
      ) : null}
    </button>
  );
}

function FolderRow({
  folder,
  count,
  active,
  onClick,
  onRename,
  onDelete
}: {
  folder: NoteFolder;
  count: number;
  active: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className='group/folder relative'>
      <Row icon={<Folder />} label={folder.name} count={count} active={active} onClick={onClick} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            aria-label={`Folder options for ${folder.name}`}
            className={cn(
              'absolute top-1 right-1 grid size-6 place-items-center rounded text-muted-foreground opacity-0 outline-none group-hover/folder:opacity-100 hover:bg-sidebar hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100',
              active ? 'bg-sidebar-accent' : 'bg-sidebar-accent/60 pointer-coarse:bg-transparent'
            )}
          >
            <MoreHorizontal className='size-3.5' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-40'>
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className='size-4' />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant='destructive' onSelect={onDelete}>
            <Trash2 className='size-4' />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  local: 'On this device',
  loading: 'Syncing…',
  syncing: 'Syncing…',
  synced: 'Synced',
  error: 'Sync paused'
};

function AccountRow({ user, syncStatus, storageError }: SidebarProps['account']) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const status = storageError ? 'Storage full' : STATUS_LABEL[syncStatus];
  const themeButton = (
    <IconButton label={dark ? 'Light mode' : 'Dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? <Sun className='size-4' /> : <Moon className='size-4' />}
    </IconButton>
  );

  if (!user) {
    return (
      <div className='flex items-center gap-1.5 border-t border-sidebar-border pt-2.5 pl-2.5'>
        <span className='min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground'>{status}</span>
        {themeButton}
        <Button asChild size='sm' variant='outline' className='h-7 bg-paper px-2.5 text-[12.5px]'>
          <Link to='/sign-in'>Sign in</Link>
        </Button>
      </div>
    );
  }

  const name = user.name.trim() || user.email;
  return (
    <div className='flex items-center gap-1 border-t border-sidebar-border pt-2.5'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className='flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 text-left outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/40'
          >
            <span className='grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground uppercase'>
              {name.slice(0, 1)}
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-[12.5px] font-medium'>{name}</span>
              <span className='flex items-center gap-1.5 text-[11.5px] text-muted-foreground'>
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    syncStatus === 'synced' && 'bg-primary',
                    (syncStatus === 'syncing' || syncStatus === 'loading') && 'animate-pulse bg-muted-foreground',
                    (syncStatus === 'error' || storageError) && 'bg-destructive'
                  )}
                />
                {status}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' side='top' className='w-56'>
          <DropdownMenuLabel className='truncate text-xs font-normal text-muted-foreground'>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut className='size-4' />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {themeButton}
    </div>
  );
}
