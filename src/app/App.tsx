import { useEffect, useState } from 'react';
import { RouterProvider, createHashRouter } from 'react-router';
import { db, openDatabase } from '../data/db';
import { StorageError, toStorageError } from '../data/errors';
import { settingsRepository } from '../data/repositories/settingsRepository';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { LockProvider } from './lock/LockProvider';
import { routes } from './routes';
import { SplashScreen, StorageErrorScreen } from './StatusScreens';

// Routage par hash (#/calendrier) : fonctionne sur GitHub Pages et hors ligne sans
// configuration serveur, y compris quand l'app est rouverte sur un écran précis.
const router = createHashRouter(routes);

type Status = { state: 'opening' } | { state: 'ready'; locked: boolean } | { state: 'error'; error: StorageError };

export function App() {
  const [status, setStatus] = useState<Status>({ state: 'opening' });

  useEffect(() => {
    let active = true;
    openDatabase()
      .then(() => settingsRepository.get())
      // Verrouillé dès le départ si un code est configuré : rien n'est affiché avant.
      .then((settings) => active && setStatus({ state: 'ready', locked: settings.lock.verifier !== null }))
      .catch((error: unknown) => active && setStatus({ state: 'error', error: toStorageError(error) }));

    // Une version plus récente de VYRO (autre onglet) met à jour la base : on la libère.
    const onVersionChange = () => {
      db.close();
      setStatus({ state: 'error', error: new StorageError('version') });
      return false;
    };
    db.on('versionchange', onVersionChange);
    return () => {
      active = false;
      db.on('versionchange').unsubscribe(onVersionChange);
    };
  }, []);

  return (
    <>
      {status.state === 'opening' ? (
        <SplashScreen />
      ) : status.state === 'ready' ? (
        <LockProvider initiallyLocked={status.locked}>
          <RouterProvider router={router} />
        </LockProvider>
      ) : (
        <StorageErrorScreen error={status.error} />
      )}
      <UpdatePrompt />
    </>
  );
}
