import { Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { nowIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useActiveProgram, useProfile, useWorkout, useWorkouts } from '../../data/hooks';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { exerciseName, getExercise, type EligibilityOptions } from '../../domain/training/exercises';
import { computeTarget, lightenTarget, workingLoad } from '../../domain/training/progression';
import { newRecordsIn } from '../../domain/training/records';
import type { Program, Workout, WorkoutExercise } from '../../domain/training/types';
import { buildWarmup } from '../../domain/training/warmup';
import { exposuresFor, summarizeWorkout } from '../../domain/training/workout';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Screen } from '../../ui/Screen';
import { ExerciseCard } from './ExerciseCard';
import { formatKg, formatLoad, formatShortDate } from './format';
import { RestTimer } from './RestTimer';

export function WorkoutScreen() {
  const { id = '' } = useParams();
  const workout = useWorkout(id);
  const workouts = useWorkouts();
  const program = useActiveProgram();
  const profile = useProfile();

  if (workout === undefined || workouts === undefined || program === undefined || profile === undefined) return null;
  if (workout === null) {
    return (
      <Screen title="Séance introuvable">
        <Link to="/entrainement" className="text-volt-400">
          Retour aux séances
        </Link>
      </Screen>
    );
  }
  if (workout.status !== 'in-progress') return <WorkoutSummary workout={workout} others={workouts} />;

  const eligibility: EligibilityOptions = {
    equipment: profile?.training.equipment ?? [],
    avoidedExercises: profile?.training.avoidedExercises ?? [],
    noUnassistedFreeBench: profile?.training.noUnassistedFreeBench ?? true,
    allowIntermediate: true,
  };
  return <WorkoutEditor key={workout.id} initial={workout} history={workouts} program={program} eligibility={eligibility} />;
}

interface EditorProps {
  initial: Workout;
  history: Workout[];
  program: Program | null;
  eligibility: EligibilityOptions;
}

function WorkoutEditor({ initial, history, program, eligibility }: EditorProps) {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(initial);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const firstRender = useRef(true);

  // Chaque modification est enregistrée immédiatement : fermer l'app ne fait rien perdre.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    trainingRepository
      .saveWorkout(workout)
      .then(() => setSaveError(null))
      .catch((error: unknown) => setSaveError(error instanceof StorageError ? error.message : 'Saisie non enregistrée.'));
  }, [workout]);

  const template = program?.templates.find((item) => item.key === workout.templateKey);
  const firstMain = workout.exercises.find((exercise) => exercise.slot.role === 'main');
  const warmup = template ? buildWarmup(template, firstMain?.target.loadKg ?? null) : [];
  const others = history.filter((item) => item.id !== workout.id);

  const updateExercise = (index: number, exercise: WorkoutExercise) =>
    setWorkout((current) => ({ ...current, exercises: current.exercises.map((item, i) => (i === index ? exercise : item)) }));

  const replaceExercise = (index: number, newExerciseId: string) => {
    const exercise = getExercise(newExerciseId);
    const current = workout.exercises[index];
    if (!exercise || !current) return;
    const slot = { ...current.slot, exerciseId: newExerciseId, startLoadKg: null };
    const exposures = exposuresFor(newExerciseId, others);
    let target = computeTarget(slot, exercise, exposures, workout.date);
    if (workout.light) target = lightenTarget(target, exposures[0] ? workingLoad(exposures[0].sets) : null);
    updateExercise(index, {
      exerciseId: newExerciseId,
      slot,
      target: { sets: target.sets, repMin: target.repMin, repMax: target.repMax, loadKg: target.loadKg },
      targetNote: `Remplace ${exerciseName(current.exerciseId)}. ${target.note}`,
      sets: Array.from({ length: target.sets }, () => ({ reps: null, loadKg: target.loadKg, rir: null, done: false })),
      pain: { reported: false, note: '' },
      skipped: false,
    });
  };

  const summary = summarizeWorkout(workout);

  const finish = async () => {
    setBusy(true);
    try {
      const completed: Workout = { ...workout, status: 'completed', finishedAt: nowIso(), sessionRpe: rpe, notes: notes.trim() };
      await trainingRepository.saveWorkout(completed);
      // L'écran bascule sur le bilan (statut « terminée »).
    } catch (error) {
      setSaveError(error instanceof StorageError ? error.message : 'Séance non terminée.');
      setBusy(false);
      setFinishing(false);
    }
  };

  const abandon = async () => {
    setBusy(true);
    try {
      await trainingRepository.saveWorkout({ ...workout, status: 'abandoned', finishedAt: nowIso() });
      navigate('/entrainement', { replace: true });
    } catch (error) {
      setSaveError(error instanceof StorageError ? error.message : 'Impossible d’abandonner la séance.');
      setBusy(false);
      setAbandoning(false);
    }
  };

  return (
    <Screen title={template?.name ?? `Séance ${workout.templateKey}`} subtitle={workout.light ? 'Version allégée' : 'Séance en cours'}>
      {saveError && (
        <Alert tone="error" title="Saisie non enregistrée">
          {saveError}
        </Alert>
      )}

      {warmup.length > 0 && (
        <Card>
          <details>
            <summary className="min-h-8 cursor-pointer font-semibold text-snow">Échauffement (environ 10 min)</summary>
            <ol className="mt-3 space-y-2 text-sm">
              {warmup.map((step) => (
                <li key={step.title}>
                  <p className="font-medium text-snow">{step.title}</p>
                  <p className="text-mist">{step.detail}</p>
                </li>
              ))}
            </ol>
          </details>
        </Card>
      )}

      {workout.exercises.map((exercise, index) => (
        <ExerciseCard
          key={`${index}-${exercise.exerciseId}`}
          exercise={exercise}
          eligibility={eligibility}
          onChange={(updated) => updateExercise(index, updated)}
          onReplace={(newId) => replaceExercise(index, newId)}
          onSetDone={(rest) => setRestEndsAt(Date.now() + rest * 1000)}
        />
      ))}

      <div className="space-y-2 pt-2">
        <Button block onClick={() => setFinishing(true)} disabled={summary.setsDone === 0}>
          Terminer la séance
        </Button>
        {summary.setsDone === 0 && <p className="text-center text-xs text-mist">Valide au moins une série pour terminer la séance.</p>}
        <Button variant="ghost" block onClick={() => setAbandoning(true)}>
          Abandonner la séance
        </Button>
      </div>

      {restEndsAt !== null && (
        <>
          {/* Espace pour que le minuteur ne masque pas le bas de la page. */}
          <div aria-hidden className="h-24" />
          <RestTimer endsAt={restEndsAt} onDone={() => setRestEndsAt(null)} />
        </>
      )}

      {finishing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="finish-title" className="w-full max-w-md animate-screen-in space-y-4 rounded-2xl border border-ink-700 bg-ink-900 p-5">
            <h2 id="finish-title" className="text-lg font-semibold text-snow">
              Terminer la séance
            </h2>
            <p className="text-sm text-mist">
              {summary.setsDone} série{summary.setsDone > 1 ? 's' : ''} validée{summary.setsDone > 1 ? 's' : ''} sur {summary.setsPlanned}.
              {summary.setsDone < summary.setsPlanned && ' Les séries non validées ne seront pas comptées, et ces exercices ne progresseront pas la prochaine fois.'}
            </p>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-snow">Difficulté ressentie (1 = très facile, 10 = maximale)</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={rpe === value}
                    onClick={() => setRpe(rpe === value ? null : value)}
                    className={`min-h-11 rounded-lg text-sm font-semibold ${rpe === value ? 'bg-volt-600 text-white' : 'bg-ink-800 text-mist'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm text-snow">
              Notes (facultatif)
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-snow focus:border-volt-500 focus:outline-none"
              />
            </label>
            <div className="flex flex-col gap-2">
              <Button busy={busy} onClick={() => void finish()}>
                Enregistrer la séance
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setFinishing(false)}>
                Continuer la séance
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={abandoning}
        title="Abandonner la séance ?"
        confirmLabel="Abandonner"
        tone="danger"
        busy={busy}
        onCancel={() => setAbandoning(false)}
        onConfirm={() => void abandon()}
      >
        <p>Elle restera dans l’historique comme abandonnée et ne sera pas utilisée pour la progression. Aucune séance de rattrapage n’est ajoutée.</p>
      </ConfirmDialog>
    </Screen>
  );
}

/** Bilan d'une séance terminée ou abandonnée (aussi utilisé depuis l'historique). */
export function WorkoutSummary({ workout, others }: { workout: Workout; others: Workout[] }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = summarizeWorkout(workout);
  const records = workout.status === 'completed' ? newRecordsIn(workout, others.filter((item) => item.date <= workout.date && item.id !== workout.id)) : [];

  const remove = async () => {
    try {
      await trainingRepository.deleteWorkout(workout.id);
      navigate('/entrainement/historique', { replace: true });
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Suppression impossible.');
      setDeleting(false);
    }
  };

  return (
    <Screen title={`Séance ${workout.templateKey}`} subtitle={formatShortDate(workout.date)}>
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        <p className="text-sm text-mist">
          {workout.status === 'abandoned' ? 'Séance abandonnée' : 'Séance terminée'}
          {workout.light ? ' · version allégée' : ''}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-mist">Séries</dt>
            <dd className="font-display text-xl font-bold text-snow">{summary.setsDone}</dd>
          </div>
          <div>
            <dt className="text-xs text-mist">Tonnage</dt>
            <dd className="font-display text-xl font-bold text-snow">{summary.volumeKg > 0 ? formatKg(summary.volumeKg) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-mist">Durée</dt>
            <dd className="font-display text-xl font-bold text-snow">{summary.durationMinutes !== null ? `${summary.durationMinutes} min` : '—'}</dd>
          </div>
        </dl>
        {workout.sessionRpe !== null && <p className="mt-3 text-sm text-mist">Difficulté ressentie : {workout.sessionRpe}/10</p>}
        {workout.notes && <p className="mt-1 text-sm text-mist">Notes : {workout.notes}</p>}
      </Card>

      {records.length > 0 && (
        <Card className="border-volt-500/60">
          <p className="flex items-center gap-2 font-semibold text-snow">
            <Trophy aria-hidden size={18} className="text-volt-400" /> Nouveaux records
          </p>
          <ul className="mt-2 space-y-1 text-sm text-mist">
            {records.map((record) => (
              <li key={`${record.exerciseId}-${record.kind}`}>
                {exerciseName(record.exerciseId)} : {record.description}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {summary.painExercises.length > 0 && (
        <Alert tone="warning" title="Douleur signalée">
          {summary.painExercises.map(exerciseName).join(', ')} : pas de hausse de charge la prochaine fois. Si la douleur persiste,
          demande l’avis d’un professionnel de santé.
        </Alert>
      )}

      {workout.exercises.map((exercise, index) => (
        <Card key={`${index}-${exercise.exerciseId}`}>
          <h2 className="font-semibold text-snow">{exerciseName(exercise.exerciseId)}</h2>
          {exercise.skipped ? (
            <p className="text-sm text-mist">Exercice passé</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm text-mist">
              {exercise.sets.map((set, i) => (
                <li key={i}>
                  Série {i + 1} :{' '}
                  {set.done
                    ? `${set.reps} rép.${set.loadKg !== null ? ` × ${formatLoad(exercise.exerciseId, set.loadKg)}` : ''}${set.rir !== null ? ` · ${set.rir} en réserve` : ''}`
                    : 'non faite'}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <div className="space-y-2">
        <Button block onClick={() => navigate('/entrainement')}>
          Retour aux séances
        </Button>
        <Button variant="ghost" block onClick={() => setDeleting(true)}>
          Supprimer cette séance
        </Button>
      </div>

      <ConfirmDialog
        open={deleting}
        title="Supprimer cette séance ?"
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setDeleting(false)}
        onConfirm={() => void remove()}
      >
        <p>Elle disparaîtra de l’historique, des records et du calcul de progression. Action définitive.</p>
      </ConfirmDialog>
    </Screen>
  );
}
