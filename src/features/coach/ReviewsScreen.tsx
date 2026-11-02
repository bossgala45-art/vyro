import { useEffect } from 'react';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { fmt, frDate, signed } from '../../domain/coach/facts';
import { buildReview, completedPeriods, REVIEW_DAYS, type Review } from '../../domain/coach/review';
import { markReviewSeen } from '../../domain/coach/state';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { METRIC_LABELS } from '../progress/labels';
import { useCoachContext } from './useCoachContext';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-mist">{label}</dt>
      <dd className="text-right text-snow">{children}</dd>
    </div>
  );
}

function ReviewCard({ review, open }: { review: Review; open: boolean }) {
  const { workouts, basketball, checkIns, weight, measurements, records, hydration } = review;
  return (
    <details open={open} className="group rounded-2xl border border-ink-700/80 bg-ink-900/80 p-4">
      <summary className="min-h-11 cursor-pointer list-none">
        <span className="block font-semibold text-snow">
          Du {frDate(review.start)} au {frDate(review.end)}
        </span>
        <span className="block text-sm text-volt-400">{review.headline}</span>
      </summary>
      <dl className="mt-2 divide-y divide-ink-700/60 text-sm">
        <Row label="Musculation">
          {workouts.completed} séance{workouts.completed > 1 ? 's' : ''}
          {workouts.light > 0 ? ` (dont ${workouts.light} allégée${workouts.light > 1 ? 's' : ''})` : ''}
        </Row>
        <Row label="Basket (suivi noté)">
          {basketball.practices} entraînement{basketball.practices > 1 ? 's' : ''}, {basketball.matches} match{basketball.matches > 1 ? 's' : ''}
        </Row>
        <Row label="Check-ins">{checkIns.count}</Row>
        <Row label="Sommeil moyen">{checkIns.sleep ? `${fmt(checkIns.sleep.value, 'h')} (${checkIns.sleep.count} nuits)` : 'non renseigné'}</Row>
        <Row label="Énergie moyenne">{checkIns.energy ? `${fmt(checkIns.energy.value, '/10')} (${checkIns.energy.count} jours)` : 'non renseignée'}</Row>
        <Row label="Poids">{weight ? `${signed(weight.delta, 'kg')} (${fmt(weight.from, 'kg')} → ${fmt(weight.to, 'kg')})` : 'moins de 2 pesées'}</Row>
        {measurements.map((item) => (
          <Row key={item.key} label={METRIC_LABELS[item.key].label}>
            {signed(item.delta, 'cm')}
          </Row>
        ))}
        <Row label="Records battus">{records.length === 0 ? 'aucun' : records.map((record) => `${record.name} (${record.description})`).join(', ')}</Row>
        <Row label="Hydratation">
          {hydration.daysLogged === 0 ? 'non notée' : `${hydration.daysAtTarget} jour${hydration.daysAtTarget > 1 ? 's' : ''} au repère sur ${hydration.daysLogged} notés`}
        </Row>
      </dl>
    </details>
  );
}

export function ReviewsScreen() {
  const ctx = useCoachContext();
  const latestEnd = ctx ? completedPeriods(ctx.startDate, ctx.today)[0]?.end : undefined;

  // Consulter les bilans les marque comme vus (le message « bilan prêt » disparaît).
  useEffect(() => {
    if (!latestEnd) return;
    void settingsRepository.update((settings) => ({ ...settings, coach: markReviewSeen(settings.coach, latestEnd) })).catch(() => undefined);
  }, [latestEnd]);

  if (!ctx) return null;
  const periods = completedPeriods(ctx.startDate, ctx.today);

  return (
    <Screen title="Bilans" subtitle="Coach">
      <p className="text-sm text-mist">
        Un bilan tous les {REVIEW_DAYS} jours depuis la création de ton profil, calculé uniquement sur ce que tu as enregistré.
      </p>
      {periods.length === 0 ? (
        <Card>
          <p className="text-sm text-mist">Ton premier bilan arrivera après tes {REVIEW_DAYS} premiers jours avec VYRO.</p>
        </Card>
      ) : (
        periods.map((period, index) => <ReviewCard key={period.end} review={buildReview(ctx, period)} open={index === 0} />)
      )}
    </Screen>
  );
}
