import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useCalendarData } from '../../data/hooks';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { expandOccurrences } from '../../domain/calendar/occurrences';
import type { ActivityLog, Occurrence } from '../../domain/calendar/types';
import { validateLog, type LogErrors } from '../../domain/calendar/validation';
import { isIsoDate } from '../../domain/common/dates';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextAreaField, TextField, Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';

export function ActivityLogScreen() {
  const { occurrenceId = '' } = useParams();
  const [params] = useSearchParams();
  const data = useCalendarData();
  const date = params.get('date') ?? '';
  if (!data) return null;
  if (!isIsoDate(date) || date > todayIso()) return <Navigate to="/calendrier" replace />;
  const occurrence = expandOccurrences(data.activities, data.exceptions, data.vacations, date, date).find((item) => item.id === occurrenceId);
  const existing = data.logs.find((log) => log.id === occurrenceId);
  if (!occurrence && !existing) return <Navigate to={`/calendrier/jour/${date}`} replace />;
  return <LogForm occurrence={occurrence} existing={existing} date={date} occurrenceId={occurrenceId} />;
}

const toText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));
const toNumber = (value: string): number | null => (value.trim() === '' ? null : /^\d+$/.test(value.trim()) ? Number(value) : NaN);

interface LogFormProps {
  occurrence: Occurrence | undefined;
  existing: ActivityLog | undefined;
  date: string;
  occurrenceId: string;
}

function LogForm({ occurrence, existing, date, occurrenceId }: LogFormProps) {
  const navigate = useNavigate();
  const kind = occurrence?.kind ?? existing?.kind ?? 'match';
  const isMatch = kind === 'match';
  const [played, setPlayed] = useState(existing?.played ?? true);
  const [intensity, setIntensity] = useState<number | null>(existing?.intensity ?? null);
  const [minutes, setMinutes] = useState(toText(existing?.minutesPlayed));
  const [points, setPoints] = useState(toText(existing?.points));
  const [rebounds, setRebounds] = useState(toText(existing?.rebounds));
  const [assists, setAssists] = useState(toText(existing?.assists));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<LogErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const save = async () => {
    const log: ActivityLog = {
      id: occurrenceId,
      activityId: occurrence?.activityId ?? existing?.activityId ?? '',
      kind,
      date,
      played,
      intensity: played ? intensity : null,
      minutesPlayed: played ? toNumber(minutes) : null,
      points: played && isMatch ? toNumber(points) : null,
      rebounds: played && isMatch ? toNumber(rebounds) : null,
      assists: played && isMatch ? toNumber(assists) : null,
      notes: notes.trim(),
      updatedAt: nowIso(),
    };
    const found = validateLog({
      intensity: log.intensity,
      minutesPlayed: Number.isNaN(log.minutesPlayed) ? -1 : log.minutesPlayed,
      points: Number.isNaN(log.points) ? -1 : log.points,
      rebounds: Number.isNaN(log.rebounds) ? -1 : log.rebounds,
      assists: Number.isNaN(log.assists) ? -1 : log.assists,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await calendarRepository.saveLog(log);
      navigate(-1);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Suivi non enregistré.');
    }
  };

  const remove = async () => {
    try {
      await calendarRepository.deleteLog(occurrenceId);
      navigate(-1);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Suppression impossible.');
      setRemoving(false);
    }
  };

  return (
    <Screen title={occurrence?.title ?? (isMatch ? 'Match' : 'Entraînement')} subtitle={formatShortDate(date)}>
      <Card>
        <div className="space-y-5">
          <Toggle label={isMatch ? 'J’ai joué ce match' : 'J’ai participé'} checked={played} onChange={setPlayed} />
          {played && (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-snow">Intensité ressentie (1 = très facile, 10 = maximale)</legend>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={intensity === value}
                      onClick={() => setIntensity(intensity === value ? null : value)}
                      className={`min-h-11 rounded-lg text-sm font-semibold ${intensity === value ? 'bg-volt-600 text-white' : 'bg-ink-800 text-mist'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                {errors.intensity && <p className="mt-1 text-xs text-red-300">{errors.intensity}</p>}
                <p className="mt-1 text-xs text-mist">Utilisée pour alléger la séance du lendemain après un match intense (8/10 ou plus).</p>
              </fieldset>
              <TextField name="minutes" label={isMatch ? 'Minutes jouées' : 'Durée (min)'} inputMode="numeric" value={minutes} onChange={setMinutes} error={errors.minutesPlayed} />
              {isMatch && (
                <div className="grid grid-cols-3 gap-2">
                  <TextField name="points" label="Points" inputMode="numeric" value={points} onChange={setPoints} error={errors.points} />
                  <TextField name="rebounds" label="Rebonds" inputMode="numeric" value={rebounds} onChange={setRebounds} error={errors.rebounds} />
                  <TextField name="assists" label="Passes déc." inputMode="numeric" value={assists} onChange={setAssists} error={errors.assists} />
                </div>
              )}
              <p className="text-xs text-mist">Tous les champs sont facultatifs : laisse vide ce que tu ne sais pas.</p>
            </>
          )}
          <TextAreaField name="log-notes" label="Notes (facultatif)" value={notes} onChange={setNotes} maxLength={300} />
        </div>
      </Card>
      {failure && <Alert tone="error">{failure}</Alert>}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => void save()}>
          Enregistrer
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Annuler
        </Button>
      </div>
      {existing && (
        <Button variant="ghost" block onClick={() => setRemoving(true)}>
          Supprimer ce suivi
        </Button>
      )}
      <ConfirmDialog open={removing} title="Supprimer ce suivi ?" confirmLabel="Supprimer" tone="danger" onCancel={() => setRemoving(false)} onConfirm={() => void remove()} />
    </Screen>
  );
}
