import { createFileRoute } from '@tanstack/react-router';
import { PageView } from '~/components/workspace/PageView';

export const Route = createFileRoute('/notes/$pageId')({
  component: PageRoute
});

function PageRoute() {
  const { pageId } = Route.useParams();
  return <PageView pageId={pageId} />;
}
