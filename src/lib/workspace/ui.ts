// Layout state for the workspace (sidebar, expanded pages, open dialogs),
// remembered per browser.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type UiState = {
  sidebarOpen: boolean;
  sidebarWidth: number;
  /** Pages expanded in the sidebar tree. */
  expanded: Record<string, true>;
  /** Most recently opened pages, newest first. */
  recent: string[];
  searchOpen: boolean;
  /** The page being moved with "Move to", if any. */
  movingPageId: string | null;
  /** The sidebar sheet on narrow screens. */
  mobileNavOpen: boolean;
};

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 480;

export const useUi = create<UiState>()(
  persist(
    (): UiState => ({
      sidebarOpen: true,
      sidebarWidth: 248,
      expanded: {},
      recent: [],
      searchOpen: false,
      movingPageId: null,
      mobileNavOpen: false
    }),
    {
      name: 'notenest.ui.v2',
      storage: createJSONStorage(() => window.localStorage),
      partialize: ({ sidebarOpen, sidebarWidth, expanded, recent }) => ({ sidebarOpen, sidebarWidth, expanded, recent })
    }
  )
);

export function setExpanded(id: string, open: boolean) {
  useUi.setState((state) => {
    const expanded = { ...state.expanded };
    if (open) expanded[id] = true;
    else delete expanded[id];
    return { expanded };
  });
}

export function rememberVisit(id: string) {
  useUi.setState((state) => ({ recent: [id, ...state.recent.filter((item) => item !== id)].slice(0, 20) }));
}

export const toggleSidebar = () => useUi.setState((state) => ({ sidebarOpen: !state.sidebarOpen }));
export const openSearch = () => useUi.setState({ searchOpen: true });
