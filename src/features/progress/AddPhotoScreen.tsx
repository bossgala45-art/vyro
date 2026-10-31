import { ImagePlus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useProgressPhotos } from '../../data/hooks';
import { progressRepository } from '../../data/repositories/progressRepository';
import { isIsoDate } from '../../domain/common/dates';
import { lastPhotoOfPose, PHOTO_TIPS } from '../../domain/progress/photos';
import { PHOTO_POSES, type PhotoPose, type ProgressPhoto, type ProgressPhotoFile } from '../../domain/progress/types';
import { ImageError, useImageUrl } from '../../media/image';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ChoiceGroup, TextAreaField, TextField } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate, newId } from '../training/format';
import { formatBytes, POSE_LABELS } from './labels';
import { prepareProgressPhoto } from './photo';

type Prepared = { photo: ProgressPhoto; file: ProgressPhotoFile };

export function AddPhotoScreen() {
  const photos = useProgressPhotos();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [pose, setPose] = useState<PhotoPose>('front');
  const [notes, setNotes] = useState('');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | undefined>();
  const input = useRef<HTMLInputElement>(null);
  const previewImage = useMemo(() => (prepared ? { mimeType: prepared.file.mimeType, data: prepared.file.data } : null), [prepared]);
  const previewUrl = useImageUrl(previewImage);
  const reference = photos ? lastPhotoOfPose(photos, pose) : null;
  const referenceUrl = useImageUrl(reference?.thumbnail);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setPreparing(true);
    setError(null);
    try {
      setPrepared(await prepareProgressPhoto(file, { id: newId(), date, pose, notes: '', now: nowIso() }));
    } catch (e) {
      setPrepared(null);
      setError(e instanceof ImageError ? e.message : 'Photo non importée.');
    } finally {
      setPreparing(false);
      if (input.current) input.current.value = '';
    }
  };

  const save = async () => {
    if (!prepared) return;
    if (!isIsoDate(date) || date > todayIso()) {
      setDateError('Choisis une date passée ou aujourd’hui.');
      return;
    }
    setDateError(undefined);
    setSaving(true);
    setError(null);
    try {
      // Date, pose et notes sont relues au moment d'enregistrer (elles ont pu changer après l'import).
      await progressRepository.addPhoto({ ...prepared.photo, date, pose, notes: notes.trim(), createdAt: nowIso() }, prepared.file);
      navigate('/progres/photos', { replace: true });
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Photo non enregistrée.');
      setSaving(false);
    }
  };

  return (
    <Screen title="Nouvelle photo" subtitle="Progrès">
      <Card>
        <div className="space-y-4">
          <ChoiceGroup<PhotoPose>
            name="photo-pose"
            label="Pose"
            columns={3}
            value={pose}
            onChange={setPose}
            options={PHOTO_POSES.map((value) => ({ value, label: POSE_LABELS[value] }))}
          />
          <TextField name="photo-date" label="Date de la photo" type="date" value={date} onChange={setDate} max={todayIso()} error={dateError} />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Pour comparer facilement</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
          {PHOTO_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        {reference && referenceUrl && (
          <div className="mt-3 flex items-center gap-3">
            <img src={referenceUrl} alt={`Dernière photo ${POSE_LABELS[pose].toLocaleLowerCase('fr')}`} className="h-24 w-18 rounded-lg object-cover" />
            <p className="text-xs text-mist">
              Ta dernière photo « {POSE_LABELS[pose].toLocaleLowerCase('fr')} » ({formatShortDate(reference.date).toLocaleLowerCase('fr')}) : reprends le même cadrage.
            </p>
          </div>
        )}
      </Card>

      <Card>
        {previewUrl && prepared && (
          <>
            <img src={previewUrl} alt="Aperçu de la photo" className="max-h-96 w-full rounded-xl object-contain" />
            <p className="mt-2 text-xs text-mist">
              Réduite à {prepared.photo.width} × {prepared.photo.height} px · {formatBytes(prepared.photo.bytes)}. Les informations cachées de la
              photo d’origine (position GPS…) ne sont pas conservées.
            </p>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choisir une photo de progression"
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        <Button variant="secondary" block className="mt-3" busy={preparing} onClick={() => input.current?.click()}>
          <ImagePlus aria-hidden size={18} />
          {prepared ? 'Choisir une autre photo' : 'Prendre ou importer une photo'}
        </Button>
        <div className="mt-4">
          <TextAreaField name="photo-notes" label="Notes (facultatif)" value={notes} onChange={setNotes} maxLength={300} />
        </div>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      <Button block busy={saving} disabled={!prepared || preparing} onClick={() => void save()}>
        Enregistrer la photo
      </Button>
    </Screen>
  );
}
