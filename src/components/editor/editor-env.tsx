// What node views and menus need from the app around the editor. The page
// view provides it; node views read it with `useEditorEnv()`.
import { createContext, useContext } from 'react';

export type EditorEnv = {
  pageId: string;
  /** Uploads need an account; false shows a sign-in prompt instead. */
  signedIn: boolean;
  requestSignIn: () => void;
  openPage: (pageId: string) => void;
  /** Creates a page nested in this one (without a block for it) and returns its id. */
  createSubpage: (title?: string) => string;
};

const EditorEnvContext = createContext<EditorEnv | null>(null);

export const EditorEnvProvider = EditorEnvContext.Provider;

export function useEditorEnv(): EditorEnv {
  const env = useContext(EditorEnvContext);
  if (!env) throw new Error('useEditorEnv must be used inside the page editor.');
  return env;
}
