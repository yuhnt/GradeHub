import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { AuthGate } from './AuthGate';
import { AuthProvider } from './auth/AuthProvider';
import { createQueryClient } from './queryClient';
import { routes } from './router';

const router = createBrowserRouter(routes);

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate router={router} />
        <Toaster richColors closeButton position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
