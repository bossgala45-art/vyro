import { useState } from 'react';

/**
 * Remplace `virtual:pwa-register/react` (fourni par vite-plugin-pwa au build) dans les tests.
 * `pwaStub` simule une nouvelle version disponible et enregistre les mises à jour demandées.
 */
export const pwaStub = { needRefresh: false, updates: [] as boolean[] };

export function useRegisterSW() {
  const needRefresh = useState(pwaStub.needRefresh);
  return {
    needRefresh,
    offlineReady: useState(false),
    updateServiceWorker: (reload?: boolean) => {
      pwaStub.updates.push(reload ?? false);
      return Promise.resolve();
    },
  };
}
