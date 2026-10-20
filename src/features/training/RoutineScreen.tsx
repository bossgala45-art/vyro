import { useState } from 'react';
import { useNavigate } from 'react-router';
import { nowIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useRoutine } from '../../data/hooks';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import type { Weekday, WeeklyRoutine } from '../../domain/training/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { WeekdayPicker } from './WeekdayPicker';

export function RoutineScreen() {
  const routine = useRoutine();
  if (routine === undefined) return null;
  return <RoutineForm initial={routine} />;
}

function RoutineForm({ initial }: { initial: WeeklyRoutine | null }) {
  const navigate = useNavigate();
  const [gymDays, setGymDays] = useState<Weekday[]>(initial?.gymDays ?? []);
  const [practiceDays, setPracticeDays] = useState<Weekday[]>(initial?.practiceDays ?? []);
  const [matchDays, setMatchDays] = useState<Weekday[]>(initial?.matchDays ?? []);
  const [includeOptionalThird, setIncludeOptionalThird] = useState(initial?.includeOptionalThird ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await trainingRepository.saveRoutine({ id: 'me', gymDays, practiceDays, matchDays, includeOptionalThird, updatedAt: nowIso() });
      navigate('/entrainement');
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Semaine type non enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Ma semaine type" subtitle="Planning">
      <Card>
        <div className="space-y-6">
          <WeekdayPicker
            label="Jours possibles pour la salle"
            hint="VYRO choisira parmi ces jours. Sans jour coché, aucune séance n’est planifiée."
            values={gymDays}
            onChange={setGymDays}
          />
          <WeekdayPicker label="Entraînements de basket habituels" values={practiceDays} onChange={setPracticeDays} />
          <WeekdayPicker
            label="Jour(s) de match habituel(s)"
            hint="Aucune séance n’est placée un jour de match, ni de séance de jambes la veille."
            values={matchDays}
            onChange={setMatchDays}
          />
          <Toggle
            label="Proposer une 3e séance facultative"
            description="Séance haut du corps, à faire seulement si tu te sens bien récupéré."
            checked={includeOptionalThird}
            onChange={setIncludeOptionalThird}
          />
        </div>
      </Card>
      {gymDays.length === 0 && <Alert tone="warning">Aucun jour de salle coché : aucune séance ne sera planifiée.</Alert>}
      <Alert tone="info">Ton planning étant variable, le calendrier détaillé (exceptions, vacances, matchs ponctuels) arrive à l’étape 4.</Alert>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-2">
        <Button className="flex-1" busy={saving} onClick={() => void save()}>
          Enregistrer
        </Button>
        <Button variant="secondary" onClick={() => navigate('/entrainement')}>
          Annuler
        </Button>
      </div>
    </Screen>
  );
}
