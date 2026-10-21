import { Link } from 'react-router';
import { useCalendarData } from '../../data/hooks';
import { basketballSummary } from '../../domain/calendar/validation';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';

const format = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

export function BasketScreen() {
  const data = useCalendarData();
  if (!data) return null;
  const summary = basketballSummary(data.logs);
  const logs = [...data.logs].sort((a, b) => b.date.localeCompare(a.date));
  const stats = [
    { label: 'Intensité moyenne', value: summary.intensity, unit: '/10' },
    { label: 'Minutes', value: summary.minutes, unit: '' },
    { label: 'Points', value: summary.points, unit: '' },
    { label: 'Rebonds', value: summary.rebounds, unit: '' },
    { label: 'Passes déc.', value: summary.assists, unit: '' },
  ];

  return (
    <Screen title="Suivi basket" subtitle="Matchs et intensité">
      <Card>
        <p className="text-sm text-mist">
          {summary.matchesPlayed} match{summary.matchesPlayed > 1 ? 's' : ''} joué{summary.matchesPlayed > 1 ? 's' : ''} enregistré
          {summary.matchesPlayed > 1 ? 's' : ''}. Moyennes calculées uniquement sur les valeurs que tu as notées.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-ink-950/60 p-3">
              <dt className="text-xs text-mist">{stat.label}</dt>
              <dd className="font-display text-xl font-bold text-snow">
                {stat.value ? `${format(stat.value.value)}${stat.unit}` : '—'}
                {stat.value && <span className="ml-1 text-xs font-normal text-mist">({stat.value.count} match{stat.value.count > 1 ? 's' : ''})</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Historique</h2>
        {logs.length === 0 ? (
          <p className="mt-1 text-sm text-mist">
            Aucun suivi. Après un match ou un entraînement, ouvre le jour dans le calendrier et touche « Saisir le match ».
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-ink-700/60">
            {logs.map((log) => (
              <li key={log.id}>
                <Link to={`/calendrier/suivi/${encodeURIComponent(log.id)}?date=${log.date}`} className="block py-2 active:bg-ink-800">
                  <span className="block text-sm font-medium text-snow">
                    {log.kind === 'match' ? 'Match' : 'Entraînement'} · {formatShortDate(log.date)}
                  </span>
                  <span className="block text-xs text-mist">
                    {log.played
                      ? [
                          log.intensity !== null ? `intensité ${log.intensity}/10` : null,
                          log.minutesPlayed !== null ? `${log.minutesPlayed} min` : null,
                          log.points !== null ? `${log.points} pts` : null,
                          log.rebounds !== null ? `${log.rebounds} rbd` : null,
                          log.assists !== null ? `${log.assists} pd` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'joué'
                      : 'non joué'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Screen>
  );
}
