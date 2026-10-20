import { useState } from 'react';
import type { EligibilityOptions } from '../../domain/training/exercises';
import { alternativesFor, exerciseName, getExercise } from '../../domain/training/exercises';
import type { LoggedSet, WorkoutExercise } from '../../domain/training/types';
import { Alert } from '../../ui/Alert';
import { Card } from '../../ui/Card';
import { formatLoad, formatReps, formatRest, parseNumber } from './format';
import { SetRow } from './SetRow';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  eligibility: EligibilityOptions;
  onChange: (exercise: WorkoutExercise) => void;
  onReplace: (newExerciseId: string) => void;
  onSetDone: (restSeconds: number) => void;
}

type Panel = 'none' | 'technique' | 'replace' | 'target';

const actionClass = 'min-h-11 rounded-lg px-3 text-sm font-medium transition-colors';

export function ExerciseCard({ exercise, eligibility, onChange, onReplace, onSetDone }: ExerciseCardProps) {
  const [panel, setPanel] = useState<Panel>('none');
  const [targetLoad, setTargetLoad] = useState(exercise.target.loadKg === null ? '' : String(exercise.target.loadKg).replace('.', ','));
  const [targetError, setTargetError] = useState<string | null>(null);
  const info = getExercise(exercise.exerciseId);
  const name = exerciseName(exercise.exerciseId);
  const loadType = info?.loadType ?? 'external';
  const anyDone = exercise.sets.some((set) => set.done);
  const toggle = (next: Panel) => setPanel((current) => (current === next ? 'none' : next));

  const updateSet = (index: number, set: LoggedSet) => {
    const sets = exercise.sets.map((item, i) => (i === index ? set : item));
    // Préremplit la série suivante avec la charge utilisée.
    const following = sets[index + 1];
    if (set.done && following && !following.done && following.loadKg === null && set.loadKg !== null) {
      sets[index + 1] = { ...following, loadKg: set.loadKg };
    }
    onChange({ ...exercise, sets });
    if (set.done) onSetDone(exercise.slot.restSeconds);
  };

  const addSet = () => {
    const last = exercise.sets.at(-1);
    onChange({ ...exercise, sets: [...exercise.sets, { reps: null, loadKg: last?.loadKg ?? exercise.target.loadKg, rir: null, done: false }] });
  };

  const removeLastSet = () => {
    const last = exercise.sets.at(-1);
    if (!last || last.done || exercise.sets.length <= 1) return;
    onChange({ ...exercise, sets: exercise.sets.slice(0, -1) });
  };

  const saveTarget = () => {
    const value = targetLoad.trim() === '' ? null : parseNumber(targetLoad);
    if (targetLoad.trim() !== '' && (value === null || value <= 0)) {
      setTargetError('Charge invalide.');
      return;
    }
    setTargetError(null);
    onChange({
      ...exercise,
      target: { ...exercise.target, loadKg: value },
      targetNote: 'Objectif modifié par toi pour cette séance.',
      sets: exercise.sets.map((set) => (set.done ? set : { ...set, loadKg: value })),
    });
    setPanel('none');
  };

  if (exercise.skipped) {
    return (
      <Card className="opacity-70">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-mist">
            <span className="font-semibold text-snow">{name}</span> — exercice passé
          </p>
          <button type="button" className={`${actionClass} text-volt-400`} onClick={() => onChange({ ...exercise, skipped: false })}>
            Reprendre
          </button>
        </div>
      </Card>
    );
  }

  const alternatives = alternativesFor(exercise.exerciseId, eligibility);

  return (
    <Card>
      <h2 className="font-semibold text-snow">{name}</h2>
      <p className="mt-0.5 text-sm text-volt-400">
        {exercise.target.sets} × {formatReps(exercise.target.repMin, exercise.target.repMax)} rép. ·{' '}
        {formatLoad(exercise.exerciseId, exercise.target.loadKg)} · repos {formatRest(exercise.slot.restSeconds)}
      </p>
      <p className="mt-1 text-xs text-mist">{exercise.targetNote}</p>
      <p className="mt-1 text-xs text-mist">Garde au moins {exercise.slot.targetRir} répétitions en réserve (RIR).</p>

      {exercise.pain.reported && (
        <div className="mt-3">
          <Alert tone="warning" title="Douleur signalée">
            Arrête cet exercice ou passe-le. La charge n’augmentera pas la prochaine fois. Si la douleur persiste, demande l’avis
            d’un professionnel de santé.
          </Alert>
        </div>
      )}

      <ol className="mt-3 space-y-2" aria-label={`Séries — ${name}`}>
        {exercise.sets.map((set, index) => (
          <SetRow
            key={`${index}-${set.done}-${set.loadKg}`}
            index={index}
            set={set}
            loadType={loadType}
            exerciseName={name}
            onSave={(saved) => updateSet(index, saved)}
            onReopen={() => updateSet(index, { ...set, done: false })}
          />
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={`${actionClass} text-volt-400`} onClick={addSet}>
          + Série
        </button>
        {exercise.sets.length > 1 && !exercise.sets.at(-1)?.done && (
          <button type="button" className={`${actionClass} text-mist`} onClick={removeLastSet}>
            − Série
          </button>
        )}
        <button type="button" className={`${actionClass} text-mist`} aria-expanded={panel === 'technique'} onClick={() => toggle('technique')}>
          Technique
        </button>
        <button type="button" className={`${actionClass} text-mist`} aria-expanded={panel === 'target'} onClick={() => toggle('target')}>
          Objectif
        </button>
        {!anyDone && alternatives.length > 0 && (
          <button type="button" className={`${actionClass} text-mist`} aria-expanded={panel === 'replace'} onClick={() => toggle('replace')}>
            Remplacer
          </button>
        )}
        <button
          type="button"
          className={`${actionClass} ${exercise.pain.reported ? 'text-amber-200' : 'text-mist'}`}
          aria-pressed={exercise.pain.reported}
          onClick={() => onChange({ ...exercise, pain: { ...exercise.pain, reported: !exercise.pain.reported } })}
        >
          Douleur
        </button>
        <button type="button" className={`${actionClass} text-mist`} onClick={() => onChange({ ...exercise, skipped: true })}>
          Passer
        </button>
      </div>

      {panel === 'technique' && info && (
        <div className="mt-3 space-y-2 rounded-xl bg-ink-950/70 p-3 text-sm">
          <p className="font-medium text-snow">Technique</p>
          <ul className="list-disc space-y-1 pl-5 text-mist">
            {info.technique.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="font-medium text-snow">Sécurité</p>
          <ul className="list-disc space-y-1 pl-5 text-mist">
            {info.safety.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {panel === 'target' && (
        <div className="mt-3 space-y-2 rounded-xl bg-ink-950/70 p-3">
          <label className="block text-sm text-snow">
            Charge visée pour cette séance (kg{info?.loadPerHand ? ' par haltère' : ''})
            <input
              inputMode="decimal"
              value={targetLoad}
              placeholder="à déterminer"
              onChange={(event) => setTargetLoad(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 text-snow focus:border-volt-500 focus:outline-none"
            />
          </label>
          {targetError && <p className="text-xs text-red-300">{targetError}</p>}
          <button type="button" className={`${actionClass} bg-volt-600 text-white`} onClick={saveTarget}>
            Appliquer
          </button>
        </div>
      )}

      {panel === 'replace' && (
        <ul className="mt-3 space-y-1 rounded-xl bg-ink-950/70 p-2" aria-label={`Remplacer ${name}`}>
          {alternatives.map((alternative) => (
            <li key={alternative.id}>
              <button
                type="button"
                className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-snow active:bg-ink-800"
                onClick={() => {
                  setPanel('none');
                  onReplace(alternative.id);
                }}
              >
                {alternative.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {exercise.pain.reported && (
        <label className="mt-3 block text-sm text-snow">
          Où as-tu mal ? (facultatif)
          <input
            value={exercise.pain.note}
            onChange={(event) => onChange({ ...exercise, pain: { ...exercise.pain, note: event.target.value } })}
            className="mt-1 min-h-11 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 text-snow focus:border-volt-500 focus:outline-none"
          />
        </label>
      )}
    </Card>
  );
}
