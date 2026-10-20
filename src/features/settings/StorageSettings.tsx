import { useEffect, useState } from 'react';
import { getStorageStatus, requestPersistentStorage, type StorageStatus } from '../../data/maintenance';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
  return `${(bytes / 1024 ** 3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go`;
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function StorageSettings() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    let active = true;
    void getStorageStatus().then((value) => active && setStatus(value));
    return () => {
      active = false;
    };
  }, []);

  const request = async () => {
    setRequesting(true);
    const granted = await requestPersistentStorage();
    setRefused(granted !== true);
    setStatus(await getStorageStatus());
    setRequesting(false);
  };

  return (
    <div className="space-y-3 text-sm">
      <dl className="divide-y divide-ink-700/60">
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-mist">Conservation garantie</dt>
          <dd className="text-snow">
            {status === null ? '…' : status.persisted === null ? 'Information indisponible' : status.persisted ? 'Oui' : 'Non'}
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-mist">Espace utilisé</dt>
          <dd className="text-snow">
            {status?.usageBytes == null
              ? 'Information indisponible'
              : `${formatBytes(status.usageBytes)}${status.quotaBytes ? ` sur ${formatBytes(status.quotaBytes)} disponibles` : ''}`}
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-mist">Installée sur l’écran d’accueil</dt>
          <dd className="text-snow">{isStandalone() ? 'Oui' : 'Non'}</dd>
        </div>
      </dl>

      {status?.persisted === false && (
        <Button variant="secondary" block busy={requesting} onClick={() => void request()}>
          Demander la conservation des données
        </Button>
      )}
      {refused && <Alert tone="warning">Safari n’a pas accordé la conservation garantie.</Alert>}
      {!isStandalone() && (
        <Alert tone="warning" title="Installe VYRO sur l’écran d’accueil">
          Dans Safari, Apple peut effacer les données d’un site non installé après 7 jours sans visite. Partager → Ajouter à
          l’écran d’accueil.
        </Alert>
      )}
    </div>
  );
}
