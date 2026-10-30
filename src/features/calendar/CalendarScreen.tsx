import { CalendarClock, ChevronLeft, ChevronRight, Download, Palmtree, Plus, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { todayIso } from '../../app/clock';
import { findConflicts } from '../../domain/calendar/occurrences';
import { addDays } from '../../domain/calendar/time';
import { isIsoDate, type IsoDate } from '../../domain/common/dates';
import { weekStart } from '../../domain/training/schedule';
import { Alert } from '../../ui/Alert';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';
import { formatDayShort, formatMonth, formatTimeRange, KIND_STYLES } from './labels';
import { useReadinessData } from '../recovery/readiness';
import { computeWeek, usePlanChanges, type WeekView } from './usePlanning';

type View = 'semaine' | 'mois';

const STATUS: Record<string, { label: string; className: string }> = {
  done: { label: 'Faite', className: 'bg-emerald-500/15 text-emerald-300' },
  missed: { label: 'Manquée', className: 'bg-amber-400/15 text-amber-200' },
  today: { label: 'Aujourd’hui', className: 'bg-volt-600/25 text-volt-400' },
  upcoming: { label: 'Prévue', className: 'bg-ink-800 text-mist' },
};

export function CalendarScreen() {
  const [params, setParams] = useSearchParams();
  // Calendrier tenant compte du check-in de récupération du jour.
  const day = useReadinessData();
  const data = day?.data;
  const program = day?.program;
  const profile = day?.profile;
  const workouts = day?.workouts;
  const today = todayIso();
  const view: View = params.get('vue') === 'mois' ? 'mois' : 'semaine';
  const rawDate = params.get('date');
  const anchor = rawDate && isIsoDate(rawDate) ? rawDate : today;

  const current =
    data && program !== undefined && profile !== undefined && workouts
      ? computeWeek(weekStart(anchor), today, data, program, profile, workouts)
      : undefined;
  const { changes, acknowledge } = usePlanChanges(
    current && current.monday === weekStart(today) ? current : undefined,
  );

  if (!data || program === undefined || profile === undefined || !workouts || !current) return null;

  const go = (next: { vue?: View; date?: IsoDate }) =>
    setParams({ vue: next.vue ?? view, date: next.date ?? anchor }, { replace: true });
  const step = (direction: 1 | -1) => {
    if (view === 'semaine') return go({ date: addDays(current.monday, 7 * direction) });
    const [y, m] = anchor.split('-').map(Number) as [number, number];
    const target = new Date(y, m - 1 + direction, 1);
    return go({ date: `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01` });
  };

  return (
    <Screen title="Calendrier" subtitle="Planning">
      {changes.length > 0 && (
        <Alert tone="info" title="Ton planning a changé">
          <ul className="space-y-1">
            {changes.map((change) => (
              <li key={change.message}>{change.message}</li>
            ))}
          </ul>
          <button type="button" onClick={acknowledge} className="mt-2 min-h-11 font-semibold text-volt-400">
            J’ai compris
          </button>
        </Alert>
      )}

      {!data.planning && (
        <Alert tone="warning" title="Disponibilités inconnues">
          Aucune séance de musculation n’est planifiée tant que tu n’as pas indiqué tes disponibilités.{' '}
          <Link to="/calendrier/habituel" className="font-semibold text-volt-400 underline">
            Les indiquer
          </Link>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Affichage" className="grid flex-1 grid-cols-2 rounded-xl bg-ink-900 p-1">
          {(['semaine', 'mois'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => go({ vue: option })}
              className={`min-h-10 rounded-lg text-sm font-semibold capitalize ${view === option ? 'bg-volt-600 text-white' : 'text-mist'}`}
            >
              {option}
            </button>
          ))}
        </div>
        <Link
          to={`/calendrier/activite/nouvelle?date=${anchor < today ? today : anchor}`}
          aria-label="Ajouter une activité"
          className="grid size-12 place-items-center rounded-xl bg-volt-600 text-white active:bg-volt-500"
        >
          <Plus aria-hidden size={22} />
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} aria-label="Période précédente" className="grid size-11 place-items-center rounded-full text-mist active:text-snow">
          <ChevronLeft aria-hidden size={22} />
        </button>
        <button type="button" onClick={() => go({ date: today })} className="min-h-11 px-3 font-semibold text-snow">
          {view === 'semaine'
            ? `Semaine du ${formatDayShort(current.monday)}`
            : formatMonth(anchor)}
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Période suivante" className="grid size-11 place-items-center rounded-full text-mist active:text-snow">
          <ChevronRight aria-hidden size={22} />
        </button>
      </div>

      {view === 'semaine' ? (
        <WeekList week={current} />
      ) : (
        <MonthGrid anchor={anchor} today={today} build={(monday) => computeWeek(monday, today, data, program, profile, workouts)} />
      )}

      {current.plan && current.plan.status !== 'unknown-availability' && (
        <Card>
          <details>
            <summary className="min-h-8 cursor-pointer font-semibold text-snow">Pourquoi ce planning ?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
              {current.plan.explanations.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {current.plan.excludedDays.map((day) => (
                <li key={day.date}>
                  {formatShortDate(day.date)} : pas de musculation ({day.reason}).
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}

      <nav aria-label="Outils du calendrier" className="grid grid-cols-2 gap-2">
        {[
          { to: '/calendrier/habituel', label: 'Planning habituel', icon: CalendarClock },
          { to: '/calendrier/vacances', label: 'Vacances', icon: Palmtree },
          { to: '/calendrier/basket', label: 'Suivi basket', icon: Trophy },
          { to: '/calendrier/export', label: 'Exporter (iPhone)', icon: Download },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-h-14 items-center gap-2 rounded-2xl border border-ink-700/80 bg-ink-900/80 px-3 text-sm font-medium text-snow active:bg-ink-800">
            <Icon aria-hidden size={18} className="shrink-0 text-volt-400" />
            {label}
          </Link>
        ))}
      </nav>
    </Screen>
  );
}

function WeekList({ week }: { week: WeekView }) {
  const conflicts = findConflicts(week.occurrences);
  return (
    <ul className="space-y-2" aria-label="Jours de la semaine">
      {week.days.map((day) => {
        const occurrences = week.occurrences.filter((occurrence) => occurrence.date === day.date);
        const session = week.plan?.sessions.find((item) => item.date === day.date);
        const status = session ? week.statuses.get(day.date) : undefined;
        const hasConflict = conflicts.some((conflict) => conflict.a.date === day.date);
        const isToday = day.date === week.today;
        return (
          <li key={day.date}>
            <Link
              to={`/calendrier/jour/${day.date}`}
              aria-label={`${formatShortDate(day.date)}${isToday ? ' (aujourd’hui)' : ''}`}
              className={`block rounded-2xl border bg-ink-900/80 p-3 active:bg-ink-800 ${isToday ? 'border-volt-500/70' : 'border-ink-700/80'}`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-sm font-semibold ${isToday ? 'text-volt-400' : 'text-snow'}`}>{formatShortDate(day.date)}</span>
                {day.vacation && <Badge className="bg-teal-400/15 text-teal-200">Vacances</Badge>}
                {day.rest && <Badge className="bg-ink-700 text-mist">Repos</Badge>}
                {day.fatigue && <Badge className="bg-amber-400/15 text-amber-200">Fatigue</Badge>}
                {hasConflict && <Badge className="bg-red-500/15 text-red-200">Conflit horaire</Badge>}
              </div>
              {(occurrences.length > 0 || session) && (
                <ul className="mt-2 space-y-1 text-sm">
                  {occurrences.map((occurrence) => (
                    <li key={occurrence.id} className={`flex items-center gap-2 ${occurrence.suspended ? 'text-mist line-through' : 'text-snow'}`}>
                      <Badge className={KIND_STYLES[occurrence.kind]}>{occurrence.kind === 'match' ? 'Match' : occurrence.kind === 'practice' ? 'Basket' : 'Autre'}</Badge>
                      <span className="flex-1 truncate">
                        {occurrence.title} · {formatTimeRange(occurrence)}
                        {occurrence.movedFrom ? ' (reporté)' : ''}
                      </span>
                    </li>
                  ))}
                  {session && (
                    <li className="flex items-center gap-2 text-snow">
                      <Badge className="bg-volt-600/25 text-volt-400">Muscu</Badge>
                      <span className="flex-1 truncate">
                        Séance {session.templateKey}
                        {session.optional ? ' (facultative)' : ''}
                        {session.startTime ? ` · ${session.startTime}` : ''}
                        {session.light ? ' · allégée' : ''}
                      </span>
                      {status && <Badge className={STATUS[status]?.className ?? ''}>{STATUS[status]?.label}</Badge>}
                    </li>
                  )}
                </ul>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

const WEEK_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function MonthGrid({ anchor, today, build }: { anchor: IsoDate; today: IsoDate; build: (monday: IsoDate) => WeekView }) {
  const firstOfMonth = `${anchor.slice(0, 7)}-01`;
  const month = anchor.slice(0, 7);
  const weeks: WeekView[] = [];
  for (let monday = weekStart(firstOfMonth); monday.slice(0, 7) <= month; monday = addDays(monday, 7)) {
    weeks.push(build(monday));
  }

  return (
    <Card className="p-2">
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-mist" aria-hidden>
        {WEEK_HEADERS.map((label, index) => (
          <span key={index} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((week) =>
          week.days.map((day) => {
            const occurrences = week.occurrences.filter((occurrence) => occurrence.date === day.date && !occurrence.suspended);
            const session = week.plan?.sessions.find((item) => item.date === day.date);
            const outside = day.date.slice(0, 7) !== month;
            const labels = [
              ...occurrences.map((occurrence) => (occurrence.kind === 'match' ? 'match' : occurrence.kind === 'practice' ? 'basket' : 'autre')),
              ...(session ? [`séance ${session.templateKey}`] : []),
              ...(day.vacation ? ['vacances'] : []),
            ];
            return (
              <Link
                key={day.date}
                to={`/calendrier/jour/${day.date}`}
                aria-label={`${formatShortDate(day.date)}${labels.length ? ` : ${labels.join(', ')}` : ''}`}
                className={`flex min-h-14 flex-col items-center rounded-lg pt-1 text-sm active:bg-ink-800 ${outside ? 'opacity-40' : ''} ${
                  day.vacation ? 'bg-teal-400/10' : ''
                } ${day.date === today ? 'ring-1 ring-volt-500' : ''}`}
              >
                <span className={day.date === today ? 'font-bold text-volt-400' : 'text-snow'}>{Number(day.date.slice(8))}</span>
                <span className="mt-1 flex flex-wrap justify-center gap-0.5" aria-hidden>
                  {occurrences.map((occurrence) => (
                    <span
                      key={occurrence.id}
                      className={`size-1.5 rounded-full ${occurrence.kind === 'match' ? 'bg-orange-400' : occurrence.kind === 'practice' ? 'bg-amber-300' : 'bg-mist'}`}
                    />
                  ))}
                  {session && <span className="size-1.5 rounded-full bg-volt-400" />}
                </span>
              </Link>
            );
          }),
        )}
      </div>
      <p className="mt-2 flex flex-wrap gap-3 px-1 text-xs text-mist">
        <Legend color="bg-orange-400" label="Match" />
        <Legend color="bg-amber-300" label="Basket" />
        <Legend color="bg-volt-400" label="Musculation" />
        <Legend color="bg-mist" label="Autre" />
      </p>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
