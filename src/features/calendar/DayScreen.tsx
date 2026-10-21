import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { nowIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { conflictsWith } from '../../domain/calendar/occurrences';
import { isLocalTime, toMinutes } from '../../domain/calendar/time';
import type { DayOverride, Occurrence } from '../../domain/calendar/types';
import { isIsoDate } from '../../domain/common/dates';
import { weekStart } from '../../domain/training/schedule';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextField, Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate, newId } from '../training/format';
import { formatTimeRange, KIND_LABELS } from './labels';
import { useWeek, type WeekView } from './usePlanning';

export function DayScreen() {
  const { date = '' } = useParams();
  const week = useWeek(isIsoDate(date) ? weekStart(date) : '');
  if (!isIsoDate(date)) return <Navigate to="/calendrier" replace />;
  if (!week) return null;
  return <DayContent key={date} date={date} week={week} />;
}

const errorText = (error: unknown) => (error instanceof StorageError ? error.message : 'Modification non enregistrée.');

function DayContent({ date, week }: { date: string; week: WeekView }) {
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<Occurrence | null>(null);
  const [cancelling, setCancelling] = useState<Occurrence | null>(null);
  const [deleting, setDeleting] = useState<Occurrence | null>(null);
  const day = week.days.find((item) => item.date === date);
  const occurrences = week.occurrences.filter((occurrence) => occurrence.date === date);
  const cancelled = week.data.exceptions.filter((exception) => exception.date === date && exception.action === 'cancel');
  const session = week.plan?.sessions.find((item) => item.date === date);
  const excluded = week.plan?.excludedDays.find((item) => item.date === date);
  const override = week.data.overrides.find((item) => item.date === date);
  const status = week.statuses.get(date);

  const run = async (operation: () => Promise<void>) => {
    setError(null);
    try {
      await operation();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const cancelOccurrence = (occurrence: Occurrence) =>
    run(async () => {
      await calendarRepository.setException({
        id: newId(),
        activityId: occurrence.activityId,
        date: occurrence.movedFrom ?? occurrence.date,
        action: 'cancel',
        newDate: null,
        newStartTime: null,
        createdAt: nowIso(),
      });
      setCancelling(null);
    });

  return (
    <Screen title={formatShortDate(date)} subtitle={date === week.today ? 'Aujourd’hui' : 'Journée'}>
      {error && <Alert tone="error">{error}</Alert>}
      {day?.vacation && (
        <Alert tone="info" title="Vacances">
          {day.vacation.basketballSuspended ? 'Basket habituel suspendu. ' : ''}
          {day.vacation.gym === 'none' ? 'Pas de musculation prévue.' : 'Musculation selon tes disponibilités habituelles.'}
        </Alert>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-snow">Activités</h2>
          <Link to={`/calendrier/activite/nouvelle?date=${date}`} className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
            + Ajouter
          </Link>
        </div>
        {occurrences.length === 0 && cancelled.length === 0 && <p className="mt-1 text-sm text-mist">Aucune activité ce jour-là.</p>}
        <ul className="mt-2 space-y-3">
          {occurrences.map((occurrence) => {
            const log = week.data.logs.find((item) => item.id === occurrence.id);
            const overlapping = conflictsWith(occurrence, occurrences);
            return (
              <li key={occurrence.id} className="rounded-xl bg-ink-950/60 p-3">
                <p className={`font-medium ${occurrence.suspended ? 'text-mist line-through' : 'text-snow'}`}>{occurrence.title}</p>
                <p className="text-sm text-mist">
                  {KIND_LABELS[occurrence.kind]} · {formatTimeRange(occurrence)}
                  {occurrence.recurring ? ' · habituel' : ''}
                </p>
                {occurrence.movedFrom && <p className="text-xs text-amber-200">Reporté du {formatShortDate(occurrence.movedFrom).toLocaleLowerCase('fr')}</p>}
                {occurrence.suspended && <p className="text-xs text-mist">Suspendu pendant les vacances</p>}
                {overlapping.length > 0 && (
                  <p className="mt-1 text-xs text-red-200">Conflit horaire avec : {overlapping.map((item) => item.title).join(', ')}</p>
                )}
                {log && (
                  <p className="mt-1 text-xs text-mist">
                    Suivi : {log.played ? `joué${log.intensity !== null ? `, intensité ${log.intensity}/10` : ''}` : 'non joué'}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {occurrence.kind !== 'other' && !occurrence.suspended && date <= week.today && (
                    <Link to={`/calendrier/suivi/${encodeURIComponent(occurrence.id)}?date=${date}`} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-volt-400">
                      {log ? 'Modifier le suivi' : occurrence.kind === 'match' ? 'Saisir le match' : 'Saisir l’intensité'}
                    </Link>
                  )}
                  {occurrence.recurring ? (
                    <>
                      <ActionButton onClick={() => setMoving(occurrence)}>Reporter</ActionButton>
                      <ActionButton onClick={() => setCancelling(occurrence)}>Annuler cette fois</ActionButton>
                      {occurrence.movedFrom && (
                        <ActionButton onClick={() => void run(() => calendarRepository.clearException(occurrence.activityId, occurrence.movedFrom as string))}>
                          Rétablir
                        </ActionButton>
                      )}
                      <Link to={`/calendrier/activite/${occurrence.activityId}`} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-mist">
                        Modifier l’habitude
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to={`/calendrier/activite/${occurrence.activityId}`} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-mist">
                        Modifier
                      </Link>
                      <ActionButton onClick={() => setDeleting(occurrence)}>Supprimer</ActionButton>
                    </>
                  )}
                </div>
                {moving?.id === occurrence.id && (
                  <MoveForm occurrence={occurrence} onCancel={() => setMoving(null)} onError={setError} onDone={() => setMoving(null)} />
                )}
              </li>
            );
          })}
          {cancelled.map((exception) => {
            const activity = week.data.activities.find((item) => item.id === exception.activityId);
            return (
              <li key={exception.id} className="flex items-center justify-between rounded-xl bg-ink-950/60 p-3 text-sm">
                <span className="text-mist line-through">{activity?.title ?? 'Activité'} (annulé)</span>
                <ActionButton onClick={() => void run(() => calendarRepository.clearException(exception.activityId, exception.date))}>Rétablir</ActionButton>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Musculation</h2>
        {session ? (
          <div className="mt-1 space-y-1 text-sm">
            <p className="text-snow">
              Séance {session.templateKey}
              {session.optional ? ' (facultative)' : ''}
              {session.startTime ? ` à ${session.startTime}` : ' — horaire libre'}
              {status === 'done' ? ' · faite' : status === 'missed' ? ' · manquée (pas de rattrapage)' : ''}
            </p>
            {session.light && <p className="text-amber-200">Version allégée conseillée.</p>}
            <ul className="list-disc space-y-0.5 pl-5 text-mist">
              {session.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            {date === week.today && status !== 'done' && (
              <Link to="/entrainement" className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-volt-600 px-4 font-semibold text-white">
                Aller à la séance
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm text-mist">
            Pas de séance prévue
            {!week.plan
              ? ' (programme non généré).'
              : excluded
                ? ` : ${excluded.reason}.`
                : day?.gym.available
                  ? ' : jour disponible, mais non retenu pour garder du temps de récupération entre les séances.'
                  : ` : ${day?.gym.reason ?? 'salle indisponible'}.`}
          </p>
        )}
      </Card>

      <DaySettings date={date} override={override} onError={setError} />

      <ConfirmDialog
        open={cancelling !== null}
        title="Annuler cette occurrence ?"
        confirmLabel="Annuler cette fois"
        tone="danger"
        onCancel={() => setCancelling(null)}
        onConfirm={() => cancelling && void cancelOccurrence(cancelling)}
      >
        <p>Seule cette date est annulée ; les semaines suivantes restent inchangées. Le planning de musculation sera recalculé.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette activité ?"
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          void run(async () => {
            await calendarRepository.deleteActivity(deleting.activityId);
            setDeleting(null);
          })
        }
      >
        <p>Le suivi déjà saisi (intensité, statistiques) est conservé dans l’historique.</p>
      </ConfirmDialog>
    </Screen>
  );
}

function ActionButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-lg px-3 text-sm text-mist active:text-snow">
      {children}
    </button>
  );
}

function MoveForm({
  occurrence,
  onCancel,
  onDone,
  onError,
}: {
  occurrence: Occurrence;
  onCancel: () => void;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [newDate, setNewDate] = useState(occurrence.date);
  const [newTime, setNewTime] = useState(occurrence.startTime ?? '');
  const [problem, setProblem] = useState<string | null>(null);

  const save = async () => {
    if (!isIsoDate(newDate)) return setProblem('Choisis une date.');
    if (newTime && !isLocalTime(newTime)) return setProblem('Heure invalide.');
    try {
      await calendarRepository.setException({
        id: newId(),
        activityId: occurrence.activityId,
        date: occurrence.movedFrom ?? occurrence.date,
        action: 'move',
        newDate,
        newStartTime: newTime || null,
        createdAt: nowIso(),
      });
      onDone();
    } catch (e) {
      onError(errorText(e));
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-ink-700 p-3">
      <p className="text-sm text-snow">Reporter uniquement cette occurrence</p>
      <div className="grid grid-cols-2 gap-2">
        <TextField name={`move-date-${occurrence.id}`} label="Nouvelle date" type="date" value={newDate} onChange={setNewDate} />
        <TextField name={`move-time-${occurrence.id}`} label="Heure" type="time" value={newTime} onChange={setNewTime} />
      </div>
      {problem && <p className="text-xs text-red-300">{problem}</p>}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => void save()}>
          Reporter
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function DaySettings({ date, override, onError }: { date: string; override: DayOverride | undefined; onError: (message: string) => void }) {
  const current: DayOverride = override ?? { date, rest: false, gymUnavailable: false, gymWindow: null, fatigue: false, note: '', updatedAt: '' };
  const [from, setFrom] = useState(current.gymWindow?.from ?? '');
  const [to, setTo] = useState(current.gymWindow?.to ?? '');
  const [windowError, setWindowError] = useState<string | null>(null);

  const save = async (patch: Partial<DayOverride>) => {
    try {
      await calendarRepository.saveOverride({ ...current, ...patch, updatedAt: nowIso() });
    } catch (e) {
      onError(errorText(e));
    }
  };

  const saveWindow = () => {
    if (!from && !to) {
      setWindowError(null);
      return void save({ gymWindow: null });
    }
    if (!isLocalTime(from) || !isLocalTime(to) || toMinutes(to) <= toMinutes(from)) {
      return setWindowError('Indique une heure de début et une heure de fin valides.');
    }
    setWindowError(null);
    void save({ gymWindow: { from, to } });
  };

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-snow">Cette journée</h2>
      <div className="space-y-4">
        <Toggle label="Jour de repos" description="Aucune séance de musculation ce jour-là." checked={current.rest} onChange={(rest) => void save({ rest })} />
        <Toggle
          label="Salle indisponible"
          checked={current.gymUnavailable}
          onChange={(gymUnavailable) => void save({ gymUnavailable })}
        />
        <Toggle
          label="Je suis fatigué"
          description="La séance prévue ce jour-là passe en version allégée conseillée, ou est déplacée si possible."
          checked={current.fatigue}
          onChange={(fatigue) => void save({ fatigue })}
        />
        <div>
          <p className="text-sm font-medium text-snow">Créneau de salle ce jour-là</p>
          <p className="text-xs text-mist">Remplace ton créneau habituel pour cette date uniquement.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <TextField name="day-from" label="De" type="time" value={from} onChange={setFrom} />
            <TextField name="day-to" label="À" type="time" value={to} onChange={setTo} />
          </div>
          {windowError && <p className="mt-1 text-xs text-red-300">{windowError}</p>}
          <Button variant="secondary" className="mt-2" onClick={saveWindow}>
            Enregistrer le créneau
          </Button>
        </div>
      </div>
    </Card>
  );
}
