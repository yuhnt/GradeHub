import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter } from 'react-router';
import { Toaster } from 'sonner';
import type { User } from '../api/types';
import { AuthGate } from '../AuthGate';
import { AuthProvider } from '../auth/AuthProvider';
import { TOKEN_KEY } from '../auth/tokenStorage';
import { routes } from '../router';
import { tokenFor } from './db';

interface RenderAppOptions {
  /** Signed in as this user (a stored token, like after a reload). */
  as?: User;
  /** Passed to userEvent.setup(). */
  applyAccept?: boolean;
}

/** Renders the whole app at `path`, with the real routes and providers. */
export function renderApp(path: string, { as, applyAccept = true }: RenderAppOptions = {}) {
  if (as) localStorage.setItem(TOKEN_KEY, tokenFor(as));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup({ applyAccept });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...result, router, user, queryClient };
}

export const pdfFile = (name = 'answer.pdf', size?: number) => {
  const file = new File(['%PDF-1.4\n%%EOF\n'], name, { type: 'application/pdf' });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
};
