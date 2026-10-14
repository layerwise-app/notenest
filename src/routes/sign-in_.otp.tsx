import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthShell, FormError } from '~/components/auth/auth-shell';
import { SubmitButton } from '~/components/auth/submit-button';
import { Button } from '~/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/sign-in_/otp')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email.trim() : ''
  }),
  beforeLoad: ({ search }) => {
    if (!search.email) throw redirect({ to: '/sign-in' });
  },
  head: () => ({ meta: [{ title: 'Check your email — NoteNest' }] }),
  component: EmailOtpPage
});

function EmailOtpPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [otp, setOtp] = useState('');

  const verifyOtp = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signIn.emailOtp({ email, otp });
      if (error) throw new Error(error.message ?? 'That code didn’t work.');
    },
    onSuccess: () => navigate({ to: '/notes' })
  });

  const resendOtp = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
      if (error) throw new Error(error.message ?? 'Couldn’t resend the code.');
    }
  });

  return (
    <AuthShell
      title='Check your email'
      description={
        <>
          Enter the 6-digit code sent to <span className='font-medium text-foreground'>{email}</span>.
        </>
      }
      footer={
        <Link to='/sign-in' className='underline-offset-4 hover:text-foreground hover:underline'>
          Use a different email
        </Link>
      }
    >
      <form
        className='grid gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          verifyOtp.mutate();
        }}
      >
        <InputOTP
          autoFocus
          autoComplete='one-time-code'
          containerClassName='w-full'
          maxLength={6}
          value={otp}
          aria-label='Sign-in code'
          onChange={(value) => {
            setOtp(value);
            verifyOtp.reset();
          }}
        >
          <InputOTPGroup className='w-full'>
            {Array.from({ length: 6 }, (_, index) => (
              <InputOTPSlot key={index} index={index} className='h-11 flex-1 text-base' />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <FormError error={verifyOtp.error} />
        <SubmitButton isPending={verifyOtp.isPending} disabled={otp.length < 6}>
          Sign in
        </SubmitButton>
      </form>
      <div className='mt-4 flex items-center justify-center gap-2 text-[13px] text-muted-foreground'>
        {resendOtp.isSuccess ? <span>Code sent.</span> : <span>Didn’t get it?</span>}
        <Button
          type='button'
          variant='link'
          className='h-auto p-0 text-[13px]'
          disabled={resendOtp.isPending}
          onClick={() => resendOtp.mutate()}
        >
          Resend
        </Button>
      </div>
      <div className='mt-2 text-center'>
        <FormError error={resendOtp.error} />
      </div>
    </AuthShell>
  );
}
