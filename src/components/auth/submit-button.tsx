import type * as React from 'react';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';

type SubmitButtonProps = React.ComponentProps<typeof Button> & { isPending: boolean };

/** Submit button with a stable label; a spinner replaces it while pending. */
export function SubmitButton({ isPending, disabled, className, children, ...props }: SubmitButtonProps) {
  return (
    <Button
      type='submit'
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      className={cn('relative', className)}
      {...props}
    >
      <span className={cn('inline-flex items-center gap-1.5', isPending && 'invisible')}>{children}</span>
      {isPending ? <Spinner className='absolute' /> : null}
    </Button>
  );
}
