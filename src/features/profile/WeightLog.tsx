import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useBodyWeights } from '../../data/hooks';
import { bodyWeightRepository } from '../../data/repositories/bodyWeightRepository';
import { parseDecimal, validateWeight } from '../../domain/profile/draft';
import type { BodyWeightEntry } from '../../domain/profile/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextField } from '../../ui/fields';
import { formatLongDate } from './labels';

const kg = (value: number) => `${value.toLocaleString('fr-FR')} kg`;

export function WeightLog() {
  const entries = useBodyWeights();
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayIso);
  const [errors, setErrors] = useState<{ weight?: string; date?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<BodyWeightEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const today = todayIso();
    const nextErrors: typeof errors = {};
    const weightError = validateWeight(weight);
    if (weightError) nextErrors.weight = weightError;
    if (!date) nextErrors.date = 'Choisis une date.';
    else if (date > today) nextErrors.date = 'La date ne peut pas être dans le futur.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      await bodyWeightRepository.add({ date, kg: parseDecimal(weight) as number }, new Date(), today);
      setWeight('');
      setDate(todayIso());
      setAdding(false);
    } catch (error) {
      setSaveError(error instanceof StorageError || error instanceof RangeError ? error.message : 'Pesée non enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (toDelete?.id === undefined) return;
    setDeleting(true);
    try {
      await bodyWeightRepository.remove(toDelete.id);
      setToDelete(null);
    } catch (error) {
      setSaveError(error instanceof StorageError ? error.message : 'Suppression impossible.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const latest = entries?.[0];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-snow">Poids</h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="min-h-11 px-2 text-sm font-medium text-volt-400">
            Nouvelle pesée
          </button>
        )}
      </div>

      {latest ? (
        <p className="mt-1">
          <span className="font-display text-3xl font-bold text-snow">{kg(latest.kg)}</span>
          <span className="ml-2 text-sm text-mist">le {formatLongDate(latest.date)}</span>
        </p>
      ) : (
        entries && <p className="mt-1 text-sm text-mist">Aucune pesée enregistrée.</p>
      )}

      {adding && (
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4 rounded-xl border border-ink-700 bg-ink-950/60 p-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              name="newWeight"
              label="Poids"
              value={weight}
              onChange={setWeight}
              error={errors.weight}
              inputMode="decimal"
              placeholder="ex. 58,5"
              suffix="kg"
              autoFocus
            />
            <TextField name="newWeightDate" label="Date" type="date" value={date} onChange={setDate} error={errors.date} max={todayIso()} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" busy={saving} className="flex-1">
              Enregistrer
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setErrors({});
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}

      {saveError && (
        <div className="mt-3">
          <Alert tone="error">{saveError}</Alert>
        </div>
      )}

      {entries && entries.length > 0 && (
        <details className="mt-4 group">
          <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-medium text-volt-400">
            Historique ({entries.length})
          </summary>
          <ul aria-label="Historique des pesées" className="divide-y divide-ink-700/60">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-mist">{formatLongDate(entry.date)}</span>
                <span className="flex items-center gap-1">
                  <span className="text-sm font-medium text-snow">{kg(entry.kg)}</span>
                  <button
                    type="button"
                    onClick={() => setToDelete(entry)}
                    aria-label={`Supprimer la pesée du ${formatLongDate(entry.date)}`}
                    className="grid size-11 place-items-center text-mist active:text-red-300"
                  >
                    <Trash2 aria-hidden size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette pesée ?"
        confirmLabel="Supprimer"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      >
        {toDelete && (
          <p>
            {kg(toDelete.kg)} le {formatLongDate(toDelete.date)}. Cette action est définitive.
          </p>
        )}
      </ConfirmDialog>
    </Card>
  );
}
