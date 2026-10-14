import { createFileRoute, redirect } from '@tanstack/react-router';

// The notebook replaced the starter dashboard; keep old links working.
export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    throw redirect({ to: '/notes', replace: true });
  }
});
