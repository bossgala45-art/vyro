import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      {/* La clé relance l'animation d'entrée à chaque changement d'écran. */}
      <main key={pathname} className="pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
      <ScrollRestoration />
    </div>
  );
}
