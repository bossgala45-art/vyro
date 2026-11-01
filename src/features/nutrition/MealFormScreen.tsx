import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useMeal, useMealPhoto } from '../../data/hooks';
import { nutritionRepository, type PhotoChange } from '../../data/repositories/nutritionRepository';
import { imageAnalysisAvailability } from '../../domain/nutrition/imageAnalysis';
import { MEAL_TEXT_MAX, validateMeal, type MealErrors } from '../../domain/nutrition/integrity';
import { MEAL_SLOTS, PORTION_SIZES, type MealEntry, type MealSlot, type PortionSize } from '../../domain/nutrition/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ChoiceGroup, TextAreaField } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { newId } from '../training/format';
import { PORTION_LABELS, SLOT_LABELS } from './labels';
import { PhotoError, preparePhoto, usePhotoUrl } from './photo';

const isSlot = (value: string | null): value is MealSlot => MEAL_SLOTS.includes(value as MealSlot);

export function MealFormScreen() {
  const { id } = useParams();
  const meal = useMeal(id ?? '');
  if (id && meal === undefined) return null;
  if (id && meal === null) {
    return (
      <Screen title="Repas" subtitle="Nutrition">
        <Alert tone="warning">Ce repas n’existe plus (il a peut-être été supprimé).</Alert>
      </Screen>
    );
  }
  return <MealForm key={meal?.id ?? 'new'} existing={meal ?? null} />;
}

type Answer = 'yes' | 'no' | 'unknown' | '';
type PortionAnswer = PortionSize | 'unknown' | '';

const toAnswer = (value: boolean | null | undefined): Answer => (value === true ? 'yes' : value === false ? 'no' : '');
const fromAnswer = (value: Answer): boolean | null => (value === 'yes' ? true : value === 'no' ? false : null);
const ANSWERS = [
  { value: 'yes', label: 'Oui' },
  { value: 'no', label: 'Non' },
  { value: 'unknown', label: 'Je ne sais pas' },
] as const;

function MealForm({ existing }: { existing: MealEntry | null }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const moment = params.get('moment');
  const [mealId] = useState(() => existing?.id ?? newId());
  const [slot, setSlot] = useState<MealSlot | ''>(existing?.slot ?? (isSlot(moment) ? moment : ''));
  const [status, setStatus] = useState<'eaten' | 'skipped'>(existing?.skipped ? 'skipped' : 'eaten');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [portion, setPortion] = useState<PortionAnswer>(existing?.portion ?? '');
  const [protein, setProtein] = useState<Answer>(toAnswer(existing?.protein));
  const [fruit, setFruit] = useState<Answer>(toAnswer(existing?.fruitOrVegetable));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [photoChange, setPhotoChange] = useState<PhotoChange>({ action: 'keep' });
  const [errors, setErrors] = useState<MealErrors & { slot?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const storedPhoto = useMealPhoto(photoChange.action === 'keep' ? (existing?.photoId ?? null) : null);
  const shownPhoto = photoChange.action === 'replace' ? photoChange.photo : photoChange.action === 'keep' ? storedPhoto : null;
  const photoUrl = usePhotoUrl(shownPhoto);
  const hasPhoto = photoChange.action === 'replace' || (photoChange.action === 'keep' && existing?.photoId != null);
  const analysis = imageAnalysisAvailability();

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPreparing(true);
    setPhotoError(null);
    try {
      setPhotoChange({ action: 'replace', photo: await preparePhoto(file, mealId, newId(), nowIso()) });
    } catch (e) {
      setPhotoError(e instanceof PhotoError ? e.message : 'Photo non ajoutée.');
    } finally {
      setPreparing(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => {
    const now = nowIso();
    const skipped = status === 'skipped';
    const entry: MealEntry = {
      id: mealId,
      date: existing?.date ?? todayIso(),
      slot: slot || 'lunch',
      skipped,
      description: skipped ? '' : description.trim(),
      portion: skipped || portion === '' || portion === 'unknown' ? null : portion,
      protein: skipped ? null : fromAnswer(protein),
      fruitOrVegetable: skipped ? null : fromAnswer(fruit),
      photoId: existing?.photoId ?? null,
      notes: notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const found: MealErrors & { slot?: string } = validateMeal(entry);
    if (!slot) found.slot = 'Choisis le moment du repas.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setFailure(null);
    try {
      await nutritionRepository.saveMeal(entry, skipped && hasPhoto ? { action: 'remove' } : photoChange);
      navigate('/nutrition', { replace: true });
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Repas non enregistré.');
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await nutritionRepository.removeMeal(mealId);
      navigate('/nutrition', { replace: true });
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Repas non supprimé.');
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Screen title={existing ? 'Modifier le repas' : 'Ajouter un repas'} subtitle="Nutrition">
      <Card>
        <div className="space-y-6">
          <ChoiceGroup<MealSlot>
            name="meal-slot"
            label="Moment"
            value={slot}
            onChange={setSlot}
            error={errors.slot}
            options={MEAL_SLOTS.map((value) => ({ value, label: SLOT_LABELS[value] }))}
          />
          <ChoiceGroup<'eaten' | 'skipped'>
            name="meal-status"
            label="Ce repas"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'eaten', label: 'Je l’ai pris' },
              { value: 'skipped', label: 'Je l’ai sauté' },
            ]}
          />
          {status === 'eaten' && (
            <>
              <TextAreaField
                name="meal-description"
                label="Qu’as-tu mangé ?"
                placeholder="ex. Pâtes bolognaise, yaourt"
                value={description}
                onChange={setDescription}
                maxLength={MEAL_TEXT_MAX}
                error={errors.description}
              />
              <ChoiceGroup<Exclude<PortionAnswer, ''>>
                name="meal-portion"
                label="Portion (à ton ressenti)"
                value={portion}
                onChange={setPortion}
                options={[
                  ...PORTION_SIZES.map((value) => ({ value, label: PORTION_LABELS[value] })),
                  { value: 'unknown' as const, label: 'Je ne sais pas' },
                ]}
              />
              <ChoiceGroup<Exclude<Answer, ''>>
                name="meal-protein"
                label="Une source de protéines ? (viande, poisson, œufs, laitage, légumineuses)"
                columns={3}
                value={protein}
                onChange={setProtein}
                options={ANSWERS}
              />
              <ChoiceGroup<Exclude<Answer, ''>>
                name="meal-fruit"
                label="Un fruit ou un légume ?"
                columns={3}
                value={fruit}
                onChange={setFruit}
                options={ANSWERS}
              />
            </>
          )}
          <TextAreaField name="meal-notes" label="Notes (facultatif)" value={notes} onChange={setNotes} maxLength={MEAL_TEXT_MAX} error={errors.notes} />
        </div>
      </Card>

      {status === 'eaten' && (
        <Card>
          <h2 className="font-semibold text-snow">Photo (facultatif)</h2>
          <p className="mt-1 text-xs text-mist">{analysis.available ? '' : analysis.reason}</p>
          {photoUrl && <img src={photoUrl} alt="Photo du repas" className="mt-3 max-h-72 w-full rounded-xl object-cover" />}
          {photoError && (
            <div className="mt-3">
              <Alert tone="error">{photoError}</Alert>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choisir une photo du repas"
            onChange={(event) => void choosePhoto(event.target.files?.[0])}
          />
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="secondary" busy={preparing} onClick={() => fileInput.current?.click()}>
              <ImagePlus aria-hidden size={18} />
              {hasPhoto ? 'Changer la photo' : 'Ajouter une photo'}
            </Button>
            {hasPhoto && (
              <Button variant="ghost" disabled={preparing} onClick={() => setPhotoChange({ action: 'remove' })}>
                Retirer la photo
              </Button>
            )}
          </div>
        </Card>
      )}

      {failure && (
        <Alert tone="error" title="Repas non enregistré">
          {failure} Ta saisie est conservée : tu peux réessayer.
        </Alert>
      )}
      <Button block busy={saving} disabled={preparing} onClick={() => void save()}>
        Enregistrer
      </Button>
      {existing && (
        <Button variant="ghost" block disabled={saving} onClick={() => setConfirmDelete(true)}>
          <Trash2 aria-hidden size={18} />
          Supprimer ce repas
        </Button>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce repas ?"
        confirmLabel="Supprimer"
        tone="danger"
        busy={saving}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      >
        Le repas{existing?.photoId ? ' et sa photo seront supprimés' : ' sera supprimé'} définitivement de cet iPhone.
      </ConfirmDialog>
    </Screen>
  );
}
