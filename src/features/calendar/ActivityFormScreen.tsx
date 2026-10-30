import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useCalendarData } from '../../data/hooks';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { planActivityUpdate } from '../../domain/calendar/edit';
import { conflictsWith, expandOccurrences } from '../../domain/calendar/occurrences';
import { addDays } from '../../domain/calendar/time';
import type { Activity, ActivityKind, Occurrence } from '../../domain/calendar/types';
import { validateActivity, type ActivityErrors, type ActivityInput } from '../../domain/calendar/validation';
import type { CalendarData } from '../../domain/calendar/weekly';
import { isIsoDate } from '../../domain/common/dates';
import { WEEKDAY_LABELS, weekdayOf } from '../../domain/training/schedule';
import { WEEKDAYS, type Weekday } from '../../domain/training/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ChoiceGroup, TextAreaField, TextField, Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate, newId } from '../training/format';
import { formatTimeRange, KIND_LABELS } from './labels';

const DEFAULT_TITLES: Record<ActivityKind, string> = {
  practice: 'Entraînement de basket',
  match: 'Match',
  other: '',
};

export function ActivityFormScreen() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const data = useCalendarData();
  if (!data) return null;
  const existing = id ? data.activities.find((activity) => activity.id === id) : undefined;
  if (id && !existing) return <Navigate to="/calendrier" replace />;
  const date = params.get('date');
  return <ActivityForm key={id ?? 'new'} data={data} existing={existing} initialDate={date && isIsoDate(date) ? date : todayIso()} />;
}

function toInput(activity: Activity | undefined, initialDate: string): ActivityInput {
  if (!activity) {
    return { kind: 'practice', title: DEFAULT_TITLES.practice, startTime: '', durationMinutes: '', repeat: false, date: initialDate, weekday: String(weekdayOf(initialDate)), from: initialDate, until: '' };
  }
  return {
    kind: activity.kind,
    title: activity.title,
    startTime: activity.startTime ?? '',
    durationMinutes: activity.durationMinutes === null ? '' : String(activity.durationMinutes),
    repeat: activity.recurrence !== null,
    date: activity.date ?? initialDate,
    weekday: String(activity.recurrence?.weekday ?? weekdayOf(initialDate)),
    from: activity.recurrence?.from ?? initialDate,
    until: activity.recurrence?.until ?? '',
  };
}

function ActivityForm({ data, existing, initialDate }: { data: CalendarData; existing: Activity | undefined; initialDate: string }) {
  const navigate = useNavigate();
  const [input, setInput] = useState<ActivityInput>(() => toInput(existing, initialDate));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<ActivityErrors>({});
  const [conflicts, setConflicts] = useState<Occurrence[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const update = (patch: Partial<ActivityInput>) => {
    setInput((current) => ({ ...current, ...patch }));
    setConflicts([]);
  };

  const build = (): Activity => {
    const now = nowIso();
    return {
      id: existing?.id ?? newId(),
      kind: input.kind,
      title: input.title.trim(),
      startTime: input.startTime || null,
      durationMinutes: input.durationMinutes.trim() ? Number(input.durationMinutes) : null,
      date: input.repeat ? null : input.date,
      recurrence: input.repeat ? { weekday: Number(input.weekday) as Weekday, from: input.from, until: input.until || null } : null,
      notes: notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  };

  /** Chevauchements avec les autres activités (sur 8 semaines pour une activité habituelle). */
  const findOverlaps = (activity: Activity) => {
    const others = data.activities.filter((item) => item.id !== activity.id);
    const start = activity.date ?? (activity.recurrence?.from && activity.recurrence.from > todayIso() ? activity.recurrence.from : todayIso());
    const end = activity.date ?? addDays(start, 56);
    const existingOccurrences = expandOccurrences(others, data.exceptions, data.vacations, start, end);
    const candidates = expandOccurrences([activity], [], data.vacations, start, end);
    return candidates.flatMap((candidate) => conflictsWith(candidate, existingOccurrences));
  };

  const save = async (force: boolean) => {
    const found = validateActivity(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const activity = build();
    if (!force) {
      const overlaps = findOverlaps(activity);
      if (overlaps.length > 0) return setConflicts(overlaps);
    }
    setSaving(true);
    setFailure(null);
    try {
      const records = existing ? planActivityUpdate(existing, activity, todayIso(), newId()) : [activity];
      for (const record of records) await calendarRepository.saveActivity(record);
      navigate(-1);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Activité non enregistrée.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    try {
      await calendarRepository.deleteActivity(existing.id);
      navigate('/calendrier', { replace: true });
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Suppression impossible.');
      setDeleting(false);
    }
  };

  return (
    <Screen title={existing ? 'Modifier l’activité' : 'Nouvelle activité'} subtitle="Calendrier">
      <Card>
        <div className="space-y-5">
          <ChoiceGroup<ActivityKind>
            name="kind"
            label="Type"
            columns={3}
            value={input.kind}
            onChange={(kind) =>
              update({ kind, title: !input.title || input.title === DEFAULT_TITLES[input.kind] ? DEFAULT_TITLES[kind] : input.title })
            }
            options={[
              { value: 'practice', label: 'Entraînement' },
              { value: 'match', label: 'Match' },
              { value: 'other', label: 'Autre' },
            ]}
          />
          <TextField name="title" label="Nom" value={input.title} onChange={(title) => update({ title })} error={errors.title} maxLength={70} />
          <Toggle
            label="Chaque semaine"
            description="Activité habituelle, répétée le même jour de la semaine."
            checked={input.repeat}
            onChange={(repeat) => update({ repeat })}
          />
          {input.repeat ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-snow">Jour</span>
                <select
                  value={input.weekday}
                  onChange={(event) => update({ weekday: event.target.value })}
                  className="min-h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-3 text-snow focus:border-volt-500 focus:outline-none"
                >
                  {WEEKDAYS.map((weekday) => (
                    <option key={weekday} value={weekday}>
                      {WEEKDAY_LABELS[weekday]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <TextField name="from" label="À partir du" type="date" value={input.from} onChange={(from) => update({ from })} error={errors.from} />
                <TextField name="until" label="Jusqu’au (facultatif)" type="date" value={input.until} onChange={(until) => update({ until })} error={errors.until} />
              </div>
            </>
          ) : (
            <TextField name="date" label="Date" type="date" value={input.date} onChange={(date) => update({ date })} error={errors.date} />
          )}
          {input.kind === 'match' && <p className="text-xs text-mist">Les matchs ont généralement lieu le samedi ou le dimanche.</p>}
          <div className="grid grid-cols-2 gap-3">
            <TextField
              name="startTime"
              label="Heure (facultatif)"
              type="time"
              value={input.startTime}
              onChange={(startTime) => update({ startTime })}
              error={errors.startTime}
            />
            <TextField
              name="durationMinutes"
              label="Durée (min)"
              inputMode="numeric"
              value={input.durationMinutes}
              onChange={(durationMinutes) => update({ durationMinutes })}
              error={errors.durationMinutes}
              placeholder="ex. 90"
            />
          </div>
          <p className="text-xs text-mist">Sans horaire, VYRO ne peut pas vérifier les conflits avec tes séances : il te le signalera.</p>
          <TextAreaField name="notes" label="Notes (facultatif)" value={notes} onChange={setNotes} maxLength={300} />
        </div>
      </Card>

      {existing?.recurrence && existing.recurrence.from < todayIso() && (
        <Alert tone="info">Changer le jour ou l’horaire s’applique à partir d’aujourd’hui : les dates passées restent telles qu’elles ont eu lieu.</Alert>
      )}

      {conflicts.length > 0 && (
        <Alert tone="warning" title="Conflit horaire">
          <ul className="space-y-1">
            {conflicts.slice(0, 5).map((conflict) => (
              <li key={conflict.id}>
                {formatShortDate(conflict.date)} : {conflict.title} ({KIND_LABELS[conflict.kind].toLocaleLowerCase('fr')}, {formatTimeRange(conflict)})
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void save(true)} className="mt-2 min-h-11 font-semibold text-volt-400">
            Enregistrer quand même
          </button>
        </Alert>
      )}
      {failure && <Alert tone="error">{failure}</Alert>}

      <div className="flex gap-2">
        <Button className="flex-1" busy={saving} onClick={() => void save(false)}>
          Enregistrer
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Annuler
        </Button>
      </div>
      {existing && (
        <Button variant="ghost" block onClick={() => setDeleting(true)}>
          Supprimer l’activité
        </Button>
      )}
      <ConfirmDialog
        open={deleting}
        title="Supprimer cette activité ?"
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setDeleting(false)}
        onConfirm={() => void remove()}
      >
        <p>
          {existing?.recurrence ? 'Toutes ses occurrences disparaissent du calendrier. ' : ''}Le suivi déjà saisi (matchs joués, intensité) est
          conservé.
        </p>
      </ConfirmDialog>
    </Screen>
  );
}
