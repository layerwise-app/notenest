import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthShell, FormError } from '~/components/auth/auth-shell';
import { SubmitButton } from '~/components/auth/submit-button';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';
import { Label } from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/forgot-password')({
  head: () => ({ meta: [{ title: 'Reset password — NoteNest' }] }),
  component: ForgotPasswordPage
});

const backToSignIn = (
  <Link to='/sign-in' className='underline-offset-4 hover:text-foreground hover:underline'>
    Back to sign in
  </Link>
);

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMatch = password === confirmPassword;

  const requestReset = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.requestPasswordReset({ email });
      if (error) throw new Error(error.message ?? 'Couldn’t send a reset code.');
    }
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.resetPassword({ email, otp, password });
      if (error) throw new Error(error.message ?? 'Couldn’t reset your password.');
    }
  });

  if (resetPassword.isSuccess) {
    return (
      <AuthShell title='Password updated' description='Sign in with your new password.'>
        <Button asChild className='w-full'>
          <Link to='/sign-in'>Sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title='Reset password' description='We’ll email you a 6-digit code.' footer={backToSignIn}>
      <form
        className='grid gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          setOtp('');
          resetPassword.reset();
          requestReset.mutate();
        }}
      >
        <div className='grid gap-2'>
          <Label htmlFor='email'>Email</Label>
          <div className='flex gap-2'>
            <Input
              id='email'
              type='email'
              autoComplete='email'
              autoFocus
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setOtp('');
                requestReset.reset();
                resetPassword.reset();
              }}
            />
            <SubmitButton
              isPending={requestReset.isPending}
              variant={requestReset.isSuccess ? 'outline' : 'default'}
            >
              {requestReset.isSuccess ? 'Resend' : 'Send code'}
            </SubmitButton>
          </div>
        </div>
        <FormError error={requestReset.error} />
      </form>

      {requestReset.isSuccess ? (
        <form
          className='mt-5 grid gap-4 border-t border-border pt-5'
          onSubmit={(event) => {
            event.preventDefault();
            if (passwordsMatch) resetPassword.mutate();
          }}
        >
          <div className='grid gap-2'>
            <Label htmlFor='reset-code'>Code</Label>
            <InputOTP
              id='reset-code'
              maxLength={6}
              value={otp}
              containerClassName='w-full'
              onChange={(value) => {
                setOtp(value);
                resetPassword.reset();
              }}
            >
              <InputOTPGroup className='w-full'>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot key={index} index={index} className='h-11 flex-1 text-base' />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='password'>New password</Label>
            <Input
              id='password'
              type='password'
              autoComplete='new-password'
              minLength={8}
              required
              placeholder='At least 8 characters'
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                resetPassword.reset();
              }}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='confirm-password'>Confirm new password</Label>
            <Input
              id='confirm-password'
              type='password'
              autoComplete='new-password'
              minLength={8}
              required
              aria-invalid={confirmPassword ? !passwordsMatch : undefined}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                resetPassword.reset();
              }}
            />
            {confirmPassword && !passwordsMatch ? (
              <p className='text-[13px] text-destructive'>Passwords don’t match.</p>
            ) : null}
          </div>
          <FormError error={resetPassword.error} />
          <SubmitButton isPending={resetPassword.isPending} disabled={otp.length < 6 || !passwordsMatch}>
            Reset password
          </SubmitButton>
        </form>
      ) : null}
    </AuthShell>
  );
}
