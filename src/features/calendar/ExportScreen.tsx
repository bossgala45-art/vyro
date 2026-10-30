import { useState } from 'react';
import { todayIso } from '../../app/clock';
import { useActiveProgram, useCalendarData, useProfile, useWorkouts } from '../../data/hooks';
import { buildExportEvents } from '../../domain/calendar/export';
import { buildIcs, type IcsEvent } from '../../domain/calendar/ics';
import { expandOccurrences } from '../../domain/calendar/occurrences';
import { addDays } from '../../domain/calendar/time';
import { planForWeek } from '../../domain/calendar/weekly';
import { weekStart } from '../../domain/training/schedule';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ChoiceGroup, Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';

type Range = '1' | '4';
type Alarm = 'none' | '15' | '30' | '60';

/** Partage le fichier (feuille de partage iOS) ou, à défaut, le télécharge. */
async function deliver(ics: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([ics], 'vyro-planning.ics', { type: 'text/calendar' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Planning VYRO' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vyro-planning.ics';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export function ExportScreen() {
  const data = useCalendarData();
  const program = useActiveProgram();
  const profile = useProfile();
  const workouts = useWorkouts();
  const [range, setRange] = useState<Range>('1');
  const [includeBasketball, setIncludeBasketball] = useState(true);
  const [alarm, setAlarm] = useState<Alarm>('30');
  const [result, setResult] = useState<string | null>(null);

  if (!data || program === undefined || profile === undefined || !workouts) return null;

  const today = todayIso();
  const monday = weekStart(today);
  const weeks = Number(range);
  const sessions = program && profile
    ? Array.from({ length: weeks }, (_, index) =>
        planForWeek({ data, program, workouts, sessionMinutes: profile.training.sessionMinutes, monday: addDays(monday, 7 * index), today }).sessions,
      ).flat()
    : [];
  const end = addDays(monday, 7 * weeks - 1);
  const events: IcsEvent[] = buildExportEvents({
    sessions,
    occurrences: expandOccurrences(data.activities, data.exceptions, data.vacations, today, end),
    program,
    from: today,
    includeBasketball,
    alarmMinutes: alarm === 'none' ? null : Number(alarm),
  });

  const exportNow = async () => {
    const outcome = await deliver(buildIcs(events, new Date()));
    setResult(
      outcome === 'shared'
        ? 'Fichier partagé. Choisis « Calendrier » pour ajouter les événements.'
        : outcome === 'downloaded'
          ? 'Fichier téléchargé. Ouvre-le pour l’ajouter au Calendrier de l’iPhone.'
          : null,
    );
  };

  return (
    <Screen title="Exporter" subtitle="Calendrier iPhone">
      <Alert tone="info" title="Comment ça marche">
        VYRO crée un fichier .ics que tu ajoutes toi-même au Calendrier de l’iPhone. Il n’y a pas de synchronisation automatique :
        après un changement de planning, exporte à nouveau. Selon iOS, les anciens événements peuvent être mis à jour ou dupliqués ;
        supprime-les si besoin.
      </Alert>

      <Card>
        <div className="space-y-4">
          <ChoiceGroup<Range>
            name="export-range"
            label="Période"
            value={range}
            onChange={setRange}
            options={[
              { value: '1', label: 'Cette semaine' },
              { value: '4', label: '4 semaines' },
            ]}
          />
          <Toggle label="Inclure les entraînements et matchs de basket" checked={includeBasketball} onChange={setIncludeBasketball} />
          <ChoiceGroup<Alarm>
            name="export-alarm"
            label="Rappel du Calendrier"
            columns={2}
            value={alarm}
            onChange={setAlarm}
            options={[
              { value: 'none', label: 'Aucun' },
              { value: '15', label: '15 min avant' },
              { value: '30', label: '30 min avant' },
              { value: '60', label: '1 h avant' },
            ]}
          />
          <p className="text-xs text-mist">
            Le rappel est géré par le Calendrier de l’iPhone : il fonctionne même quand VYRO est fermé.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">
          {events.length} événement{events.length > 1 ? 's' : ''} à exporter
        </h2>
        {events.length === 0 ? (
          <p className="mt-1 text-sm text-mist">Rien à exporter sur cette période (aucune séance planifiée ni activité à venir).</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-mist">
            {events.map((event) => (
              <li key={event.uid}>
                {formatShortDate(event.date)} · {event.startTime ?? 'journée'} — <span className="text-snow">{event.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {result && <Alert tone="info">{result}</Alert>}
      <Button block disabled={events.length === 0} onClick={() => void exportNow()}>
        Exporter vers le Calendrier
      </Button>
    </Screen>
  );
}
