import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { nowIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { exercisesAffectedBy, ZONE_LABELS } from '../../domain/recovery/zones';
import type { TemplateKey } from '../../domain/training/types';
import { createWorkout } from '../../domain/training/workout';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { newId } from '../training/format';
import { ReadinessPanel } from './ReadinessPanel';
import { useReadinessData } from './readiness';

const isTemplateKey = (value: string | null): value is TemplateKey => value === 'A' || value === 'B' || value === 'C';

export function TodayReadinessScreen() {
  const [params] = useSearchParams();
  const seance = params.get('seance');
  const day = useReadinessData(isTemplateKey(seance) ? seance : undefined);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!day) return null;
  const { readiness, program, workouts } = day;
  const { decision, template, checkIn } = readiness;
  const running = workouts.find((workout) => workout.status === 'in-progress');

  const start = async (light: boolean) => {
    if (!program || !template) return;
    setBusy(true);
    setError(null);
    try {
      const workout = createWorkout({
        id: newId(),
        program,
        templateKey: template.key,
        date: readiness.today,
        now: nowIso(),
        light,
        history: workouts,
        excludedExerciseIds: exercisesAffectedBy(decision.excludedZones),
      });
      const started = await trainingRepository.startWorkout(workout);
      navigate(`/entrainement/seance/${started.id}`);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Séance non démarrée.');
      setBusy(false);
    }
  };

  const zones = decision.excludedZones.map((zone) => ZONE_LABELS[zone].toLocaleLowerCase('fr')).join(', ');
  const sessionLabel = template ? `séance ${template.key}` : 'séance';

  return (
    <Screen title="Ton conseil du jour" subtitle="Récupération">
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        <ReadinessPanel decision={decision} />
      </Card>

      {template && (
        <p className="text-sm text-mist">
          Séance envisagée : <span className="text-snow">{template.name}</span>
          {readiness.plannedToday ? ' (prévue aujourd’hui).' : ' (prochaine de ton programme, non prévue aujourd’hui au calendrier).'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {running ? (
          <Button onClick={() => navigate(`/entrainement/seance/${running.id}`)}>Reprendre la séance en cours</Button>
        ) : !program || !template ? (
          <Link to="/entrainement" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-volt-600 px-4 font-semibold text-white">
            Générer mon programme
          </Link>
        ) : decision.level === 'need-info' ? (
          <Button onClick={() => navigate(`/recuperation/check-in${template ? `?seance=${template.key}` : ''}`)}>Compléter le check-in</Button>
        ) : decision.level === 'normal' ? (
          <>
            <Button busy={busy} onClick={() => void start(false)}>
              Commencer la {sessionLabel}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void start(true)}>
              Version allégée
            </Button>
          </>
        ) : decision.level === 'adapted' ? (
          <>
            <Button busy={busy} onClick={() => void start(true)}>
              Commencer la {sessionLabel} allégée
            </Button>
            {decision.excludedZones.length === 0 && (
              <Button variant="secondary" disabled={busy} onClick={() => void start(false)}>
                Séance normale quand même
              </Button>
            )}
          </>
        ) : decision.level === 'light' ? (
          <>
            <Button onClick={() => navigate('/')}>C’est noté : activité légère aujourd’hui</Button>
            <Button variant="secondary" busy={busy} onClick={() => void start(true)}>
              Faire quand même la version allégée
            </Button>
          </>
        ) : (
          <Button onClick={() => navigate('/')}>Je me repose aujourd’hui</Button>
        )}
        {decision.excludedZones.length > 0 && decision.level !== 'rest' && (
          <p className="text-xs text-mist">Exercices sollicitant : {zones} — retirés de la séance du jour.</p>
        )}
        <Button variant="ghost" onClick={() => navigate(`/recuperation/check-in${template ? `?seance=${template.key}` : ''}`)}>
          {checkIn ? 'Modifier mon check-in' : 'Faire mon check-in'}
        </Button>
      </div>
    </Screen>
  );
}
