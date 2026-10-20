import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { StorageError } from '../../data/errors';
import { useActiveProgram, useProfile } from '../../data/hooks';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { alternativesFor, exerciseName, getExercise } from '../../domain/training/exercises';
import { validateSlot } from '../../domain/training/integrity';
import type { ExerciseSlot, Program } from '../../domain/training/types';
import type { Profile } from '../../domain/profile/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextField } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { parseNumber } from './format';

export function SlotEditScreen() {
  const { key, index } = useParams();
  const program = useActiveProgram();
  const profile = useProfile();
  if (program === undefined || profile === undefined) return null;
  const template = program?.templates.find((item) => item.key === key);
  const slotIndex = Number(index);
  const slot = template?.slots[slotIndex];
  if (!program || !template || !slot || !profile) return <Navigate to="/entrainement/programme" replace />;
  return <SlotForm program={program} templateKey={template.key} slotIndex={slotIndex} slot={slot} profile={profile} />;
}

interface SlotFormProps {
  program: Program;
  templateKey: string;
  slotIndex: number;
  slot: ExerciseSlot;
  profile: Profile;
}

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);

function SlotForm({ program, templateKey, slotIndex, slot, profile }: SlotFormProps) {
  const navigate = useNavigate();
  const [exerciseId, setExerciseId] = useState(slot.exerciseId);
  const [sets, setSets] = useState(String(slot.sets));
  const [repMin, setRepMin] = useState(String(slot.repMin));
  const [repMax, setRepMax] = useState(String(slot.repMax));
  const [rest, setRest] = useState(String(slot.restSeconds));
  const [rir, setRir] = useState(String(slot.targetRir));
  const [startLoad, setStartLoad] = useState(slot.startLoadKg === null ? '' : String(slot.startLoadKg).replace('.', ','));
  const [errors, setErrors] = useState<Partial<Record<keyof ExerciseSlot, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const exercise = getExercise(exerciseId);
  const options = [
    { id: slot.exerciseId, name: exerciseName(slot.exerciseId) },
    ...alternativesFor(slot.exerciseId, {
      equipment: profile.training.equipment,
      avoidedExercises: profile.training.avoidedExercises,
      noUnassistedFreeBench: profile.training.noUnassistedFreeBench,
      allowIntermediate: true,
    }).map((item) => ({ id: item.id, name: item.name })),
  ];

  const persist = async (next: Program) => {
    setSaving(true);
    setFailure(null);
    try {
      await trainingRepository.updateProgram(next);
      navigate('/entrainement/programme', { replace: true });
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Modification non enregistrée.');
      setSaving(false);
    }
  };

  const save = () => {
    const parsedLoad = startLoad.trim() === '' ? null : parseNumber(startLoad);
    const updated: ExerciseSlot = {
      ...slot,
      exerciseId,
      sets: toInt(sets),
      repMin: toInt(repMin),
      repMax: toInt(repMax),
      restSeconds: toInt(rest),
      targetRir: toInt(rir),
      startLoadKg: exercise?.loadType === 'bodyweight' ? null : startLoad.trim() !== '' && parsedLoad === null ? NaN : parsedLoad,
    };
    const found = validateSlot(updated);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void persist({
      ...program,
      templates: program.templates.map((template) =>
        template.key === templateKey ? { ...template, slots: template.slots.map((item, i) => (i === slotIndex ? updated : item)) } : template,
      ),
    });
  };

  const template = program.templates.find((item) => item.key === templateKey);
  const remove = () =>
    void persist({
      ...program,
      templates: program.templates.map((item) => (item.key === templateKey ? { ...item, slots: item.slots.filter((_, i) => i !== slotIndex) } : item)),
    });

  return (
    <Screen title={exerciseName(slot.exerciseId)} subtitle={`Séance ${templateKey}`}>
      <Card>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-snow">Exercice</span>
            <select
              value={exerciseId}
              onChange={(event) => setExerciseId(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-3 text-snow focus:border-volt-500 focus:outline-none"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <TextField name="sets" label="Séries" inputMode="numeric" value={sets} onChange={setSets} error={errors.sets} />
            <TextField name="repMin" label="Rép. min" inputMode="numeric" value={repMin} onChange={setRepMin} error={errors.repMin} />
            <TextField name="repMax" label="Rép. max" inputMode="numeric" value={repMax} onChange={setRepMax} error={errors.repMax} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField name="rest" label="Repos" inputMode="numeric" suffix="s" value={rest} onChange={setRest} error={errors.restSeconds} />
            <TextField
              name="rir"
              label="Rép. en réserve"
              hint="Recommandé : 2 ou plus."
              inputMode="numeric"
              value={rir}
              onChange={setRir}
              error={errors.targetRir}
            />
          </div>
          {exercise?.loadType !== 'bodyweight' && (
            <TextField
              name="startLoad"
              label={`Charge de départ${exercise?.loadPerHand ? ' (par haltère)' : ''}`}
              hint="Facultatif. Laisse vide pour la déterminer pendant la première séance. Utilisée uniquement tant qu’aucune séance n’est enregistrée pour cet exercice."
              inputMode="decimal"
              suffix="kg"
              value={startLoad}
              onChange={setStartLoad}
              error={errors.startLoadKg}
            />
          )}
        </div>
      </Card>

      {exercise && (
        <Card>
          <details>
            <summary className="min-h-8 cursor-pointer font-semibold text-snow">Technique et sécurité</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
              {[...exercise.technique, ...exercise.safety].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </Card>
      )}

      {failure && <Alert tone="error">{failure}</Alert>}
      <div className="flex gap-2">
        <Button className="flex-1" busy={saving} onClick={save}>
          Enregistrer
        </Button>
        <Button variant="secondary" onClick={() => navigate('/entrainement/programme')}>
          Annuler
        </Button>
      </div>
      {template && template.slots.length > 1 && (
        <Button variant="ghost" block onClick={() => setRemoving(true)}>
          Retirer cet exercice de la séance
        </Button>
      )}
      <ConfirmDialog
        open={removing}
        title="Retirer cet exercice ?"
        confirmLabel="Retirer"
        tone="danger"
        onCancel={() => setRemoving(false)}
        onConfirm={remove}
      >
        <p>Il ne sera plus proposé dans la séance {templateKey}. Son historique est conservé.</p>
      </ConfirmDialog>
    </Screen>
  );
}
