import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Enregistre le service worker et propose la mise à jour quand une nouvelle
 * version est disponible. L'utilisateur choisit le moment du rechargement.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md animate-screen-in rounded-2xl border border-volt-600/50 bg-ink-800 p-4 shadow-xl"
    >
      <p className="font-semibold text-snow">Nouvelle version de VYRO disponible</p>
      <p className="mt-1 text-sm text-mist">Tes données restent sur ton iPhone pendant la mise à jour.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="min-h-11 flex-1 rounded-xl bg-volt-600 px-4 font-semibold text-white active:bg-volt-500"
        >
          Mettre à jour
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 rounded-xl px-4 font-medium text-mist active:text-snow"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
