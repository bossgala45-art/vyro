import { ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useWorkouts } from '../../data/hooks';
import { summarizeWorkout } from '../../domain/training/workout';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { formatKg, formatShortDate } from './format';
import { WorkoutSummary } from './WorkoutScreen';

export function HistoryScreen() {
  const workouts = useWorkouts();
  if (workouts === undefined) return null;
  const finished = workouts.filter((workout) => workout.status !== 'in-progress');

  return (
    <Screen title="Historique" subtitle="Musculation">
      {finished.length === 0 ? (
        <Card>
          <p className="text-sm text-mist">Aucune séance enregistrée pour l’instant.</p>
        </Card>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/80" aria-label="Séances passées">
          {finished.map((workout) => {
            const summary = summarizeWorkout(workout);
            return (
              <li key={workout.id} className="border-b border-ink-700/60 last:border-b-0">
                <Link to={`/entrainement/historique/${workout.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-ink-800">
                  <span className="flex-1">
                    <span className="block font-medium text-snow">
                      Séance {workout.templateKey} · {formatShortDate(workout.date)}
                    </span>
                    <span className="block text-xs text-mist">
                      {workout.status === 'abandoned' ? 'Abandonnée · ' : ''}
                      {workout.light ? 'Allégée · ' : ''}
                      {summary.setsDone} séries{summary.volumeKg > 0 ? ` · ${formatKg(summary.volumeKg)}` : ''}
                      {summary.painExercises.length > 0 ? ' · douleur signalée' : ''}
                    </span>
                  </span>
                  <ChevronRight aria-hidden size={16} className="text-mist" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}

export function WorkoutDetailScreen() {
  const { id } = useParams();
  const workouts = useWorkouts();
  if (workouts === undefined) return null;
  const workout = workouts.find((item) => item.id === id);
  if (!workout) {
    return (
      <Screen title="Séance introuvable">
        <Link to="/entrainement/historique" className="text-volt-400">
          Retour à l’historique
        </Link>
      </Screen>
    );
  }
  return <WorkoutSummary workout={workout} others={workouts} />;
}
