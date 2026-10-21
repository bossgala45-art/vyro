import { useState } from 'react';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useCalendarData } from '../../data/hooks';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { expandOccurrences } from '../../domain/calendar/occurrences';
import type { Vacation } from '../../domain/calendar/types';
import { validateVacation } from '../../domain/calendar/validation';
import { daysBetween } from '../../domain/common/dates';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ChoiceGroup, TextField, Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate, newId } from '../training/format';

export function VacationScreen() {
  const data = useCalendarData();
  const today = todayIso();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [basketballSuspended, setBasketballSuspended] = useState(true);
  const [gym, setGym] = useState<Vacation['gym']>('none');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Vacation | null>(null);
  const [removing, setRemoving] = useState<Vacation | null>(null);
  const [busy, setBusy] = useState(false);

  if (!data) return null;
  const vacations = [...data.vacations].sort((a, b) => a.start.localeCompare(b.start));

  const prepare = () => {
    const problem = validateVacation({ start, end }, data.vacations);
    setError(problem ?? null);
    if (problem) return;
    setPending({ id: newId(), start, end, basketballSuspended, gym, confirmedAt: '' });
  };

  const impact = (vacation: Vacation) => {
    const occurrences = expandOccurrences(data.activities, data.exceptions, [], vacation.start, vacation.end);
    return {
      days: daysBetween(vacation.start, vacation.end) + 1,
      practices: occurrences.filter((occurrence) => occurrence.kind === 'practice').length,
      matches: occurrences.filter((occurrence) => occurrence.kind === 'match').length,
    };
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await calendarRepository.saveVacation({ ...pending, confirmedAt: nowIso() });
      setPending(null);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Vacances non enregistrées.');
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await calendarRepository.deleteVacation(removing.id);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Suppression impossible.');
    }
    setRemoving(null);
  };

  const pendingImpact = pending ? impact(pending) : null;

  return (
    <Screen title="Vacances" subtitle="Calendrier">
      {error && <Alert tone="error">{error}</Alert>}
      {vacations.length > 0 && (
        <Card>
          <h2 className="font-semibold text-snow">Périodes prévues</h2>
          <ul className="mt-2 divide-y divide-ink-700/60">
            {vacations.map((vacation) => (
              <li key={vacation.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-snow">
                  {formatShortDate(vacation.start)} → {formatShortDate(vacation.end)}
                  <span className="block text-xs text-mist">
                    {vacation.basketballSuspended ? 'Basket suspendu' : 'Basket maintenu'} ·{' '}
                    {vacation.gym === 'none' ? 'pas de salle' : 'salle selon tes disponibilités'}
                  </span>
                </span>
                <button type="button" onClick={() => setRemoving(vacation)} className="min-h-11 px-2 text-sm text-mist active:text-red-300">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold text-snow">Nouvelle période</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField name="vacation-start" label="Du" type="date" value={start} onChange={setStart} />
            <TextField name="vacation-end" label="Au (inclus)" type="date" value={end} onChange={setEnd} />
          </div>
          <Toggle
            label="Suspendre le basket habituel"
            description="Entraînements et matchs habituels mis en pause (ils réapparaissent après les vacances)."
            checked={basketballSuspended}
            onChange={setBasketballSuspended}
          />
          <ChoiceGroup<Vacation['gym']>
            name="vacation-gym"
            label="Musculation pendant les vacances"
            columns={1}
            value={gym}
            onChange={setGym}
            options={[
              { value: 'none', label: 'Pas de salle', description: 'Repos de musculation pendant toute la période' },
              { value: 'usual', label: 'Salle selon mes disponibilités habituelles' },
            ]}
          />
          <Button block onClick={prepare}>
            Activer le mode vacances…
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        title="Confirmer les vacances ?"
        confirmLabel="Confirmer"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirm()}
      >
        {pending && pendingImpact && (
          <>
            <p>
              Du {formatShortDate(pending.start).toLocaleLowerCase('fr')} au {formatShortDate(pending.end).toLocaleLowerCase('fr')} ({pendingImpact.days} jour
              {pendingImpact.days > 1 ? 's' : ''}).
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {pending.basketballSuspended && (
                <li>
                  {pendingImpact.practices} entraînement{pendingImpact.practices > 1 ? 's' : ''} et {pendingImpact.matches} match
                  {pendingImpact.matches > 1 ? 's' : ''} suspendu{pendingImpact.practices + pendingImpact.matches > 1 ? 's' : ''}.
                </li>
              )}
              <li>{pending.gym === 'none' ? 'Aucune séance de musculation planifiée.' : 'Séances planifiées selon tes disponibilités habituelles.'}</li>
              <li>Ton historique et tes séances passées ne changent pas. Le planning sera recalculé.</li>
            </ul>
          </>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={removing !== null}
        title="Supprimer ces vacances ?"
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={() => void remove()}
      >
        <p>Ton planning habituel reprend sur cette période.</p>
      </ConfirmDialog>
    </Screen>
  );
}
