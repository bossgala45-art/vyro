import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { StorageError } from '../../data/errors';
import { useProgressPhotoFile, useProgressPhotos } from '../../data/hooks';
import { progressRepository } from '../../data/repositories/progressRepository';
import { useImageUrl } from '../../media/image';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';
import { formatBytes, POSE_LABELS } from './labels';

const ZOOMS = [1, 1.5, 2, 3, 4] as const;

export function PhotoScreen() {
  const { id = '' } = useParams();
  const photos = useProgressPhotos();
  const file = useProgressPhotoFile(id);
  const url = useImageUrl(file);
  const navigate = useNavigate();
  const [zoomIndex, setZoomIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  if (!photos || file === undefined) return null;
  const photo = photos.find((item) => item.id === id);
  if (!photo || !file) {
    return (
      <Screen title="Photo" subtitle="Progrès">
        <Alert tone="warning">Cette photo n’existe plus (elle a peut-être été supprimée).</Alert>
      </Screen>
    );
  }
  const zoom = ZOOMS[zoomIndex] ?? 1;

  const remove = async () => {
    setBusy(true);
    try {
      await progressRepository.removePhoto(photo.id);
      navigate('/progres/photos', { replace: true });
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Suppression impossible.');
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <Screen title={POSE_LABELS[photo.pose]} subtitle={formatShortDate(photo.date)}>
      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" aria-label="Dézoomer" disabled={zoomIndex === 0} onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}>
          <Minus aria-hidden size={18} />
        </Button>
        <span className="min-w-14 text-center text-sm text-snow" aria-live="polite">
          {zoom.toLocaleString('fr-FR')}×
        </span>
        <Button
          variant="secondary"
          aria-label="Zoomer"
          disabled={zoomIndex === ZOOMS.length - 1}
          onClick={() => setZoomIndex((current) => Math.min(ZOOMS.length - 1, current + 1))}
        >
          <Plus aria-hidden size={18} />
        </Button>
      </div>
      <div className="overflow-auto rounded-2xl bg-ink-950" style={{ maxHeight: '62dvh' }}>
        {url && (
          <img
            src={url}
            alt={`Photo ${POSE_LABELS[photo.pose].toLocaleLowerCase('fr')} du ${formatShortDate(photo.date).toLocaleLowerCase('fr')}`}
            className="block max-w-none"
            style={{ width: `${zoom * 100}%` }}
            onDoubleClick={() => setZoomIndex((current) => (current === 0 ? 2 : 0))}
          />
        )}
      </div>
      <p className="text-center text-xs text-mist">
        {photo.width} × {photo.height} px · {formatBytes(photo.bytes)} · glisse pour te déplacer dans l’image zoomée
      </p>
      {photo.notes && <p className="text-sm text-snow">{photo.notes}</p>}
      {failure && <Alert tone="error">{failure}</Alert>}
      <Button variant="ghost" block className="text-red-300" onClick={() => setConfirm(true)}>
        <Trash2 aria-hidden size={18} />
        Supprimer cette photo
      </Button>
      <ConfirmDialog
        open={confirm}
        title="Supprimer cette photo ?"
        confirmLabel="Supprimer"
        tone="danger"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(false)}
      >
        <p>La photo sera effacée définitivement de cet iPhone (image et miniature).</p>
      </ConfirmDialog>
    </Screen>
  );
}
