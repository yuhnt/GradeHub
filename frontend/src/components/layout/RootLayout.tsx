import { Outlet, ScrollRestoration } from 'react-router';

/** Top of every page: new pages open at the top, Back restores the position. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
