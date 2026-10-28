import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter
} from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { NoteNestMark } from '~/components/brand';
import { Button } from '~/components/ui/button';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId
  });

  console.error(error);

  return (
    <div className='flex min-h-svh min-w-0 flex-1 flex-col items-center justify-center gap-6 bg-background p-4 text-foreground'>
      <NoteNestMark className='size-10' />
      <div className='w-full max-w-xl text-[14px]'>
        <ErrorComponent error={error} />
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Button variant='outline' onClick={() => void router.invalidate()}>
          Try again
        </Button>
        {isRoot ? (
          <Button asChild>
            <Link to='/'>Home</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link
              to='/'
              onClick={(event) => {
                event.preventDefault();
                window.history.back();
              }}
            >
              Go back
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
