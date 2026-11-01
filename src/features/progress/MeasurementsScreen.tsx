import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useMeasurements } from '../../data/hooks';
import { progressRepository } from '../../data/repositories/progressRepository';
import { validateMeasurement, type MeasurementErrors } from '../../domain/progress/integrity';
import { MEASUREMENT_KEYS, type MeasurementEntry, type MeasurementKey } from '../../domain/progress/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextAreaField, TextField } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate, parseNumber } from '../training/format';
import { formatValue, MEASURE_TIPS, METRIC_LABELS } from './labels';

type Values = Record<MeasurementKey, string>;
const EMPTY: Values = { arm: '', chest: '', shoulders: '', waist: '' };

export function MeasurementsScreen() {
  const entries = useMeasurements();
  const [date, setDate] = useState(todayIso);
  const [values, setValues] = useState<Values>(EMPTY);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<MeasurementErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<MeasurementEntry | null>(null);
  if (!entries) return null;
  const existing = entries.find((entry) => entry.date === date);

  const save = async () => {
    const now = nowIso();
    const parsed = Object.fromEntries(
      MEASUREMENT_KEYS.map((key) => [key, values[key].trim() === '' ? null : (parseNumber(values[key]) ?? NaN)]),
    ) as Record<MeasurementKey, number | null>;
    const entry: MeasurementEntry = { date, ...parsed, notes: notes.trim(), createdAt: existing?.createdAt ?? now, updatedAt: now };
    const found = validateMeasurement(entry, todayIso());
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setFailure(null);
    try {
      await progressRepository.saveMeasurement(entry, todayIso());
      setValues(EMPTY);
      setNotes('');
      setMessage(existing ? 'Mensurations du jour remplacées.' : 'Mensurations enregistrées.');
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Mensurations non enregistrées.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await progressRepository.removeMeasurement(toDelete.date);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Suppression impossible.');
    }
    setToDelete(null);
  };

  return (
    <Screen title="Mensurations" subtitle="Progrès">
      <Card>
        <div className="space-y-4">
          <TextField name="measure-date" label="Date" type="date" value={date} onChange={setDate} max={todayIso()} error={errors.date} />
          {existing && <p className="text-xs text-mist">Des mensurations existent déjà à cette date : elles seront remplacées.</p>}
          {MEASUREMENT_KEYS.map((key) => (
            <TextField
              key={key}
              name={`measure-${key}`}
              label={METRIC_LABELS[key].label}
              hint={MEASURE_TIPS[key]}
              inputMode="decimal"
              suffix="cm"
              value={values[key]}
              onChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
              error={errors[key]}
            />
          ))}
          <TextAreaField name="measure-notes" label="Notes (facultatif)" value={notes} onChange={setNotes} maxLength={300} error={errors.notes} />
        </div>
        <p className="mt-3 text-xs text-mist">Laisse vide un tour que tu n’as pas mesuré : il ne sera pas estimé.</p>
      </Card>
      {errors.empty && <Alert tone="warning">{errors.empty}</Alert>}
      {message && <Alert tone="info">{message}</Alert>}
      {failure && <Alert tone="error">{failure}</Alert>}
      <Button block busy={saving} onClick={() => void save()}>
        Enregistrer
      </Button>

      <Card>
        <h2 className="font-semibold text-snow">Historique</h2>
        {entries.length === 0 ? (
          <p className="mt-1 text-sm text-mist">Aucune mensuration enregistrée.</p>
        ) : (
          <ul aria-label="Historique des mensurations" className="mt-2 divide-y divide-ink-700/60">
            {[...entries].reverse().map((entry) => (
              <li key={entry.date} className="flex items-start justify-between gap-2 py-2">
                <div className="text-sm">
                  <p className="font-medium text-snow">{formatShortDate(entry.date)}</p>
                  <p className="text-xs text-mist">
                    {MEASUREMENT_KEYS.filter((key) => entry[key] !== null)
                      .map((key) => `${METRIC_LABELS[key].short} ${formatValue(entry[key] ?? 0, 'cm')}`)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setToDelete(entry)}
                  aria-label={`Supprimer les mensurations du ${formatShortDate(entry.date)}`}
                  className="grid size-11 shrink-0 place-items-center text-mist active:text-red-300"
                >
                  <Trash2 aria-hidden size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ces mensurations ?"
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      >
        {toDelete && <p>Mensurations du {formatShortDate(toDelete.date).toLocaleLowerCase('fr')}. Cette action est définitive.</p>}
      </ConfirmDialog>
    </Screen>
  );
}
