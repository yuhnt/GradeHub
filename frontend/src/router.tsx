import { Navigate, type RouteObject } from 'react-router';
import { PublicOnly, RequireAuth, RequireRole } from './auth/guards';
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { RootLayout } from './components/layout/RootLayout';
import { LoadingState } from './components/ui/Spinner';
import { NotFoundPage, RouteErrorPage } from './pages/StatusPages';

// Each page is its own chunk, downloaded the first time it is visited, so
// a student never downloads the teacher's grading screens up front.

// Exported on its own so tests can mount it in a memory router.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <LoadingState className="min-h-dvh" />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            element: <PublicOnly />,
            children: [
              {
                path: '/login',
                lazy: async () => ({ Component: (await import('./features/auth/LoginPage')).LoginPage }),
              },
              {
                path: '/register',
                lazy: async () => ({ Component: (await import('./features/auth/RegisterPage')).RegisterPage }),
              },
              {
                path: '/forgot-password',
                lazy: async () => ({
                  Component: (await import('./features/auth/ForgotPasswordPage')).ForgotPasswordPage,
                }),
              },
            ],
          },
          // Reachable signed in too: the link comes from an email.
          {
            path: '/reset-password',
            lazy: async () => ({ Component: (await import('./features/auth/ResetPasswordPage')).ResetPasswordPage }),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/tasks" replace /> },
              {
                path: '/tasks',
                lazy: async () => ({ Component: (await import('./features/tasks/TaskListPage')).TaskListPage }),
              },
              {
                element: <RequireRole role="teacher" />,
                children: [
                  {
                    path: '/tasks/new',
                    lazy: async () => ({ Component: (await import('./features/tasks/TaskFormPages')).NewTaskPage }),
                  },
                  {
                    path: '/tasks/:taskId/edit',
                    lazy: async () => ({ Component: (await import('./features/tasks/TaskFormPages')).EditTaskPage }),
                  },
                ],
              },
              {
                path: '/tasks/:taskId',
                lazy: async () => ({ Component: (await import('./features/tasks/TaskDetailPage')).TaskDetailPage }),
              },
              {
                path: '/submissions/:submissionId',
                lazy: async () => ({
                  Component: (await import('./features/submissions/SubmissionPage')).SubmissionPage,
                }),
              },
              {
                element: <RequireRole role="student" />,
                children: [
                  {
                    path: '/my-submissions',
                    lazy: async () => ({
                      Component: (await import('./features/submissions/MySubmissionsPage')).MySubmissionsPage,
                    }),
                  },
                ],
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
];
