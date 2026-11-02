import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** VYRO fonctionne hors ligne : le bandeau rassure plutôt qu'il ne bloque. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-ink-800 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-xs text-mist">
      <WifiOff aria-hidden size={14} />
      Hors ligne : tout fonctionne, tes données sont sur cet iPhone.
    </div>
  );
}
