import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateProgram } from '../training/program';
import type { Weekday, Workout } from '../training/types';
import { diffPlans, toSnapshot } from './diff';
import { planActivityUpdate } from './edit';
import { buildExportEvents } from './export';
import { buildIcs, escapeText, foldLine, toUtcStamp } from './ics';
import { conflictsWith, expandOccurrences, findConflicts } from './occurrences';
import { buildDayContexts, findTimeSlot, planWeekFromCalendar, type DayContext } from './planner';
import type { Activity, ActivityLog, DayOverride, OccurrenceException, PlanningSettings, Vacation } from './types';
import { basketballSummary, validateActivity, validateLog, validateVacation } from './validation';
import { contextsFor, planForWeek, weekDays, type CalendarData } from './weekly';
import { getTimezone, setTimezone } from '../../test/timezone';

// Semaine de référence : lundi 19 → dimanche 25 octobre 2026 (passage à l'heure d'hiver le 25).
const MONDAY = '2026-10-19';
const NOW = '2026-10-01T00:00:00.000Z';

function activity(overrides: Partial<Activity> & Pick<Activity, 'id' | 'kind'>): Activity {
  return {
    title: overrides.kind === 'match' ? 'Match' : overrides.kind === 'practice' ? 'Entraînement' : 'Autre',
    startTime: null,
    durationMinutes: null,
    date: null,
    recurrence: null,
    notes: '',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const weekly = (id: string, kind: Activity['kind'], weekday: Weekday, startTime: string | null = null, durationMinutes: number | null = null) =>
  activity({ id, kind, startTime, durationMinutes, recurrence: { weekday, from: '2026-09-01', until: null } });

const practiceTue = weekly('practice-tue', 'practice', 1, '18:00', 90);
const practiceThu = weekly('practice-thu', 'practice', 3, '18:00', 90);
const matchSat = weekly('match-sat', 'match', 5, '15:00', 120);

const planning = (slots: { weekday: Weekday; from?: string | null; to?: string | null }[], includeOptionalThird = false): PlanningSettings => ({
  id: 'me',
  gymSlots: slots.map((slot) => ({ weekday: slot.weekday, from: slot.from ?? null, to: slot.to ?? null })),
  includeOptionalThird,
  updatedAt: NOW,
});

const data = (overrides: Partial<CalendarData> = {}): CalendarData => ({
  activities: [practiceTue, practiceThu, matchSat],
  exceptions: [],
  vacations: [],
  overrides: [],
  planning: planning([0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday: weekday as Weekday }))),
  logs: [],
  ...overrides,
});

const program = generateProgram({
  id: 'p',
  now: NOW,
  profile: {
    experience: '3to6m',
    training: {
      equipment: ['dumbbells', 'bench', 'barbell', 'plates', 'cables', 'machines', 'pullupBar'],
      sessionMinutes: { min: 45, max: 90 },
      likedExercises: [],
      avoidedExercises: [],
      noUnassistedFreeBench: true,
    },
  },
}).program;

const SESSION_MINUTES = { min: 45, max: 90 };

const plan = (calendar: CalendarData, nextCoreKey: 'A' | 'B' = 'A') =>
  planWeekFromCalendar({
    days: contextsFor(calendar, weekDays(MONDAY)),
    program,
    nextCoreKey,
    includeOptionalThird: calendar.planning?.includeOptionalThird ?? false,
    sessionMinutes: SESSION_MINUTES,
  });

describe('événements récurrents', () => {
  it('produit une occurrence par semaine, dans la période de validité', () => {
    const limited = activity({ id: 'x', kind: 'practice', recurrence: { weekday: 1, from: '2026-10-13', until: '2026-10-27' } });
    const dates = expandOccurrences([limited], [], [], '2026-10-01', '2026-11-30').map((o) => o.date);
    expect(dates).toEqual(['2026-10-13', '2026-10-20', '2026-10-27']);
  });

  it('inclut les activités ponctuelles et trie par date puis heure', () => {
    const extra = activity({ id: 'tournoi', kind: 'match', date: '2026-10-20', startTime: '10:00' });
    const result = expandOccurrences([practiceTue, extra], [], [], MONDAY, '2026-10-25');
    expect(result.map((o) => `${o.date} ${o.startTime} ${o.id}`)).toEqual([
      '2026-10-20 10:00 tournoi',
      '2026-10-20 18:00 practice-tue@2026-10-20',
    ]);
  });

  it('annule une seule occurrence sans toucher aux autres', () => {
    const cancel: OccurrenceException = {
      id: 'e',
      activityId: 'practice-tue',
      date: '2026-10-20',
      action: 'cancel',
      newDate: null,
      newStartTime: null,
      createdAt: NOW,
    };
    const dates = expandOccurrences([practiceTue], [cancel], [], '2026-10-13', '2026-10-27').map((o) => o.date);
    expect(dates).toEqual(['2026-10-13', '2026-10-27']);
  });

  it('reporte une occurrence (autre jour, autre heure) en gardant son identifiant', () => {
    const move: OccurrenceException = {
      id: 'e',
      activityId: 'practice-thu',
      date: '2026-10-22',
      action: 'move',
      newDate: '2026-10-26',
      newStartTime: '19:30',
      createdAt: NOW,
    };
    const thisWeek = expandOccurrences([practiceThu], [move], [], MONDAY, '2026-10-25');
    expect(thisWeek).toEqual([]);
    const nextWeek = expandOccurrences([practiceThu], [move], [], '2026-10-26', '2026-11-01');
    expect(nextWeek[0]).toMatchObject({ id: 'practice-thu@2026-10-22', date: '2026-10-26', startTime: '19:30', movedFrom: '2026-10-22' });
    expect(nextWeek[1]?.date).toBe('2026-10-29');
  });
});

describe('vacances', () => {
  const vacation: Vacation = { id: 'v', start: '2026-10-20', end: '2026-10-24', basketballSuspended: true, gym: 'none', confirmedAt: NOW };

  it('suspend le basket (sans l’effacer) mais pas les autres activités', () => {
    const other = activity({ id: 'piano', kind: 'other', date: '2026-10-21' });
    const result = expandOccurrences([practiceTue, matchSat, other], [], [vacation], MONDAY, '2026-10-25');
    expect(result.find((o) => o.id === 'practice-tue@2026-10-20')?.suspended).toBe(true);
    expect(result.find((o) => o.id === 'match-sat@2026-10-24')?.suspended).toBe(true);
    expect(result.find((o) => o.id === 'piano')?.suspended).toBe(false);
  });

  it('ne planifie aucune séance quand la salle est exclue pour toute la semaine', () => {
    const fullWeek = { ...vacation, start: MONDAY, end: '2026-10-25' };
    const result = plan(data({ vacations: [fullWeek] }));
    expect(result.status).toBe('no-valid-day');
    expect(result.sessions).toEqual([]);
  });

  it('garde les disponibilités habituelles si la salle reste possible, sans contrainte de match', () => {
    const withGym = { ...vacation, gym: 'usual' as const };
    const days = contextsFor(data({ vacations: [withGym] }), weekDays(MONDAY));
    expect(days.find((day) => day.date === '2026-10-24')?.isMatchDay).toBe(false);
    expect(plan(data({ vacations: [withGym] })).sessions.length).toBe(2);
  });

  it('refuse des vacances qui se chevauchent ou incohérentes', () => {
    expect(validateVacation({ start: '2026-10-22', end: '2026-10-28' }, [vacation])).toContain('Chevauche');
    expect(validateVacation({ start: '2026-10-28', end: '2026-10-22' }, [])).toContain('après');
    expect(validateVacation({ start: '2026-10-26', end: '2026-10-30' }, [vacation])).toBeUndefined();
  });
});

describe('conflits horaires', () => {
  it('détecte les chevauchements, ignore les activités sans horaire ou suspendues', () => {
    const late = activity({ id: 'kine', kind: 'other', date: '2026-10-20', startTime: '19:00', durationMinutes: 30 });
    const untimed = activity({ id: 'flou', kind: 'other', date: '2026-10-20' });
    const occurrences = expandOccurrences([practiceTue, late, untimed], [], [], MONDAY, '2026-10-25');
    const conflicts = findConflicts(occurrences);
    expect(conflicts).toHaveLength(1);
    expect([conflicts[0]?.a.id, conflicts[0]?.b.id].sort()).toEqual(['kine', 'practice-tue@2026-10-20']);
    expect(conflictsWith({ date: '2026-10-20', startTime: '17:00', durationMinutes: 60 }, occurrences)).toEqual([]);
    expect(conflictsWith({ date: '2026-10-20', startTime: '17:30', durationMinutes: 60 }, occurrences).map((o) => o.id)).toEqual([
      'practice-tue@2026-10-20',
    ]);
  });
});

describe('contexte des journées', () => {
  it('détecte la veille d’un match, même d’une semaine sur l’autre', () => {
    const mondayMatch = activity({ id: 'm', kind: 'match', date: '2026-10-26', startTime: '20:00' });
    const days = contextsFor(data({ activities: [mondayMatch] }), weekDays(MONDAY));
    expect(days.find((day) => day.date === '2026-10-25')?.matchTomorrow).toBe(true);
  });

  it('applique repos, indisponibilité et créneau du jour', () => {
    const override = (date: string, patch: Partial<DayOverride>): DayOverride => ({
      date,
      rest: false,
      gymUnavailable: false,
      gymWindow: null,
      fatigue: false,
      note: '',
      updatedAt: NOW,
      ...patch,
    });
    const days = contextsFor(
      data({
        overrides: [
          override('2026-10-19', { rest: true }),
          override('2026-10-21', { gymUnavailable: true }),
          override('2026-10-22', { gymWindow: { from: '07:00', to: '08:30' } }),
        ],
      }),
      weekDays(MONDAY),
    );
    expect(days[0]?.gym).toMatchObject({ available: false, reason: 'jour de repos' });
    expect(days[2]?.gym.available).toBe(false);
    expect(days[3]?.gym.window).toEqual({ from: '07:00', to: '08:30' });
  });

  it('retient l’intensité notée du match de la veille', () => {
    const log: ActivityLog = {
      id: 'match-sat@2026-10-24',
      activityId: 'match-sat',
      kind: 'match',
      date: '2026-10-24',
      played: true,
      intensity: 9,
      minutesPlayed: 28,
      points: 12,
      rebounds: 5,
      assists: 3,
      notes: '',
      updatedAt: NOW,
    };
    const days = contextsFor(data({ logs: [log] }), weekDays(MONDAY));
    expect(days[6]?.matchYesterday).toEqual({ intensity: 9 });
  });
});

describe('moteur d’adaptation', () => {
  it('ne planifie rien quand les disponibilités sont inconnues', () => {
    const result = plan(data({ planning: null }));
    expect(result.status).toBe('unknown-availability');
    expect(result.sessions).toEqual([]);
  });

  it('jamais un jour de match, jamais de jambes la veille, et explique les jours exclus', () => {
    const result = plan(data());
    const dates = result.sessions.map((session) => session.date);
    expect(dates).not.toContain('2026-10-24');
    expect(dates).not.toContain('2026-10-23');
    expect(result.excludedDays).toEqual(
      expect.arrayContaining([
        { date: '2026-10-24', reason: 'jour de match' },
        { date: '2026-10-23', reason: 'veille de match (séance avec travail de jambes)' },
      ]),
    );
  });

  it('place la séance hors des horaires de basket, avec une marge', () => {
    const calendar = data({ planning: planning([{ weekday: 1, from: '16:00', to: '21:00' }, { weekday: 3, from: '16:00', to: '21:00' }]) });
    const days = contextsFor(calendar, weekDays(MONDAY));
    const tuesday = days[1] as DayContext;
    // 18:00–19:30 + 30 min de marge : seul 16:00–17:30 reste (90 min) — et 20:00–21:00 (60 min).
    const slot = findTimeSlot(tuesday, 60, 45);
    expect(slot).toMatchObject({ startTime: '16:00', availableMinutes: null });
  });

  it('écarte un jour sans assez de temps et signale un temps réduit', () => {
    const tight = data({ activities: [], planning: planning([{ weekday: 0, from: '18:00', to: '18:30' }, { weekday: 2, from: '18:00', to: '18:50' }]) });
    const result = plan(tight);
    expect(result.excludedDays.find((day) => day.date === '2026-10-19')?.reason).toContain('pas assez de temps');
    const wednesday = result.sessions.find((session) => session.date === '2026-10-21');
    expect(wednesday?.availableMinutes).toBe(50);
    expect(wednesday?.notes.join(' ')).toContain('Seulement 50 min');
    expect(result.status).toBe('reduced');
  });

  it('conseille une version allégée en cas de fatigue déclarée', () => {
    const fatigue: DayOverride = { date: '2026-10-19', rest: false, gymUnavailable: false, gymWindow: null, fatigue: true, note: '', updatedAt: NOW };
    const result = plan(data({ activities: [], planning: planning([{ weekday: 0 }, { weekday: 2 }]), overrides: [fatigue] }));
    expect(result.sessions.find((session) => session.date === '2026-10-19')).toMatchObject({ light: true });
  });

  it('prévient quand l’horaire d’une activité est inconnu', () => {
    const untimed = weekly('foot', 'other', 0);
    const result = plan(data({ activities: [untimed], planning: planning([{ weekday: 0, from: '17:00', to: '21:00' }, { weekday: 2 }]) }));
    expect(result.sessions.find((session) => session.date === '2026-10-19')?.notes.join(' ')).toContain('inconnu');
  });

  it('recalcule après un changement de dernière minute et explique la différence', () => {
    const before = plan(data({ activities: [practiceTue], planning: planning([{ weekday: 0 }, { weekday: 3 }]) }));
    expect(before.sessions.map((s) => [s.date, s.templateKey])).toEqual([
      ['2026-10-19', 'A'],
      ['2026-10-22', 'B'],
    ]);

    // Match ajouté vendredi : la séance B du jeudi (veille) ne convient plus.
    const fridayMatch = activity({ id: 'match-ven', kind: 'match', date: '2026-10-23', startTime: '20:00' });
    const after = plan(
      data({ activities: [practiceTue, fridayMatch], planning: planning([{ weekday: 0 }, { weekday: 3 }, { weekday: 6 }]) }),
    );
    expect(after.sessions.map((s) => [s.date, s.templateKey])).toEqual([
      ['2026-10-19', 'A'],
      ['2026-10-25', 'B'],
    ]);
    const changes = diffPlans(
      toSnapshot(MONDAY, before.sessions, NOW).sessions,
      after.sessions,
      (date) => date,
      (date) => after.excludedDays.find((day) => day.date === date)?.reason,
    );
    expect(changes).toEqual([
      {
        kind: 'moved',
        templateKey: 'B',
        message: 'Séance B déplacée du 2026-10-22 au 2026-10-25 (veille de match (séance avec travail de jambes)).',
      },
    ]);
  });

  it('allège le lendemain d’un match intense', () => {
    const log: ActivityLog = {
      id: 'match-sat@2026-10-24',
      activityId: 'match-sat',
      kind: 'match',
      date: '2026-10-24',
      played: true,
      intensity: 9,
      minutesPlayed: null,
      points: null,
      rebounds: null,
      assists: null,
      notes: '',
      updatedAt: NOW,
    };
    const result = plan(data({ activities: [matchSat], planning: planning([{ weekday: 2 }, { weekday: 6 }]), logs: [log] }));
    expect(result.sessions.find((session) => session.date === '2026-10-25')).toMatchObject({ light: true });
  });

  it('enchaîne la rotation sur les semaines futures sans rattrapage', () => {
    const calendar = data({ activities: [], planning: planning([{ weekday: 0 }]) });
    const options = { data: calendar, program, workouts: [] as Workout[], sessionMinutes: SESSION_MINUTES, today: '2026-10-19' };
    expect(planForWeek({ ...options, monday: '2026-10-19' }).sessions.map((s) => s.templateKey)).toEqual(['A']);
    expect(planForWeek({ ...options, monday: '2026-10-26' }).sessions.map((s) => s.templateKey)).toEqual(['B']);
    expect(planForWeek({ ...options, monday: '2026-11-02' }).sessions.map((s) => s.templateKey)).toEqual(['A']);
  });
});

describe('différences de planning', () => {
  const session = (date: string, templateKey: 'A' | 'B', extra: Partial<{ startTime: string | null; light: boolean }> = {}) => ({
    date,
    templateKey,
    optional: false,
    startTime: null,
    availableMinutes: null,
    light: false,
    notes: [],
    ...extra,
  });

  it('signale ajouts, retraits, changements d’heure et allègements', () => {
    const changes = diffPlans(
      [
        { date: '2026-10-19', templateKey: 'A', optional: false, startTime: '17:00', light: false },
        { date: '2026-10-21', templateKey: 'B', optional: false, startTime: null, light: false },
      ],
      [session('2026-10-19', 'A', { startTime: '18:00', light: true })],
      (date) => date,
      () => 'vacances sans salle',
    );
    expect(changes.map((change) => change.kind)).toEqual(['time', 'light', 'removed']);
    expect(changes[2]?.message).toContain('vacances sans salle');
    expect(diffPlans([], [session('2026-10-19', 'A')], (d) => d, () => undefined)[0]?.kind).toBe('added');
  });
});

describe('export ICS', () => {
  const originalTz = getTimezone();
  beforeEach(() => setTimezone('Europe/Paris'));
  afterEach(() => setTimezone(originalTz));

  it('convertit l’heure locale en UTC en tenant compte du changement d’heure', () => {
    expect(toUtcStamp('2026-10-24', '15:00')).toBe('20261024T130000Z'); // heure d'été (UTC+2)
    expect(toUtcStamp('2026-10-25', '15:00')).toBe('20261025T140000Z'); // heure d'hiver (UTC+1)
    expect(toUtcStamp('2026-03-29', '10:00')).toBe('20260329T080000Z'); // passage à l'heure d'été
  });

  it('respecte le fuseau de l’appareil (ex. New York)', () => {
    setTimezone('America/New_York');
    expect(toUtcStamp('2026-10-24', '15:00')).toBe('20261024T190000Z');
  });

  it('gère une séance qui finit après minuit', () => {
    expect(toUtcStamp('2026-10-24', '23:30', 60)).toBe('20261024T223000Z');
  });

  it('produit un fichier iCalendar valide (CRLF, échappement, journée entière, rappel)', () => {
    const ics = buildIcs(
      [
        { uid: 'gym-A-2026-10-21@vyro', date: '2026-10-21', startTime: '17:00', durationMinutes: 75, summary: 'VYRO : Séance A', description: 'Presse, développé; tirage\nNotes', alarmMinutes: 30 },
        { uid: 'gym-B-2026-10-23@vyro', date: '2026-10-23', startTime: null, durationMinutes: 75, summary: 'VYRO : Séance B', description: '', alarmMinutes: null },
      ],
      new Date('2026-10-20T08:00:00Z'),
    );
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261021T150000Z');
    expect(ics).toContain('DTEND:20261021T161500Z');
    expect(ics).toContain('DESCRIPTION:Presse\\, développé\\; tirage\\nNotes');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261023');
    expect(ics).toContain('DTEND;VALUE=DATE:20261024');
    expect(ics).toContain('TRIGGER:-PT30M');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1);
    expect(ics).toContain('DTSTAMP:20261020T080000Z');
  });

  it('découpe les lignes longues à 75 octets sans couper un caractère accentué', () => {
    const long = `SUMMARY:${'é'.repeat(80)}`;
    const folded = foldLine(long);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
    expect(escapeText('a,b;c\\d')).toBe('a\\,b\\;c\\\\d');
  });
});

describe('validation et suivi du basket', () => {
  const base = { kind: 'match' as const, title: 'Match', startTime: '15:00', durationMinutes: '120', repeat: false, date: '2026-10-24', weekday: '5', from: '', until: '' };

  it('valide une activité ponctuelle ou récurrente', () => {
    expect(validateActivity(base)).toEqual({});
    expect(validateActivity({ ...base, title: ' ' }).title).toBeDefined();
    expect(validateActivity({ ...base, startTime: '25:00' }).startTime).toBeDefined();
    expect(validateActivity({ ...base, startTime: '23:00', durationMinutes: '120' }).durationMinutes).toContain('même jour');
    expect(validateActivity({ ...base, repeat: true, from: '2026-10-01', until: '2026-09-01' }).until).toBeDefined();
    expect(validateActivity({ ...base, startTime: '', durationMinutes: '' })).toEqual({});
  });

  it('valide le suivi d’un match', () => {
    expect(validateLog({ intensity: 11, minutesPlayed: 30, points: 10, rebounds: 2, assists: 1 }).intensity).toBeDefined();
    expect(validateLog({ intensity: 7, minutesPlayed: null, points: null, rebounds: null, assists: null })).toEqual({});
  });

  it('calcule les moyennes uniquement sur les valeurs notées', () => {
    const log = (intensity: number | null, points: number | null, played = true): ActivityLog => ({
      id: crypto.randomUUID(),
      activityId: 'm',
      kind: 'match',
      date: '2026-10-24',
      played,
      intensity,
      minutesPlayed: null,
      points,
      rebounds: null,
      assists: null,
      notes: '',
      updatedAt: NOW,
    });
    const summary = basketballSummary([log(8, 10), log(6, null), log(9, 30, false)]);
    expect(summary.matchesPlayed).toBe(2);
    expect(summary.intensity).toEqual({ value: 7, count: 2 });
    expect(summary.points).toEqual({ value: 10, count: 1 });
    expect(summary.rebounds).toBeNull();
  });
});

describe('construction directe des contextes', () => {
  it('sans créneau habituel, un créneau ponctuel rend la salle possible', () => {
    const days = buildDayContexts({
      dates: ['2026-10-21'],
      planning: planning([]),
      overrides: [{ date: '2026-10-21', rest: false, gymUnavailable: false, gymWindow: { from: '10:00', to: '12:00' }, fatigue: false, note: '', updatedAt: NOW }],
      vacations: [],
      occurrences: [],
      logs: [],
    });
    expect(days[0]?.gym).toMatchObject({ available: true, window: { from: '10:00', to: '12:00' } });
  });
});

describe('modification d’une activité habituelle', () => {
  it('arrête l’ancienne série hier et en démarre une nouvelle, sans réécrire le passé', () => {
    const updated = { ...practiceThu, startTime: '19:00', updatedAt: '2026-10-21T10:00:00.000Z' };
    const [closed, next] = planActivityUpdate(practiceThu, updated, '2026-10-21', 'new-id');
    expect(closed?.recurrence?.until).toBe('2026-10-20');
    expect(next).toMatchObject({ id: 'new-id', startTime: '19:00', recurrence: { from: '2026-10-21' } });
    const occurrences = expandOccurrences([closed as Activity, next as Activity], [], [], '2026-10-08', '2026-10-30');
    expect(occurrences.map((o) => `${o.date} ${o.startTime}`)).toEqual(['2026-10-08 18:00', '2026-10-15 18:00', '2026-10-22 19:00', '2026-10-29 19:00']);
  });

  it('modifie simplement le titre ou une série pas encore commencée', () => {
    expect(planActivityUpdate(practiceThu, { ...practiceThu, title: 'Entraînement U18' }, '2026-10-21', 'x')).toHaveLength(1);
    const future = { ...practiceThu, recurrence: { weekday: 3 as Weekday, from: '2026-11-01', until: null } };
    expect(planActivityUpdate(future, { ...future, startTime: '20:00' }, '2026-10-21', 'x')).toHaveLength(1);
  });
});

describe('événements à exporter', () => {
  it('exporte les séances à venir et, si demandé, le basket non suspendu, avec des UID stables', () => {
    const result = plan(data());
    const occurrences = expandOccurrences(data().activities, [], [{ id: 'v', start: '2026-10-22', end: '2026-10-22', basketballSuspended: true, gym: 'usual', confirmedAt: NOW }], MONDAY, '2026-10-25');
    const events = buildExportEvents({ sessions: result.sessions, occurrences, program, from: '2026-10-20', includeBasketball: true, alarmMinutes: 30 });
    expect(events.some((event) => event.date < '2026-10-20')).toBe(false);
    expect(events.filter((event) => event.summary.startsWith('🏀')).map((event) => event.date)).toEqual(['2026-10-20', '2026-10-24']);
    const gym = events.find((event) => event.summary.startsWith('VYRO'));
    expect(gym?.uid).toMatch(/^vyro-muscu-2026-10-\d\d-[AB]@vyro\.app$/);
    expect(gym?.description).toContain('•');
    const again = buildExportEvents({ sessions: result.sessions, occurrences, program, from: '2026-10-20', includeBasketball: true, alarmMinutes: 30 });
    expect(again.map((event) => event.uid)).toEqual(events.map((event) => event.uid));
    expect(buildExportEvents({ sessions: result.sessions, occurrences, program, from: '2026-10-20', includeBasketball: false, alarmMinutes: null }).every((event) => !event.summary.startsWith('🏀'))).toBe(true);
  });
});
