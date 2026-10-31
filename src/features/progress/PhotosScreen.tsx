import { Camera } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { StorageError } from '../../data/errors';
import { useProgressPhotos } from '../../data/hooks';
import { progressRepository } from '../../data/repositories/progressRepository';
import { groupByMonth } from '../../domain/progress/photos';
import type { ProgressPhoto } from '../../domain/progress/types';
import { useImageUrl } from '../../media/image';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';
import { formatBytes, formatMonth, POSE_LABELS } from './labels';

function TimelineThumb({ photo }: { photo: ProgressPhoto }) {
  const url = useImageUrl(photo.thumbnail);
  const name = `${POSE_LABELS[photo.pose]}, ${formatShortDate(photo.date).toLocaleLowerCase('fr')}`;
  return (
    <Link to={`/progres/photos/${photo.id}`} aria-label={`Ouvrir la photo : ${name}`} className="block overflow-hidden rounded-xl bg-ink-800">
      {url && <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />}
      <span className="block px-2 py-1 text-xs text-mist">
        {POSE_LABELS[photo.pose]} · {Number(photo.date.slice(8))}
      </span>
    </Link>
  );
}

export function PhotosScreen() {
  const photos = useProgressPhotos();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  if (!photos) return null;
  const months = groupByMonth(photos);
  const totalBytes = photos.reduce((sum, photo) => sum + photo.bytes + photo.thumbnail.data.byteLength, 0);

  const removeAll = async () => {
    setBusy(true);
    try {
      await progressRepository.removeAllPhotos();
      setConfirm(false);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Suppression impossible.');
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Chronologie" subtitle="Photos de progression">
      <Alert tone="info">
        Tes photos restent uniquement sur cet iPhone : elles ne sont jamais envoyées. Elles seront incluses dans la sauvegarde chiffrée (étape 9) ;
        en attendant, effacer les données de Safari les efface.
      </Alert>
      <Link
        to="/progres/photos/nouvelle"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-volt-600 px-4 font-semibold text-white active:bg-volt-500"
      >
        <Camera aria-hidden size={18} />
        Ajouter une photo
      </Link>

      {months.length === 0 ? (
        <Card>
          <p className="text-sm text-mist">Aucune photo pour l’instant. Une photo par mois (face, profil, dos) suffit pour voir le chemin parcouru.</p>
        </Card>
      ) : (
        months.map(({ month, photos: items }) => (
          <section key={month} aria-label={formatMonth(month)}>
            <h2 className="mb-2 text-sm font-semibold text-snow">{formatMonth(month)}</h2>
            <div className="grid grid-cols-3 gap-2">
              {items.map((photo) => (
                <TimelineThumb key={photo.id} photo={photo} />
              ))}
            </div>
          </section>
        ))
      )}

      {photos.length > 0 && (
        <Card>
          <p className="text-sm text-mist">
            {photos.length} photo{photos.length > 1 ? 's' : ''} · {formatBytes(totalBytes)} sur cet iPhone
          </p>
          {failure && (
            <div className="mt-3">
              <Alert tone="error">{failure}</Alert>
            </div>
          )}
          <Button variant="ghost" block className="mt-2 text-red-300" onClick={() => setConfirm(true)}>
            Supprimer toutes mes photos
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirm}
        title="Supprimer toutes les photos ?"
        confirmLabel="Tout supprimer"
        tone="danger"
        requireText="SUPPRIMER"
        busy={busy}
        onConfirm={() => void removeAll()}
        onCancel={() => setConfirm(false)}
      >
        <p>Les {photos.length} photos de progression seront effacées définitivement de cet iPhone. Tes mesures et pesées sont conservées.</p>
      </ConfirmDialog>
    </Screen>
  );
}
