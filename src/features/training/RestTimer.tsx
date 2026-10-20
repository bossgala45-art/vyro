import { useEffect, useState } from 'react';

interface RestTimerProps {
  /** Horodatage (ms) de fin du repos. */
  endsAt: number;
  onDone: () => void;
}

/**
 * Minuteur de repos affiché dans l'app. Il est calculé à partir de l'heure de fin :
 * il reste juste même si l'iPhone se verrouille. Aucune notification n'est promise
 * quand VYRO n'est pas à l'écran.
 */
export function RestTimer({ endsAt, onDone }: RestTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');

  return (
    <div
      role="timer"
      aria-live="off"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between rounded-2xl border border-volt-600/50 bg-ink-800/95 px-4 py-3 shadow-xl backdrop-blur"
    >
      <div>
        <p className="text-xs text-mist">{remaining === 0 ? 'Repos terminé' : 'Repos'}</p>
        <p className={`font-display text-2xl font-bold tabular-nums ${remaining === 0 ? 'text-emerald-300' : 'text-snow'}`}>
          {minutes}:{seconds}
        </p>
      </div>
      <button type="button" onClick={onDone} className="min-h-11 rounded-xl bg-ink-700 px-4 text-sm font-semibold text-snow active:bg-ink-950">
        {remaining === 0 ? 'Fermer' : 'Passer'}
      </button>
    </div>
  );
}
