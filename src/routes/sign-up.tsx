import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthShell, FormError } from '~/components/auth/auth-shell';
import { SubmitButton } from '~/components/auth/submit-button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/sign-up')({
  head: () => ({ meta: [{ title: 'Create an account — NoteNest' }] }),
  component: SignUpPage
});

function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMatch = password === confirmPassword;

  const signUp = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signUp.email({ name, email, password });
      if (error) throw new Error(error.message ?? 'Couldn’t create your account.');
    },
    onSuccess: () => navigate({ to: '/notes' })
  });

  return (
    <AuthShell
      title='Create your account'
      description='Notes on this device come with you.'
      footer={
        <>
          Already have an account?{' '}
          <Link to='/sign-in' className='font-medium text-foreground underline-offset-4 hover:underline'>
            Sign in
          </Link>
        </>
      }
    >
      <form
        className='grid gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          if (passwordsMatch) signUp.mutate();
        }}
      >
        <div className='grid gap-2'>
          <Label htmlFor='name'>Name</Label>
          <Input id='name' autoComplete='name' autoFocus required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            autoComplete='email'
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='password'>Password</Label>
          <Input
            id='password'
            type='password'
            autoComplete='new-password'
            minLength={8}
            required
            placeholder='At least 8 characters'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='confirm-password'>Confirm password</Label>
          <Input
            id='confirm-password'
            type='password'
            autoComplete='new-password'
            minLength={8}
            required
            aria-invalid={confirmPassword ? !passwordsMatch : undefined}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {confirmPassword && !passwordsMatch ? (
            <p className='text-[13px] text-destructive'>Passwords don’t match.</p>
          ) : null}
        </div>
        <FormError error={signUp.error} />
        <SubmitButton isPending={signUp.isPending} disabled={!passwordsMatch}>
          Create account
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
