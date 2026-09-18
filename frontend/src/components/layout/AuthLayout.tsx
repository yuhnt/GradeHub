import { Outlet } from 'react-router';
import { Logo } from './Logo';

/** Centered card for the signed-out pages (sign in, register, reset). */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Logo to="/login" />
      </div>
      <main className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </div>
  );
}
