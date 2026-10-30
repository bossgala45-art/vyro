import { CalendarDays, ChevronRight, History, ListChecks, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { estimateMinutes, generateProgram } from '../../domain/training/program';
import { nextCoreTemplate, weekStart, type DayStatus } from '../../domain/training/schedule';
import type { TemplateKey } from '../../domain/training/types';
import { createWorkout, lastCompletedCoreKey } from '../../domain/training/workout';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { useWeek } from '../calendar/usePlanning';
import { formatShortDate, newId } from './format';
import { StartWorkoutDialog } from './StartWorkoutDialog';

const STATUS_LABELS: Record<DayStatus, { label: string; className: string }> = {
  done: { label: 'Faite', className: 'bg-emerald-500/15 text-emerald-300' },
  missed: { label: 'Manquée', className: 'bg-amber-400/15 text-amber-200' },
  today: { label: 'Aujourd’hui', className: 'bg-volt-600/25 text-volt-400' },
  upcoming: { label: 'Prévue', className: 'bg-ink-800 text-mist' },
};

export function TrainingScreen() {
  const navigate = useNavigate();
  const today = todayIso();
  const monday = weekStart(today);
  const week = useWeek(monday);
  const [starting, setStarting] = useState<TemplateKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (!week) return null;
  const { profile, program, workouts, plan, statuses, data } = week;
  const hasAvailability = data.planning !== null && data.planning.gymSlots.length > 0;
  const todayContext = week.days.find((day) => day.date === today);
  const running = workouts.find((workout) => workout.status === 'in-progress');

  const generate = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const result = generateProgram({ id: newId(), now: nowIso(), profile });
      await trainingRepository.activateNewProgram(result.program);
      setWarnings(result.warnings);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Programme non enregistré.');
    } finally {
      setBusy(false);
    }
  };

  const start = async (templateKey: TemplateKey, light: boolean) => {
    if (!program) return;
    setBusy(true);
    setError(null);
    try {
      const workout = createWorkout({ id: newId(), program, templateKey, date: today, now: nowIso(), light, history: workouts });
      const started = await trainingRepository.startWorkout(workout);
      navigate(`/entrainement/seance/${started.id}`);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Séance non démarrée.');
      setBusy(false);
    }
  };

  const nextKey = program ? nextCoreTemplate(program, lastCompletedCoreKey(program, workouts)) : null;
  const nextTemplate = program?.templates.find((template) => template.key === nextKey);
  const optionalTemplate = program?.templates.find((template) => template.optional);
  const startingTemplate = program?.templates.find((template) => template.key === starting);

  return (
    <Screen title="Séances" subtitle="Musculation">
      {error && <Alert tone="error">{error}</Alert>}

      {running && (
        <Card className="border-volt-500/60">
          <p className="text-sm text-volt-400">Séance en cours</p>
          <p className="mt-1 font-semibold text-snow">Séance {running.templateKey}</p>
          <Button block className="mt-3" onClick={() => navigate(`/entrainement/seance/${running.id}`)}>
            Reprendre la séance
          </Button>
        </Card>
      )}

      {!hasAvailability && (
        <Card>
          <h2 className="font-semibold text-snow">1. Tes disponibilités</h2>
          <p className="mt-1 text-sm text-mist">
            Indique tes jours de salle, tes entraînements et tes matchs pour placer tes séances autour du basket.
          </p>
          <Button block className="mt-3" onClick={() => navigate('/calendrier/habituel')}>
            Indiquer mes disponibilités
          </Button>
        </Card>
      )}

      {!program && (
        <Card>
          <h2 className="font-semibold text-snow">{hasAvailability ? 'Ton programme' : '2. Ton programme'}</h2>
          <p className="mt-1 text-sm text-mist">
            Généré à partir de ton profil : matériel, durée de séance, expérience et exercices à éviter. Tout reste modifiable.
          </p>
          <Button block className="mt-3" busy={busy} onClick={() => void generate()}>
            Générer mon programme
          </Button>
        </Card>
      )}

      {warnings.length > 0 && (
        <Alert tone="warning" title="À noter">
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {program && nextTemplate && !running && (
        <Card className="bg-gradient-to-br from-volt-600/20 via-ink-900 to-ink-900">
          <p className="text-sm text-mist">Prochaine séance</p>
          <p className="mt-1 font-display text-xl font-semibold text-snow">{nextTemplate.name}</p>
          <p className="text-sm text-mist">
            {nextTemplate.focus} · environ {estimateMinutes(nextTemplate.slots)} min
          </p>
          <Button block className="mt-4" onClick={() => setStarting(nextTemplate.key)}>
            Commencer
          </Button>
          {optionalTemplate && (
            <Button variant="ghost" block className="mt-1" onClick={() => setStarting(optionalTemplate.key)}>
              Faire plutôt la séance facultative {optionalTemplate.key}
            </Button>
          )}
        </Card>
      )}

      {plan && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-snow">Cette semaine</h2>
            <Link to="/calendrier" className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
              Calendrier
            </Link>
          </div>
          {plan.status === 'unknown-availability' || plan.status === 'no-valid-day' ? (
            <p className="mt-2 text-sm text-mist">{plan.explanations.at(-1)}</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-700/60" aria-label="Planning de la semaine">
              {week.days.map((day) => {
                const session = plan.sessions.find((item) => item.date === day.date);
                const tags = [
                  day.isMatchDay ? 'Match' : null,
                  day.practice ? 'Basket' : null,
                  day.vacation ? 'Vacances' : null,
                ].filter((tag): tag is string => tag !== null);
                const status = session ? statuses.get(day.date) : undefined;
                return (
                  <li key={day.date} className={`flex min-h-12 items-center gap-3 py-2 ${day.date === today ? 'font-semibold' : ''}`}>
                    <span className="w-28 shrink-0 text-sm text-snow">{formatShortDate(day.date).split(' ').slice(0, 2).join(' ')}</span>
                    <span className="flex flex-1 flex-wrap items-center gap-1.5 text-sm">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-200">
                          {tag}
                        </span>
                      ))}
                      {session && (
                        <span className="text-snow">
                          Séance {session.templateKey}
                          {session.optional ? ' (facultative)' : ''}
                          {session.startTime ? ` · ${session.startTime}` : ''}
                          {session.light ? ' · allégée' : ''}
                        </span>
                      )}
                    </span>
                    {session && status && (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_LABELS[status].className}`}>{STATUS_LABELS[status].label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {[...statuses.values()].includes('missed') && (
            <p className="mt-3 text-sm text-mist">
              Séance manquée : pas de rattrapage ni de séance plus lourde. La prochaine séance reprend simplement la suite du programme.
            </p>
          )}
          {plan.status !== 'unknown-availability' && (
            <details className="mt-3 text-sm">
              <summary className="min-h-11 cursor-pointer py-2 font-medium text-volt-400">Pourquoi ce planning ?</summary>
              <ul className="list-disc space-y-1 pl-5 text-mist">
                {plan.explanations.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {plan.excludedDays.map((day) => (
                  <li key={day.date}>
                    {formatShortDate(day.date)} : pas de musculation ({day.reason}).
                  </li>
                ))}
                {plan.sessions.flatMap((session) =>
                  session.notes.map((note) => (
                    <li key={`${session.date}-${note}`}>
                      {formatShortDate(session.date)} : {note}
                    </li>
                  )),
                )}
              </ul>
            </details>
          )}
        </Card>
      )}

      <nav aria-label="Musculation">
        <ul className="overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/80">
          {[
            { to: '/entrainement/programme', label: 'Mon programme', icon: ListChecks, show: Boolean(program) },
            { to: '/entrainement/historique', label: 'Historique', icon: History, show: true },
            { to: '/entrainement/records', label: 'Records personnels', icon: Trophy, show: true },
            { to: '/calendrier/habituel', label: 'Planning habituel', icon: CalendarDays, show: hasAvailability },
          ]
            .filter((item) => item.show)
            .map(({ to, label, icon: Icon }) => (
              <li key={to} className="border-b border-ink-700/60 last:border-b-0">
                <Link to={to} className="flex min-h-14 items-center gap-3 px-4 active:bg-ink-800">
                  <Icon aria-hidden size={18} className="text-volt-400" />
                  <span className="flex-1 font-medium text-snow">{label}</span>
                  <ChevronRight aria-hidden size={18} className="text-mist" />
                </Link>
              </li>
            ))}
        </ul>
      </nav>

      {startingTemplate && (
        <StartWorkoutDialog
          template={startingTemplate}
          isMatchDay={todayContext?.isMatchDay ?? false}
          isDayBeforeMatch={todayContext?.matchTomorrow ?? false}
          fatigueDeclared={todayContext?.fatigue ?? false}
          busy={busy}
          onCancel={() => setStarting(null)}
          onStart={(light) => void start(startingTemplate.key, light)}
        />
      )}
    </Screen>
  );
}
