import { isRouteErrorResponse, useRouteError } from 'react-router';
import { FileQuestion, ServerCrash, ShieldX } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/ui/Alert';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { errorMessage, isApiError } from '../lib/errors';
import { useDocumentTitle } from '../lib/hooks';

export function NotFoundState({
  title = 'Page not found',
  description = "The page you're looking for doesn't exist or has moved.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={title}
      description={description}
      action={<ButtonLink to="/tasks">Back to tasks</ButtonLink>}
    />
  );
}

export function NotFoundPage() {
  useDocumentTitle('Not found');
  return <NotFoundState />;
}

export function ForbiddenState({ description }: { description: string }) {
  return (
    <EmptyState
      icon={ShieldX}
      title="You don't have access to this page"
      description={description}
      action={<ButtonLink to="/tasks">Back to tasks</ButtonLink>}
    />
  );
}

/** A failed query: "not found" for a 404, otherwise the error and a retry. */
export function QueryErrorState({
  error,
  notFoundTitle,
  notFoundDescription = 'It may have been deleted, or you may not have access to it.',
  onRetry,
}: {
  error: unknown;
  notFoundTitle: string;
  notFoundDescription?: string;
  onRetry: () => unknown;
}) {
  if (isApiError(error, 404)) return <NotFoundState title={notFoundTitle} description={notFoundDescription} />;
  return (
    <Alert
      tone="error"
      title="Something went wrong"
      action={
        <Button variant="secondary" size="sm" onClick={() => onRetry()}>
          Try again
        </Button>
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

/** Shown when the app can't load the signed-in user's profile at startup. */
export function ServerUnavailablePage() {
  const { retry, logout } = useAuth();
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={ServerCrash}
        title="Can't reach Task Grading Hub"
        description="The server isn't responding. Check your connection, then try again."
        action={
          <div className="flex gap-2">
            <Button onClick={retry}>Try again</Button>
            <Button variant="secondary" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        }
      />
    </div>
  );
}

/** Router error boundary: a render error or an unknown loader failure. */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <NotFoundState />
      </div>
    );
  }
  console.error(error);
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={ServerCrash}
        title="Something went wrong"
        description="An unexpected error stopped this page from loading. Reloading usually fixes it."
        action={<Button onClick={() => window.location.reload()}>Reload the page</Button>}
      />
    </div>
  );
}
