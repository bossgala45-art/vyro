import type { ReactNode } from 'react';

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Gabarit commun d'un écran : grand titre façon iOS puis contenu. */
export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <section aria-labelledby="screen-title" className="animate-screen-in px-4 pb-6">
      <header className="pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        {subtitle && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-volt-400">{subtitle}</p>}
        <h1 id="screen-title" className="mt-1 font-display text-3xl font-bold tracking-tight text-snow">
          {title}
        </h1>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
