import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthShell, FormError } from '~/components/auth/auth-shell';
import { SubmitButton } from '~/components/auth/submit-button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/sign-in')({
  head: () => ({ meta: [{ title: 'Sign in — NoteNest' }] }),
  component: SignInPage
});

type Mode = 'code' | 'password';

function SignInPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('code');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = useMutation({
    mutationFn: async () => {
      if (mode === 'code') {
        const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
        if (error) throw new Error(error.message ?? 'Couldn’t send a code.');
        return;
      }
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message ?? 'Couldn’t sign in.');
    },
    onSuccess: () =>
      mode === 'code' ? navigate({ to: '/sign-in/otp', search: { email } }) : navigate({ to: '/notes' })
  });

  const switchMode = (next: Mode) => {
    setMode(next);
    signIn.reset();
  };

  return (
    <AuthShell
      title='Sign in'
      description='Sync your notes across devices.'
      footer={
        <>
          New to NoteNest?{' '}
          <Link to='/sign-up' className='font-medium text-foreground underline-offset-4 hover:underline'>
            Create an account
          </Link>
        </>
      }
    >
      <form
        className='grid gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          signIn.mutate();
        }}
      >
        <div className='grid gap-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            autoComplete='email'
            autoFocus
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              signIn.reset();
            }}
          />
        </div>
        {mode === 'password' ? (
          <div className='grid gap-2'>
            <div className='flex items-center justify-between gap-4'>
              <Label htmlFor='password'>Password</Label>
              <Link
                to='/forgot-password'
                className='text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
              >
                Forgot?
              </Link>
            </div>
            <Input
              id='password'
              type='password'
              autoComplete='current-password'
              autoFocus
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                signIn.reset();
              }}
            />
          </div>
        ) : null}
        <FormError error={signIn.error} />
        <SubmitButton isPending={signIn.isPending}>{mode === 'code' ? 'Email me a code' : 'Sign in'}</SubmitButton>
      </form>

      <button
        type='button'
        className='mt-4 w-full text-center text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
        onClick={() => switchMode(mode === 'code' ? 'password' : 'code')}
      >
        {mode === 'code' ? 'Use a password instead' : 'Email me a code instead'}
      </button>
    </AuthShell>
  );
}
