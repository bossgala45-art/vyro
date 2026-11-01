import { useState } from 'react';
import { Link } from 'react-router';
import { useBodyWeights, useMeasurements, useProgressPhotoFile, useProgressPhotos } from '../../data/hooks';
import { defaultComparison, elapsedDays } from '../../domain/progress/photos';
import { measurementSeries, nearestPoint, weightSeries, type MetricKey, type Point } from '../../domain/progress/series';
import { MEASUREMENT_KEYS, PHOTO_POSES, type PhotoPose, type ProgressPhoto } from '../../domain/progress/types';
import { visualAnalysisAvailability } from '../../domain/progress/visualAnalysis';
import { useImageUrl } from '../../media/image';
import { Alert } from '../../ui/Alert';
import { Card } from '../../ui/Card';
import { ChoiceGroup } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';
import { formatDelta, formatValue, METRIC_LABELS, POSE_LABELS } from './labels';

function Side({ photo, label }: { photo: ProgressPhoto; label: string }) {
  const file = useProgressPhotoFile(photo.id);
  const url = useImageUrl(file ?? photo.thumbnail);
  return (
    <figure className="min-w-0 flex-1">
      <div className="overflow-hidden rounded-xl bg-ink-800">
        {url && <img src={url} alt={`${label} : ${formatShortDate(photo.date).toLocaleLowerCase('fr')}`} className="aspect-[3/4] w-full object-cover" />}
      </div>
      <figcaption className="mt-1 text-center text-xs text-mist">
        <span className="font-semibold text-snow">{label}</span> · {formatShortDate(photo.date)}
      </figcaption>
    </figure>
  );
}

function PhotoSelect({ id, label, photos, value, onChange }: { id: string; label: string; photos: ProgressPhoto[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-snow">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-2 text-sm text-snow"
      >
        {photos.map((photo) => (
          <option key={photo.id} value={photo.id}>
            {formatShortDate(photo.date)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CompareScreen() {
  const photos = useProgressPhotos();
  const weights = useBodyWeights();
  const measurements = useMeasurements();
  const [pose, setPose] = useState<PhotoPose>('front');
  const [choice, setChoice] = useState<{ pose: PhotoPose; before: string; after: string } | null>(null);
  if (!photos || !weights || !measurements) return null;

  const ofPose = photos.filter((photo) => photo.pose === pose).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const fallback = defaultComparison(photos, pose);
  const pick = (id: string | undefined) => ofPose.find((photo) => photo.id === id);
  const before = (choice?.pose === pose ? pick(choice.before) : undefined) ?? fallback?.before;
  const after = (choice?.pose === pose ? pick(choice.after) : undefined) ?? fallback?.after;
  const analysis = visualAnalysisAvailability();

  const series: [MetricKey, Point[]][] = [['weight', weightSeries(weights)], ...MEASUREMENT_KEYS.map((key): [MetricKey, Point[]] => [key, measurementSeries(measurements, key)])];

  return (
    <Screen title="Avant / après" subtitle="Progrès">
      <ChoiceGroup<PhotoPose>
        name="compare-pose"
        label="Pose"
        columns={3}
        value={pose}
        onChange={setPose}
        options={PHOTO_POSES.map((value) => ({ value, label: POSE_LABELS[value] }))}
      />

      {!before || !after ? (
        <Card>
          <p className="text-sm text-mist">
            Il faut au moins deux photos « {POSE_LABELS[pose].toLocaleLowerCase('fr')} » pour comparer.{' '}
            <Link to="/progres/photos/nouvelle" className="font-medium text-volt-400">
              Ajouter une photo
            </Link>
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-3">
            <PhotoSelect
              id="compare-before"
              label="Avant"
              photos={ofPose}
              value={before.id}
              onChange={(id) => setChoice({ pose, before: id, after: after.id })}
            />
            <PhotoSelect
              id="compare-after"
              label="Après"
              photos={ofPose}
              value={after.id}
              onChange={(id) => setChoice({ pose, before: before.id, after: id })}
            />
          </div>
          <div className="flex gap-3">
            <Side photo={before} label="Avant" />
            <Side photo={after} label="Après" />
          </div>
          <p className="text-center text-sm text-mist">
            {elapsedDays(before, after) === 0
              ? 'Même jour'
              : `${Math.abs(elapsedDays(before, after))} jours d’écart${elapsedDays(before, after) < 0 ? ' (« avant » est plus récente)' : ''}`}
          </p>

          <Card>
            <h2 className="font-semibold text-snow">Mesures à ces dates</h2>
            <p className="mt-1 text-xs text-mist">Mesures prises à 7 jours au plus de chaque photo. Sans mesure assez proche, rien n’est affiché.</p>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-mist">
                  <th className="py-1 font-medium">Mesure</th>
                  <th className="py-1 text-right font-medium">Avant</th>
                  <th className="py-1 text-right font-medium">Après</th>
                  <th className="py-1 text-right font-medium">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/60">
                {series.map(([key, points]) => {
                  const { short, unit } = METRIC_LABELS[key];
                  const a = nearestPoint(points, before.date);
                  const b = nearestPoint(points, after.date);
                  return (
                    <tr key={key}>
                      <th scope="row" className="py-1 text-left font-normal text-mist">
                        {short}
                      </th>
                      <td className="py-1 text-right text-snow">{a ? formatValue(a.value, unit) : '—'}</td>
                      <td className="py-1 text-right text-snow">{b ? formatValue(b.value, unit) : '—'}</td>
                      <td className="py-1 text-right text-snow">{a && b ? formatDelta(Math.round((b.value - a.value) * 10) / 10, unit) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Alert tone="info">{analysis.available ? `Analyse proposée par ${analysis.analyzer.label}.` : analysis.reason}</Alert>
    </Screen>
  );
}
