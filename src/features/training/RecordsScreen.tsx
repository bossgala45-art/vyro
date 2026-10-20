import { useWorkouts } from '../../data/hooks';
import { exerciseName } from '../../domain/training/exercises';
import { computeRecords } from '../../domain/training/records';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { formatKg, formatLoad, formatShortDate } from './format';

export function RecordsScreen() {
  const workouts = useWorkouts();
  if (workouts === undefined) return null;
  const records = [...computeRecords(workouts).values()].sort((a, b) =>
    exerciseName(a.exerciseId).localeCompare(exerciseName(b.exerciseId), 'fr'),
  );

  return (
    <Screen title="Records" subtitle="Musculation">
      <p className="text-sm text-mist">
        Calculés uniquement à partir de tes séries enregistrées. Aucune charge maximale n’est estimée ni testée.
      </p>
      {records.length === 0 ? (
        <Card>
          <p className="text-sm text-mist">Termine une séance pour voir apparaître tes premières références.</p>
        </Card>
      ) : (
        records.map((record) => (
          <Card key={record.exerciseId}>
            <h2 className="font-semibold text-snow">{exerciseName(record.exerciseId)}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              {record.heaviest && (
                <div className="flex justify-between gap-3">
                  <dt className="text-mist">Charge la plus lourde</dt>
                  <dd className="text-right text-snow">
                    {formatLoad(record.exerciseId, record.heaviest.loadKg)} × {record.heaviest.reps}
                    <span className="block text-xs text-mist">{formatShortDate(record.heaviest.date)}</span>
                  </dd>
                </div>
              )}
              {record.mostReps && (
                <div className="flex justify-between gap-3">
                  <dt className="text-mist">Plus de répétitions</dt>
                  <dd className="text-right text-snow">
                    {record.mostReps.reps} rép.
                    <span className="block text-xs text-mist">{formatShortDate(record.mostReps.date)}</span>
                  </dd>
                </div>
              )}
              {record.bestVolume && (
                <div className="flex justify-between gap-3">
                  <dt className="text-mist">Meilleur tonnage</dt>
                  <dd className="text-right text-snow">
                    {formatKg(Math.round(record.bestVolume.volumeKg))}
                    <span className="block text-xs text-mist">{formatShortDate(record.bestVolume.date)}</span>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        ))
      )}
    </Screen>
  );
}
