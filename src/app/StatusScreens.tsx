import { useState } from 'react';
import { useRouteError } from 'react-router';
import { StorageError, toStorageError } from '../data/errors';
import { deleteAllData } from '../data/maintenance';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LogoMark } from '../ui/Logo';

export function SplashScreen() {
  return (
    <div role="status" aria-label="Chargement de VYRO" className="grid min-h-dvh place-items-center">
      <LogoMark className="size-14 animate-pulse" />
    </div>
  );
}

const TITLES: Record<StorageError['kind'], string> = {
  quota: 'Stockage plein',
  unavailable: 'Stockage indisponible',
  version: 'Mise à jour nécessaire',
  integrity: 'Données abîmées',
  conflict: 'Conflit de données',
  unknown: 'Erreur inattendue',
};

/** Écran affiché quand les données ne peuvent pas être lues : rien n'est écrasé ni masqué. */
export function StorageErrorScreen({ error }: { error: StorageError }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <LogoMark className="size-12" />
      <div>
        <h1 className="font-display text-2xl font-bold text-snow">{TITLES[error.kind]}</h1>
        <p className="mt-2 text-mist">{error.message}</p>
      </div>
      <Button onClick={() => window.location.reload()}>Recharger VYRO</Button>
      {(error.kind === 'integrity' || error.kind === 'unknown') && (
        <div className="space-y-3">
          <Alert tone="warning" title="Si le problème persiste">
            Tu peux effacer toutes les données de VYRO sur cet iPhone pour repartir de zéro. C’est irréversible.
          </Alert>
          <Button variant="secondary" block onClick={() => setConfirming(true)}>
            Effacer toutes les données…
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title="Effacer toutes les données ?"
        confirmLabel="Tout effacer"
        tone="danger"
        requireText="EFFACER"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setBusy(true);
          void deleteAllData().finally(() => window.location.reload());
        }}
      >
        <p>Profil, pesées et réglages seront définitivement supprimés de cet appareil.</p>
      </ConfirmDialog>
    </main>
  );
}

/** Erreur levée pendant l'affichage d'un écran (dont les erreurs de lecture du stockage). */
export function RouteErrorScreen() {
  const error = useRouteError();
  const isStorage =
    error instanceof StorageError ||
    (typeof error === 'object' && error !== null && 'name' in error && toStorageError(error).kind !== 'unknown');
  if (isStorage) return <StorageErrorScreen error={toStorageError(error)} />;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
      <LogoMark className="size-12" />
      <div>
        <h1 className="font-display text-2xl font-bold text-snow">Un problème est survenu</h1>
        <p className="mt-2 text-mist">L’écran n’a pas pu s’afficher. Tes données enregistrées ne sont pas modifiées.</p>
      </div>
      <Button onClick={() => window.location.reload()}>Recharger VYRO</Button>
    </main>
  );
}
