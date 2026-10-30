import { Link } from 'react-router';
import { useCheckIns } from '../../data/hooks';
import { averageOf, historyDays, type HistoryDay } from '../../domain/recovery/history';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';
import { ReadinessPanel } from './ReadinessPanel';
import { useReadinessData } from './readiness';

const DAYS = 14;

interface Metric {
  key: keyof Omit<HistoryDay, 'date' | 'pain'>;
  label: string;
  max: number;
  format: (value: number) => string;
}

const METRICS: readonly Metric[] = [
  { key: 'sleepHours', label: 'Sommeil', max: 10, format: (value) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h` },
  { key: 'energy', label: 'Énergie', max: 10, format: (value) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/10` },
  { key: 'motivation', label: 'Motivation', max: 10, format: (value) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/10` },
  {
    key: 'soreness',
    label: 'Courbatures',
    max: 3,
    format: (value) => ['aucune', 'légères', 'modérées', 'fortes'][Math.round(value)] ?? '',
  },
];

/** Barres simples sur 14 jours ; un jour sans réponse reste vide (rien n'est interpolé). */
function Bars({ days, metric }: { days: HistoryDay[]; metric: Metric }) {
  return (
    <div className="flex h-16 items-end gap-1" aria-hidden>
      {days.map((day) => {
        const value = day[metric.key];
        return (
          <div key={day.date} className="flex h-full flex-1 items-end rounded-sm bg-ink-800/60">
            {value !== null && (
              <div
                className="w-full rounded-sm bg-volt-500"
                style={{ height: `${Math.max(6, (Math.min(value, metric.max) / metric.max) * 100)}%` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RecoveryScreen() {
  const day = useReadinessData();
  const checkIns = useCheckIns();
  if (!day || !checkIns) return null;
  const { readiness } = day;
  const days = historyDays(checkIns, readiness.today, DAYS);
  const lastWeek = days.slice(-7);

  return (
    <Screen title="Récupération" subtitle="Ta forme">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-snow">Aujourd’hui</h2>
          <Link to="/recuperation/aujourdhui" className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
            Détails
          </Link>
        </div>
        <div className="mt-2">
          {readiness.checkIn ? (
            <ReadinessPanel decision={readiness.decision} compact />
          ) : (
            <p className="text-sm text-mist">Pas encore de check-in aujourd’hui.</p>
          )}
        </div>
        <Link
          to="/recuperation/check-in"
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-volt-600 px-4 font-semibold text-white active:bg-volt-500"
        >
          {readiness.checkIn ? 'Modifier mon check-in' : 'Faire mon check-in (30 s)'}
        </Link>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Historique sur {DAYS} jours</h2>
        <p className="mt-1 text-xs text-mist">
          Du {formatShortDate(days[0]?.date ?? readiness.today).toLocaleLowerCase('fr')} à aujourd’hui. Un jour sans check-in reste vide.
        </p>
        <div className="mt-4 space-y-5">
          {METRICS.map((metric) => {
            const average = averageOf(lastWeek.map((item) => item[metric.key]));
            return (
              <section key={metric.key} aria-label={metric.label}>
                <div className="mb-1 flex items-baseline justify-between">
                  <h3 className="text-sm font-medium text-snow">{metric.label}</h3>
                  <p className="text-xs text-mist">
                    {average
                      ? `Moyenne 7 j : ${metric.format(average.value)} (${average.count} jour${average.count > 1 ? 's' : ''})`
                      : 'Pas de donnée sur 7 jours'}
                  </p>
                </div>
                <Bars days={days} metric={metric} />
              </section>
            );
          })}
          <p className="text-xs text-mist">
            Douleurs signalées sur {DAYS} jours : {days.filter((item) => item.pain === true).length}
          </p>
        </div>
      </Card>

      <Link to="/recuperation/reperes" className="block rounded-2xl border border-ink-700/80 bg-ink-900/80 p-4 text-sm active:bg-ink-800">
        <span className="font-medium text-snow">Régler les repères</span>
        <span className="block text-mist">Nuit courte, énergie basse, douleur… Des repères prudents, modifiables, et non médicaux.</span>
      </Link>
    </Screen>
  );
}
