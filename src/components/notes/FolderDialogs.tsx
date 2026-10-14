import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import type { NoteFolder } from '~/lib/notes';

export type FolderDialogState =
  | { kind: 'create' }
  | { kind: 'rename'; folder: NoteFolder }
  | { kind: 'delete'; folder: NoteFolder }
  | null;

type FolderDialogsProps = {
  state: FolderDialogState;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (folder: NoteFolder, name: string) => void;
  onDelete: (folder: NoteFolder) => void;
};

const MAX_FOLDER_NAME = 80;

export function FolderDialogs({ state, onClose, onCreate, onRename, onDelete }: FolderDialogsProps) {
  const nameOpen = state?.kind === 'create' || state?.kind === 'rename';
  return (
    <>
      <Dialog open={nameOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className='gap-5 sm:max-w-sm'>
          {nameOpen ? (
            <FolderNameForm
              // Remount per folder so the field starts from that folder's name.
              key={state.kind === 'rename' ? state.folder.id : 'create'}
              initialName={state.kind === 'rename' ? state.folder.name : ''}
              title={state.kind === 'rename' ? 'Rename folder' : 'New folder'}
              submitLabel={state.kind === 'rename' ? 'Rename' : 'Create'}
              onCancel={onClose}
              onSubmit={(name) => {
                if (state.kind === 'rename') onRename(state.folder, name);
                else onCreate(name);
                onClose();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={state?.kind === 'delete'} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{state?.kind === 'delete' ? state.folder.name : ''}”?</AlertDialogTitle>
            <AlertDialogDescription>Its notes move to All notes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              onClick={() => {
                if (state?.kind === 'delete') onDelete(state.folder);
                onClose();
              }}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FolderNameForm({
  initialName,
  title,
  submitLabel,
  onCancel,
  onSubmit
}: {
  initialName: string;
  title: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  return (
    <form
      className='grid gap-5'
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) onSubmit(trimmed);
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className='sr-only'>Folder name</DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        value={name}
        maxLength={MAX_FOLDER_NAME}
        onChange={(event) => setName(event.target.value)}
        placeholder='Folder name'
        aria-label='Folder name'
        onFocus={(event) => event.currentTarget.select()}
      />
      <DialogFooter>
        <Button type='button' variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' disabled={!trimmed}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
