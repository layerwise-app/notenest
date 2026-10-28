// The sidebar's page tree: expand, open, rename, add subpages, and drag to
// reorder or nest (drop on the top or bottom edge of a row to place it before
// or after, on the middle to nest inside).
import { Link } from '@tanstack/react-router';
import { ChevronRight, FileText, MoreHorizontal, Plus } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { pageTitle } from '~/lib/pages/page';
import type { Page } from '~/lib/pages/page';
import { ancestors, canNest } from '~/lib/pages/tree';
import { createPage, movePage } from '~/lib/workspace/actions';
import { getPages, updatePage } from '~/lib/workspace/store';
import { setExpanded, useUi } from '~/lib/workspace/ui';
import { cn } from '~/lib/utils';
import { PageActionItems } from './PageActions';

const DRAG_TYPE = 'application/x-notenest-page';

type DropZone = 'before' | 'inside' | 'after';
type TreeContextValue = {
  index: Map<string, Page[]>;
  activeId: string | null;
  /** Ids of the open page and its parents, so a nested open page counts as open. */
  activePath: Set<string>;
  onOpen: (id: string) => void;
  drop: { id: string; zone: DropZone } | null;
  setDrop: (drop: { id: string; zone: DropZone } | null) => void;
};

const TreeContext = createContext<TreeContextValue | null>(null);

export function PageTree({
  roots,
  index,
  activeId,
  onOpen,
  emptyLabel,
  rootKey
}: {
  roots: Page[];
  index: Map<string, Page[]>;
  activeId: string | null;
  onOpen: (id: string) => void;
  emptyLabel?: string;
  /** Distinguishes the same page shown under Favorites and under Pages. */
  rootKey: string;
}) {
  const [drop, setDrop] = useState<TreeContextValue['drop']>(null);
  const activePath = new Set(activeId ? [activeId, ...ancestors(getPages(), activeId).map((page) => page.id)] : []);
  return (
    <TreeContext.Provider value={{ index, activeId, activePath, onOpen, drop, setDrop }}>
      <div role='tree' onDragLeave={(event) => !event.currentTarget.contains(event.relatedTarget as Node) && setDrop(null)}>
        {roots.length ? (
          roots.map((page) => <PageRow key={`${rootKey}:${page.id}`} page={page} depth={0} rootKey={rootKey} />)
        ) : emptyLabel ? (
          <p className='px-3 py-1 text-[13px] text-[var(--faint)]'>{emptyLabel}</p>
        ) : null}
      </div>
    </TreeContext.Provider>
  );
}

function PageRow({ page, depth, rootKey }: { page: Page; depth: number; rootKey: string }) {
  const tree = useContext(TreeContext)!;
  const expandedKey = rootKey === 'pages' ? page.id : `${rootKey}:${page.id}`;
  const expanded = useUi((state) => Boolean(state.expanded[expandedKey]));
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const children = tree.index.get(page.id) ?? [];
  const active = tree.activeId === page.id;
  const dropHere = tree.drop?.id === page.id ? tree.drop.zone : null;

  function addChild(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const child = createPage({ parentId: page.id });
    setExpanded(expandedKey, true);
    tree.onOpen(child.id);
  }

  function zoneFor(event: React.DragEvent): DropZone {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    if (y < rect.height * 0.28) return 'before';
    if (y > rect.height * 0.72) return 'after';
    return 'inside';
  }

  function onDrop(event: React.DragEvent) {
    const draggedId = event.dataTransfer.getData(DRAG_TYPE);
    tree.setDrop(null);
    if (!draggedId || draggedId === page.id) return;
    event.preventDefault();
    const zone = zoneFor(event);
    const pages = getPages();
    if (zone === 'inside') {
      if (movePage(draggedId, page.id)) setExpanded(expandedKey, true);
      return;
    }
    const parentId = page.parentId && pages[page.parentId] ? page.parentId : null;
    if (!canNest(pages, draggedId, parentId)) return;
    const siblings = (tree.index.get(parentId ?? '') ?? []).filter((item) => item.id !== draggedId);
    const at = siblings.findIndex((item) => item.id === page.id);
    const beforeId = zone === 'before' ? page.id : (siblings[at + 1]?.id ?? null);
    movePage(draggedId, parentId, beforeId);
  }

  return (
    <div role='treeitem' aria-expanded={children.length ? expanded : undefined} aria-selected={active}>
      <Link
        to='/notes/$pageId'
        params={{ pageId: page.id }}
        draggable={!renaming}
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, page.id);
          event.dataTransfer.setData('text/plain', `${window.location.origin}/notes/${page.id}`);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          const zone = zoneFor(event);
          if (tree.drop?.id !== page.id || tree.drop.zone !== zone) tree.setDrop({ id: page.id, zone });
        }}
        onDrop={onDrop}
        onClick={(event) => {
          if (renaming) event.preventDefault();
        }}
        className={cn(
          'notion-sidebar-row group',
          active && 'is-active',
          menuOpen && 'is-hovered',
          dropHere === 'inside' && 'is-drop-inside',
          dropHere === 'before' && 'is-drop-before',
          dropHere === 'after' && 'is-drop-after'
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className='notion-sidebar-icon'>
          <span className={cn('notion-sidebar-glyph', 'group-hover:invisible')}>
            {page.icon ?? <FileText className='size-[18px]' strokeWidth={1.6} />}
          </span>
          <button
            type='button'
            className='notion-sidebar-chevron invisible group-hover:visible'
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setExpanded(expandedKey, !expanded);
            }}
          >
            <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} strokeWidth={2.2} />
          </button>
        </span>
        {renaming ? (
          <RenameInput page={page} onDone={() => setRenaming(false)} />
        ) : (
          <span className={cn('min-w-0 flex-1 truncate', !page.title.trim() && 'text-[var(--faint)]')}>{pageTitle(page)}</span>
        )}
        {!renaming ? (
          <span className={cn('notion-sidebar-actions', menuOpen && 'is-visible')}>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
              <DropdownMenuTrigger
                className='notion-sidebar-action'
                aria-label='Page options'
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <MoreHorizontal className='size-4' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-56' onClick={(event) => event.stopPropagation()}>
                <PageActionItems page={page} isOpen={tree.activePath.has(page.id)} onRename={() => setRenaming(true)} />
              </DropdownMenuContent>
            </DropdownMenu>
            <button type='button' className='notion-sidebar-action' aria-label='Add a page inside' title='Add a page inside' onClick={addChild}>
              <Plus className='size-4' />
            </button>
          </span>
        ) : null}
      </Link>
      {expanded ? (
        children.length ? (
          children.map((child) => <PageRow key={child.id} page={child} depth={depth + 1} rootKey={rootKey} />)
        ) : (
          <p className='py-1 text-[13px] text-[var(--faint)]' style={{ paddingLeft: 8 + (depth + 1) * 14 + 26 }}>
            No pages inside
          </p>
        )
      ) : null}
    </div>
  );
}

function RenameInput({ page, onDone }: { page: Page; onDone: () => void }) {
  const [value, setValue] = useState(page.title);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const commit = () => {
    if (value !== page.title) updatePage(page.id, { title: value });
    onDone();
  };
  return (
    <input
      ref={ref}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onClick={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        else if (event.key === 'Escape') onDone();
      }}
      className='notion-input h-6 min-w-0 flex-1 px-1.5 text-[14px]'
    />
  );
}
