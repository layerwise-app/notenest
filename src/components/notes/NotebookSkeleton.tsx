import { Skeleton } from '~/components/ui/skeleton';

/** Placeholder layout shown until the locally saved notebook loads. */
export function NotebookSkeleton() {
  return (
    <div className='flex h-dvh overflow-hidden bg-background' aria-busy='true' aria-label='Loading notes'>
      <div className='hidden w-[236px] shrink-0 space-y-3 border-r border-sidebar-border bg-sidebar p-4 lg:block'>
        <Skeleton className='h-6 w-28' />
        <Skeleton className='mt-6 h-8 w-full' />
        <Skeleton className='h-4 w-32' />
        <Skeleton className='h-4 w-24' />
      </div>
      <div className='w-full space-y-4 p-4 md:w-[300px] md:border-r md:border-border xl:w-[330px]'>
        <Skeleton className='h-8 w-full' />
        <Skeleton className='h-6 w-28' />
        {[0, 1, 2].map((item) => (
          <div key={item} className='space-y-2'>
            <Skeleton className='h-4 w-3/5' />
            <Skeleton className='h-3 w-full' />
          </div>
        ))}
      </div>
      <div className='hidden flex-1 bg-paper md:block' />
    </div>
  );
}
