import { Camera, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { todayIso } from '../../app/clock';
import { useBodyWeights, useMeasurements, useProgressPhotos, useWorkouts } from '../../data/hooks';
import { monthlyStatus } from '../../domain/progress/photos';
import { inRange, measuredChange, measurementSeries, RANGES, weightSeries, type MetricKey, type Range } from '../../domain/progress/series';
import { MEASUREMENT_KEYS } from '../../domain/progress/types';
import { exerciseName } from '../../domain/training/exercises';
import { computeRecords } from '../../domain/training/records';
import { useImageUrl } from '../../media/image';
import { Card } from '../../ui/Card';
import { ChoiceGroup } from '../../ui/fields';
import { LineChart } from '../../ui/LineChart';
import { Screen } from '../../ui/Screen';
import { WeightLog } from '../profile/WeightLog';
import { formatLoad, formatShortDate } from '../training/format';
import { formatChartDate, formatDelta, formatValue, METRIC_LABELS, POSE_LABELS, PROGRESS_DISCLAIMER } from './labels';
import type { ProgressPhoto } from '../../domain/progress/types';

const RANGE_LABELS: Record<Range, string> = { '1m': '1 mois', '3m': '3 mois', '6m': '6 mois', all: 'Tout' };
const METRICS: MetricKey[] = ['weight', ...MEASUREMENT_KEYS];

function Thumb({ photo }: { photo: ProgressPhoto }) {
  const url = useImageUrl(photo.thumbnail);
  return (
    <Link to={`/progres/photos/${photo.id}`} className="block overflow-hidden rounded-xl bg-ink-800">
      {url && <img src={url} alt={`${POSE_LABELS[photo.pose]}, ${formatShortDate(photo.date)}`} className="aspect-[3/4] w-full object-cover" />}
    </Link>
  );
}

export function ProgressScreen() {
  const weights = useBodyWeights();
  const measurements = useMeasurements();
  const photos = useProgressPhotos();
  const workouts = useWorkouts();
  const [metric, setMetric] = useState<MetricKey>('weight');
  const [range, setRange] = useState<Range>('3m');
  if (!weights || !measurements || !photos || !workouts) return null;

  const today = todayIso();
  const { label, unit } = METRIC_LABELS[metric];
  const all = metric === 'weight' ? weightSeries(weights) : measurementSeries(measurements, metric);
  const points = inRange(all, range, today);
  const change = measuredChange(points);
  const latest = measurements[measurements.length - 1];
  const month = monthlyStatus(photos, today);
  const recentPhotos = [...photos].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const records = [...computeRecords(workouts).values()]
    .map((record) => ({ record, date: [record.heaviest?.date, record.mostReps?.date, record.bestVolume?.date].filter(Boolean).sort().pop() ?? '' }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <Screen title="Progrès" subtitle="Transformation">
      <Card>
        <h2 className="font-semibold text-snow">Évolution mesurée</h2>
        <div className="mt-3 space-y-3">
          <ChoiceGroup<MetricKey>
            name="progress-metric"
            label="Mesure"
            columns={3}
            value={metric}
            onChange={setMetric}
            options={METRICS.map((value) => ({ value, label: METRIC_LABELS[value].short }))}
          />
          <ChoiceGroup<Range>
            name="progress-range"
            label="Période"
            columns={2}
            value={range}
            onChange={setRange}
            options={RANGES.map((value) => ({ value, label: RANGE_LABELS[value] }))}
          />
        </div>
        <div className="mt-4">
          <LineChart label={label} points={points} formatValue={(value) => formatValue(value, unit)} formatDate={formatChartDate} />
        </div>
        <p className="mt-2 text-sm text-mist">
          {change
            ? `${label} : ${formatDelta(change.delta, unit)} entre le ${formatShortDate(change.from.date).toLocaleLowerCase('fr')} et le ${formatShortDate(change.to.date).toLocaleLowerCase('fr')} (${change.days} jours).`
            : 'Il faut au moins deux mesures sur la période pour voir une évolution.'}
        </p>
      </Card>

      <WeightLog />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-snow">Mensurations</h2>
          <Link to="/progres/mensurations" className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
            {latest ? 'Ajouter / historique' : 'Ajouter'}
          </Link>
        </div>
        {latest ? (
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {MEASUREMENT_KEYS.map((key) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-mist">{METRIC_LABELS[key].short}</dt>
                <dd className="text-snow">{latest[key] === null ? '—' : formatValue(latest[key], 'cm')}</dd>
              </div>
            ))}
            <p className="col-span-2 mt-1 text-xs text-mist">Le {formatShortDate(latest.date).toLocaleLowerCase('fr')}</p>
          </dl>
        ) : (
          <p className="mt-1 text-sm text-mist">Bras, poitrine, épaules, taille : un mètre ruban et 2 minutes, une fois par mois.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-snow">Photos de progression</h2>
          <Link to="/progres/photos" className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
            Chronologie
          </Link>
        </div>
        <p className="mt-1 text-sm text-mist">
          {month.done ? 'Photo du mois faite ✓' : 'Ta photo du mois n’est pas encore faite.'} Elles restent uniquement sur ton iPhone.
        </p>
        {recentPhotos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {recentPhotos.map((photo) => (
              <Thumb key={photo.id} photo={photo} />
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/progres/photos/nouvelle"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-volt-600 px-3 font-semibold text-white active:bg-volt-500"
          >
            <Camera aria-hidden size={18} />
            Ajouter
          </Link>
          <Link
            to="/progres/comparer"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 px-3 font-semibold text-snow active:bg-ink-700"
          >
            Comparer
          </Link>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-snow">Records de musculation</h2>
          <Link to="/entrainement/records" className="flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-volt-400">
            Tous <ChevronRight aria-hidden size={16} />
          </Link>
        </div>
        {records.length === 0 ? (
          <p className="mt-1 text-sm text-mist">Termine une séance pour voir tes premiers records.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {records.map(({ record, date }) => (
              <li key={record.exerciseId} className="flex justify-between gap-3">
                <span className="text-snow">{exerciseName(record.exerciseId)}</span>
                <span className="text-right text-mist">
                  {record.heaviest ? `${formatLoad(record.exerciseId, record.heaviest.loadKg)} × ${record.heaviest.reps}` : `${record.mostReps?.reps ?? 0} rép.`}
                  <span className="block text-xs">{formatShortDate(date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-mist">{PROGRESS_DISCLAIMER}</p>
    </Screen>
  );
}
