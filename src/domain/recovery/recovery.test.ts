import { describe, expect, it } from 'vitest';
import type { Activity, ActivityLog } from '../calendar/types';
import type { CalendarData } from '../calendar/weekly';
import { contextsFor } from '../calendar/weekly';
import { generateProgram } from '../training/program';
import { getExercise } from '../training/exercises';
import { createWorkout } from '../training/workout';
import { buildReadinessContext } from './context';
import { evaluateReadiness, missingAnswers, validateCheckIn, type ReadinessContext } from './engine';
import { averageOf, historyDays } from './history';
import { validateThresholds, withThresholdDefaults } from './thresholds';
import { DEFAULT_THRESHOLDS, type CheckIn } from './types';
import { exerciseLoadsZone, exercisesAffectedBy } from './zones';

const TODAY = '2026-10-21';
const NOW = '2026-10-21T07:00:00.000Z';

const checkIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  date: TODAY,
  sleepHours: 8,
  energy: 7,
  motivation: 7,
  soreness: 'none',
  pain: false,
  painZones: [],
  painIntensity: null,
  availableMinutes: null,
  notes: '',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const context = (overrides: Partial<ReadinessContext> = {}): ReadinessContext => ({
  today: TODAY,
  isMatchDay: false,
  matchTomorrow: false,
  matchYesterday: null,
  basketSessions3Days: 0,
  lastWorkout: null,
  workoutDoneToday: false,
  plannedLegSession: true,
  plannedMinutes: 60,
  ...overrides,
});

const decide = (c: Partial<CheckIn> = {}, ctx: Partial<ReadinessContext> = {}) =>
  evaluateReadiness(checkIn(c), context(ctx), DEFAULT_THRESHOLDS);

describe('données insuffisantes', () => {
  it('demande des précisions sans check-in', () => {
    const decision = evaluateReadiness(null, context(), DEFAULT_THRESHOLDS);
    expect(decision.level).toBe('need-info');
    expect(decision.missing).toHaveLength(3);
  });

  it('demande la zone et l’intensité quand une douleur est signalée sans détail', () => {
    const decision = decide({ pain: true });
    expect(decision.level).toBe('need-info');
    expect(decision.missing).toEqual(['Où as-tu mal ?', 'Quelle est l’intensité de la douleur ?']);
  });

  it('ne suppose rien pour les questions sans réponse', () => {
    expect(missingAnswers(checkIn({ sleepHours: null, pain: null }))).toEqual(['Combien d’heures as-tu dormi ?', 'As-tu une douleur inhabituelle ?']);
  });

  it('conseille quand même le repos un jour de match, même sans check-in', () => {
    expect(evaluateReadiness(null, context({ isMatchDay: true }), DEFAULT_THRESHOLDS).level).toBe('rest');
  });
});

describe('décisions cohérentes', () => {
  it('séance normale quand tout va bien', () => {
    const decision = decide();
    expect(decision.level).toBe('normal');
    expect(decision.reasons).toEqual([]);
  });

  it('nuit courte → séance allégée ; nuit très courte → activité légère', () => {
    expect(decide({ sleepHours: 6 }).level).toBe('adapted');
    expect(decide({ sleepHours: 6 }).reasons[0]?.observation).toBe('Nuit courte (6 h)');
    expect(decide({ sleepHours: 4.5 }).level).toBe('light');
    expect(decide({ sleepHours: 4.5 }).reasons[0]?.observation).toBe('Nuit très courte (4 h 30)');
  });

  it('énergie basse → séance allégée ; très basse → activité légère', () => {
    expect(decide({ energy: 4 }).level).toBe('adapted');
    expect(decide({ energy: 2 }).level).toBe('light');
  });

  it('la motivation basse seule ne réduit pas la séance', () => {
    const decision = decide({ motivation: 2 });
    expect(decision.level).toBe('normal');
    expect(decision.reasons[0]?.observation).toContain('Motivation basse');
  });

  it('plusieurs signaux de fatigue cumulés → activité légère', () => {
    const decision = decide({ sleepHours: 6, energy: 4, soreness: 'strong' });
    expect(decision.level).toBe('light');
    expect(decision.reasons.at(-1)?.observation).toBe('3 signaux de fatigue cumulés');
  });

  it('pas de deuxième séance le même jour', () => {
    expect(decide({}, { workoutDoneToday: true }).level).toBe('rest');
  });

  it('pas assez de temps → activité légère ; un peu moins que prévu → séance raccourcie', () => {
    expect(decide({ availableMinutes: 20 }).level).toBe('light');
    const shorter = decide({ availableMinutes: 45 });
    expect(shorter.level).toBe('adapted');
    expect(shorter.reasons[0]?.effect).toContain('raccourcie');
  });

  it('séance d’hier très dure → allégée ; plus ancienne → sans effet', () => {
    expect(decide({}, { lastWorkout: { date: '2026-10-20', sessionRpe: 9 } }).level).toBe('adapted');
    expect(decide({}, { lastWorkout: { date: '2026-10-18', sessionRpe: 10 } }).level).toBe('normal');
  });
});

describe('douleurs', () => {
  it('retire les exercices de la zone et n’impose pas de séance intense', () => {
    const decision = decide({ pain: true, painZones: ['shoulders'], painIntensity: 3 });
    expect(decision.level).toBe('adapted');
    expect(decision.excludedZones).toEqual(['shoulders']);
    expect(decision.advice.join(' ')).toContain('professionnel de santé');
  });

  it('douleur forte → repos conseillé', () => {
    const decision = decide({ pain: true, painZones: ['knees'], painIntensity: 7 });
    expect(decision.level).toBe('rest');
    expect(decision.excludedZones).toEqual([]);
  });

  it('douleur aux jambes la veille d’un match → activité légère', () => {
    expect(decide({ pain: true, painZones: ['ankles'], painIntensity: 2 }, { matchTomorrow: true }).level).toBe('light');
  });

  it('zone non précisée → activité légère (on ne peut pas savoir quoi éviter)', () => {
    expect(decide({ pain: true, painZones: ['other'], painIntensity: 2 }).level).toBe('light');
  });

  it('associe correctement zones et exercices', () => {
    const bench = getExercise('db-bench-press');
    const legPress = getExercise('leg-press');
    if (!bench || !legPress) throw new Error();
    expect(exerciseLoadsZone(bench, 'shoulders')).toBe(true);
    expect(exerciseLoadsZone(bench, 'knees')).toBe(false);
    expect(exerciseLoadsZone(legPress, 'knees')).toBe(true);
    const affected = exercisesAffectedBy(['knees']);
    expect(affected).toContain('leg-press');
    expect(affected).not.toContain('lat-pulldown');
    expect(exercisesAffectedBy([])).toEqual([]);
  });

  it('la séance du jour retire les exercices de la zone douloureuse', () => {
    const program = generateProgram({
      id: 'p',
      now: NOW,
      profile: {
        experience: '3to6m',
        training: {
          equipment: ['dumbbells', 'bench', 'cables', 'machines', 'pullupBar'],
          sessionMinutes: { min: 60, max: 90 },
          likedExercises: [],
          avoidedExercises: [],
          noUnassistedFreeBench: true,
        },
      },
    }).program;
    const workout = createWorkout({
      id: 'w',
      program,
      templateKey: 'A',
      date: TODAY,
      now: NOW,
      light: true,
      history: [],
      excludedExerciseIds: exercisesAffectedBy(['knees']),
    });
    const legPress = workout.exercises.find((exercise) => exercise.exerciseId === 'leg-press');
    expect(legPress?.skipped).toBe(true);
    expect(legPress?.targetNote).toContain('zone douloureuse');
    expect(workout.exercises.find((exercise) => exercise.exerciseId === 'lat-pulldown')?.skipped).toBe(false);
  });
});

describe('basket et matchs rapprochés', () => {
  it('jour de match → repos ; veille de match avec jambes → allégée', () => {
    expect(decide({}, { isMatchDay: true }).level).toBe('rest');
    expect(decide({}, { matchTomorrow: true, plannedLegSession: true }).level).toBe('adapted');
    expect(decide({}, { matchTomorrow: true, plannedLegSession: false }).level).toBe('normal');
  });

  it('match intense hier → allégée ; intensité non notée → pas d’effet supposé', () => {
    expect(decide({}, { matchYesterday: { intensity: 9 } }).level).toBe('adapted');
    expect(decide({}, { matchYesterday: { intensity: null } }).level).toBe('normal');
  });

  it('beaucoup de basket en 3 jours → allégée', () => {
    expect(decide({}, { basketSessions3Days: 3 }).level).toBe('adapted');
    expect(decide({}, { basketSessions3Days: 2 }).level).toBe('normal');
  });

  it('match intense + nuit courte + énergie basse → activité légère', () => {
    expect(decide({ sleepHours: 6, energy: 4 }, { matchYesterday: { intensity: 8 } }).level).toBe('light');
  });

  it('construit le contexte depuis le calendrier et les séances réels', () => {
    const activity = (id: string, kind: Activity['kind'], date: string): Activity => ({
      id,
      kind,
      title: kind,
      startTime: '18:00',
      durationMinutes: 90,
      date,
      recurrence: null,
      notes: '',
      createdAt: NOW,
      updatedAt: NOW,
    });
    const log: ActivityLog = {
      id: 'm1',
      activityId: 'm1',
      kind: 'match',
      date: '2026-10-20',
      played: true,
      intensity: 9,
      minutesPlayed: null,
      points: null,
      rebounds: null,
      assists: null,
      notes: '',
      updatedAt: NOW,
    };
    const data: CalendarData = {
      activities: [activity('p1', 'practice', '2026-10-19'), activity('m1', 'match', '2026-10-20'), activity('m2', 'match', '2026-10-22')],
      exceptions: [],
      vacations: [],
      overrides: [],
      planning: null,
      logs: [log],
    };
    const result = buildReadinessContext({ today: TODAY, data, workouts: [], template: null });
    expect(result).toMatchObject({ basketSessions3Days: 2, matchYesterday: { intensity: 9 }, matchTomorrow: true, isMatchDay: false });
  });
});

describe('lien avec le calendrier', () => {
  const data: CalendarData = {
    activities: [],
    exceptions: [],
    vacations: [],
    overrides: [],
    planning: { id: 'me', gymSlots: [{ weekday: 2, from: null, to: null }], includeOptionalThird: false, updatedAt: NOW },
    logs: [],
  };

  it('repos ou activité légère conseillés → pas de musculation planifiée ce jour', () => {
    const [day] = contextsFor({ ...data, readiness: new Map([[TODAY, 'light']]) }, [TODAY]);
    expect(day?.gym).toMatchObject({ available: false, reason: 'activité légère conseillée par ton check-in' });
  });

  it('séance adaptée → version allégée conseillée', () => {
    const [day] = contextsFor({ ...data, readiness: new Map([[TODAY, 'adapted']]) }, [TODAY]);
    expect(day?.fatigue).toBe(true);
    expect(day?.gym.available).toBe(true);
  });
});

describe('seuils et historique', () => {
  it('valide les seuils et refuse des seuils incohérents', () => {
    expect(validateThresholds(DEFAULT_THRESHOLDS)).toEqual({});
    expect(validateThresholds({ ...DEFAULT_THRESHOLDS, veryShortSleepHours: 7 }).veryShortSleepHours).toBeDefined();
    expect(validateThresholds({ ...DEFAULT_THRESHOLDS, lowEnergy: 20 }).lowEnergy).toBeDefined();
    expect(withThresholdDefaults({ lowEnergy: 99 })).toEqual(DEFAULT_THRESHOLDS);
    expect(withThresholdDefaults({ lowEnergy: 5 }).lowEnergy).toBe(5);
  });

  it('les seuils réglés changent la décision', () => {
    const strict = { ...DEFAULT_THRESHOLDS, shortSleepHours: 8 };
    expect(evaluateReadiness(checkIn({ sleepHours: 7.5 }), context(), strict).level).toBe('adapted');
    expect(evaluateReadiness(checkIn({ sleepHours: 7.5 }), context(), DEFAULT_THRESHOLDS).level).toBe('normal');
  });

  it('valide les réponses du check-in', () => {
    expect(validateCheckIn({ sleepHours: 20, energy: 0, motivation: 5, painIntensity: null, availableMinutes: 400 })).toEqual({
      sleepHours: 'Entre 0 et 16 heures.',
      energy: 'Entre 1 et 10.',
      availableMinutes: 'Entre 0 et 300 minutes.',
    });
  });

  it('historique jour par jour sans inventer les jours manquants', () => {
    const days = historyDays([checkIn({ date: '2026-10-20', sleepHours: 6 }), checkIn({ soreness: 'moderate' })], TODAY, 3);
    expect(days.map((day) => day.sleepHours)).toEqual([null, 6, 8]);
    expect(days[2]?.soreness).toBe(2);
    expect(averageOf(days.map((day) => day.sleepHours))).toEqual({ value: 7, count: 2 });
    expect(averageOf([null, null])).toBeNull();
  });
});
