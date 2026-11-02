import { describe, expect, it } from 'vitest';
import type { PlannedGymSession } from '../calendar/types';
import { DEFAULT_THRESHOLDS, type CheckIn } from '../recovery/types';
import { generateProgram } from '../training/program';
import type { Program, Workout } from '../training/types';
import { createWorkout } from '../training/workout';
import { weeklyGoals } from './goals';
import { answerIntent, INTENT_IDS, INTENTS, matchIntent } from './intents';
import { greeting, proactiveMessages } from './messages';
import { localRulesCoach, remoteCoachAvailability } from './provider';
import { buildReview, completedPeriods, reviewToShow } from './review';
import { dismissMessage, markReviewSeen, withCoachDefaults } from './state';
import type { CoachContext } from './types';

const TODAY = '2026-11-04'; // mercredi

const program: Program = generateProgram({
  id: 'p1',
  now: '2026-10-01T08:00:00.000Z',
  profile: {
    experience: '3to6m',
    training: {
      equipment: ['dumbbells', 'bench', 'barbell', 'plates', 'cables', 'machines', 'pullupBar'],
      sessionMinutes: { min: 60, max: 90 },
      likedExercises: [],
      avoidedExercises: [],
      noUnassistedFreeBench: true,
    },
  },
}).program;

function workout(id: string, date: string, loadKg: number, reps = [10, 10, 10], templateKey: 'A' | 'B' = 'A'): Workout {
  const base = createWorkout({ id, program, templateKey, date, now: `${date}T10:00:00.000Z`, light: false, history: [] });
  return {
    ...base,
    status: 'completed',
    finishedAt: `${date}T11:00:00.000Z`,
    sessionRpe: 7,
    exercises: base.exercises.map((exercise) => ({
      ...exercise,
      sets: reps.map((value) => ({ reps: value, loadKg: exercise.slot.exerciseId.includes('push-up') ? null : loadKg, rir: 2, done: true })),
    })),
  };
}

const session = (overrides: Partial<PlannedGymSession> = {}): PlannedGymSession => ({
  date: TODAY,
  templateKey: 'A',
  optional: false,
  startTime: '18:00',
  availableMinutes: null,
  light: false,
  notes: [],
  ...overrides,
});

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
  createdAt: `${TODAY}T07:00:00Z`,
  updatedAt: `${TODAY}T07:00:00Z`,
  ...overrides,
});

/** Contexte vide : aucun profil, aucune donnée. */
function emptyContext(overrides: Partial<CoachContext> = {}): CoachContext {
  return {
    today: TODAY,
    firstName: null,
    goal: null,
    startDate: null,
    program: null,
    workouts: [],
    week: null,
    planChanges: [],
    day: { isMatchDay: false, matchTomorrow: false, matchYesterday: null, vacation: false, activities: [] },
    readiness: { level: 'need-info', reasons: [], advice: [], missing: [], hasCheckIn: false, template: null, plannedToday: false },
    thresholds: DEFAULT_THRESHOLDS,
    checkIns: [],
    weights: [],
    measurements: [],
    photoDates: [],
    drinks: [],
    hydrationBaseMl: 2000,
    activityLogs: [],
    motivation: [],
    state: { reviewSeenUntil: null, dismissed: [] },
    ...overrides,
  };
}

/** Utilisateur actif : programme, séance prévue aujourd'hui, bonne forme. */
function activeContext(overrides: Partial<CoachContext> = {}): CoachContext {
  return emptyContext({
    firstName: 'Alex',
    goal: { type: 'athletic', targetDate: '2027-06-30' },
    startDate: '2026-10-01',
    program,
    workouts: [workout('w1', '2026-10-28', 20), workout('w2', '2026-11-01', 22, [10, 10, 10], 'B')],
    week: { sessions: [session(), session({ date: '2026-11-06', templateKey: 'B' })], explanations: ['2 séances placées sur tes disponibilités.'], excludedDays: [] },
    readiness: {
      level: 'normal',
      reasons: [],
      advice: ['Échauffe-toi bien.'],
      missing: [],
      hasCheckIn: true,
      template: { key: 'A', name: 'Séance A — Haut du corps' },
      plannedToday: true,
    },
    checkIns: [checkIn()],
    weights: [
      { date: '2026-10-01', value: 58 },
      { date: '2026-11-01', value: 58.9 },
    ],
    ...overrides,
  });
}

const allText = (ctx: CoachContext) =>
  [
    ...proactiveMessages(ctx).flatMap((message) => [message.title, message.text]),
    ...INTENT_IDS.flatMap((id) => answerIntent(id, ctx).lines),
    greeting(ctx).text,
  ].join(' ');

describe('messages', () => {
  it('message d’accueil court et personnalisé, fondé sur des données réelles', () => {
    expect(greeting(activeContext())).toEqual({ title: 'Salut Alex !', text: 'J-238 avant ton objectif · 2 séances terminées depuis le début.' });
  });

  it('séance prévue sans check-in → invitation au check-in ; avec check-in → feu vert', () => {
    const without = proactiveMessages(activeContext({ readiness: { ...activeContext().readiness, hasCheckIn: false, level: 'need-info' }, checkIns: [] }));
    expect(without.find((message) => message.kind === 'session')).toMatchObject({
      id: `checkin:${TODAY}`,
      action: { to: '/recuperation/check-in?seance=A' },
    });
    const ready = proactiveMessages(activeContext());
    expect(ready.map((message) => message.title)).toContain('C’est parti 💪');
  });

  it('chaque message dit sur quelles données il s’appuie, et reste court', () => {
    const messages = proactiveMessages(activeContext({ photoDates: ['2026-10-02'], weights: [{ date: '2026-10-01', value: 58 }] }));
    expect(messages.length).toBeGreaterThan(1);
    for (const message of messages) {
      expect(message.basedOn.length).toBeGreaterThan(0);
      expect(message.text.length).toBeLessThanOrEqual(180);
    }
  });

  it('séance terminée aujourd’hui : félicitations et records réellement battus', () => {
    const ctx = activeContext({ workouts: [workout('w1', '2026-10-28', 20), workout('w3', TODAY, 24)] });
    const [first] = proactiveMessages(ctx).filter((message) => message.kind === 'celebration');
    expect(first?.title).toBe('Nouveau record 🔥');
    expect(first?.text).toMatch(/24 kg × 10/);
    expect(proactiveMessages(ctx).some((message) => message.id.startsWith('go:'))).toBe(false);
  });

  it('jamais de reproche ni de rattrapage, même après une longue pause', () => {
    const ctx = activeContext({ workouts: [workout('w1', '2026-10-10', 20)], week: { sessions: [], explanations: [], excludedDays: [] } });
    const restart = proactiveMessages(ctx).find((message) => message.kind === 'regularity');
    expect(restart?.text).toMatch(/rien à rattraper/);
    expect(allText(ctx)).not.toMatch(/dommage|tu aurais dû|honte|paresse|échec|décevant|rattrape (la|ta|tes)|double séance/i);
  });

  it('un message masqué ne revient pas le même jour', () => {
    const ctx = activeContext();
    const state = dismissMessage(ctx.state, `go:${TODAY}`, TODAY);
    expect(proactiveMessages({ ...ctx, state }).some((message) => message.id === `go:${TODAY}`)).toBe(false);
  });

  it('motivation basse : cite la note écrite par l’utilisateur', () => {
    const ctx = activeContext({
      checkIns: [checkIn({ motivation: 2 })],
      motivation: [{ id: 'm', date: '2026-10-05', motivation: 9, text: 'Être prêt pour la saison', createdAt: '2026-10-05T08:00:00Z' }],
    });
    expect(proactiveMessages(ctx).find((message) => message.kind === 'motivation')?.text).toContain('« Être prêt pour la saison »');
  });
});

describe('données absentes', () => {
  it('sans profil ni données : aucune performance inventée, aucun message de séance', () => {
    const ctx = emptyContext();
    expect(greeting(ctx).text).toBe('Complète ton profil pour que je puisse t’accompagner.');
    expect(proactiveMessages(ctx)).toEqual([]);
    expect(answerIntent('progress', ctx).lines).toEqual([
      'Pas encore assez de données pour parler de progression : il faut des séances terminées, ou au moins deux pesées ou mensurations.',
    ]);
    expect(answerIntent('records', ctx).lines[0]).toMatch(/Aucune séance terminée/);
    expect(answerIntent('recent-exercises', ctx).lines).toEqual(['Aucune séance terminée ces 14 derniers jours.']);
    expect(answerIntent('recovery', ctx).lines[0]).toMatch(/pas de données de sommeil/);
    expect(allText(ctx)).not.toMatch(/\d+ kg|record battu/);
  });

  it('une seule pesée : pas d’évolution calculée', () => {
    const ctx = activeContext({ weights: [{ date: '2026-11-01', value: 58.9 }], workouts: [] });
    expect(answerIntent('progress', ctx).lines.join(' ')).not.toMatch(/Poids/);
  });

  it('pas de programme : pas d’objectif de séances inventé', () => {
    const goals = weeklyGoals(emptyContext());
    expect(goals.map((goal) => goal.id)).toEqual(['checkins', 'hydration']);
    expect(answerIntent('week-goals', emptyContext()).lines[0]).toBe('Pas de séance de musculation planifiée cette semaine.');
  });

  it('bilan : moyennes uniquement sur les jours renseignés, aucune évolution avec une seule mesure', () => {
    const ctx = activeContext({
      checkIns: [checkIn({ date: '2026-10-02', sleepHours: 7, energy: null }), checkIn({ date: '2026-10-03', sleepHours: 8, energy: null })],
      weights: [{ date: '2026-10-02', value: 58 }],
    });
    const [period] = completedPeriods(ctx.startDate, TODAY).slice(-1);
    if (!period) throw new Error('période attendue');
    const review = buildReview(ctx, period);
    expect(review.checkIns).toEqual({ count: 2, sleep: { value: 7.5, count: 2 }, energy: null });
    expect(review.weight).toBeNull();
    expect(review.headline).not.toMatch(/dommage|échec/i);
  });
});

describe('recommandations contradictoires', () => {
  it('séance prévue mais repos conseillé par le check-in : le repos l’emporte, aucun message qui pousse', () => {
    const ctx = activeContext({
      readiness: {
        ...activeContext().readiness,
        level: 'rest',
        reasons: [{ level: 'rest', observation: 'Douleur forte (7/10) aux genoux', effect: 'repos conseillé' }],
      },
      workouts: [workout('w1', '2026-10-10', 20)],
    });
    const messages = proactiveMessages(ctx);
    expect(messages[0]).toMatchObject({ kind: 'safety', title: 'Repos aujourd’hui' });
    expect(messages.some((message) => message.push)).toBe(false);
    expect(answerIntent('today', ctx).lines).toContain('Mon conseil : repos conseillé.');
  });

  it('jour de match avec une séance encore au planning : pas de muscu, pas de feu vert', () => {
    const ctx = activeContext({
      day: { ...activeContext().day, isMatchDay: true, activities: [{ kind: 'match', title: 'Match', startTime: '15:00' }] },
    });
    const messages = proactiveMessages(ctx);
    expect(messages.some((message) => message.title === 'Jour de match 🏀')).toBe(true);
    expect(messages.some((message) => message.push)).toBe(false);
    expect(answerIntent('after-match', ctx).lines[0]).toMatch(/pas de musculation le jour d’un match/);
  });

  it('record battu mais douleur signalée : félicitations sans pousser à s’entraîner', () => {
    const ctx = activeContext({
      workouts: [workout('w1', '2026-10-28', 20), workout('w3', TODAY, 24)],
      readiness: { ...activeContext().readiness, level: 'light', reasons: [{ level: 'light', observation: 'Douleur aux épaules', effect: 'activité légère' }] },
    });
    const kinds = proactiveMessages(ctx).map((message) => message.kind);
    expect(kinds[0]).toBe('safety');
    expect(kinds).toContain('celebration');
    expect(proactiveMessages(ctx).some((message) => message.push)).toBe(false);
  });

  it('séance allégée par le planning et check-in normal : la version allégée est conservée', () => {
    const ctx = activeContext({ week: { sessions: [session({ light: true })], explanations: [], excludedDays: [] } });
    const go = proactiveMessages(ctx).find((message) => message.id === `go:${TODAY}`);
    expect(go?.text).toMatch(/Version allégée conseillée/);
  });

  it('lendemain de match intense : la réponse suit la règle du moteur de récupération', () => {
    const ctx = activeContext({
      day: { ...activeContext().day, matchYesterday: { intensity: 9 } },
      readiness: { ...activeContext().readiness, level: 'adapted', reasons: [{ level: 'adapted', observation: 'Match intense hier (9/10)', effect: 'séance allégée' }] },
    });
    const lines = answerIntent('after-match', ctx).lines;
    expect(lines[0]).toBe('Match intense hier (9/10) : séance allégée aujourd’hui.');
    expect(lines[1]).toBe('Mon conseil du jour : séance adaptée (version allégée).');
  });
});

describe('questions', () => {
  it('reconnaît les questions prévues, y compris formulées librement', () => {
    for (const id of INTENT_IDS) expect(matchIntent(INTENTS[id].question)).toBe(id);
    expect(matchIntent('je peux faire de la muscu apres le MATCH de samedi')).toBe('after-match');
    expect(matchIntent('Pourquoi ma séance de jeudi a changé aujourd’hui ?')).toBe('why-changed');
    expect(matchIntent('j’ai mal au genou depuis le match')).toBe('pain');
  });

  it('une question non prise en charge est clairement signalée', async () => {
    expect(matchIntent('Quelle est la capitale du Japon ?')).toBeNull();
    expect(matchIntent('Quel est le meilleur joueur NBA ?')).toBeNull();
    expect(matchIntent('On est quel jour de la semaine ?')).toBeNull();
    expect(matchIntent('??')).toBeNull();
    const answer = await localRulesCoach.answer({ text: 'Quelle est la capitale du Japon ?', intent: null }, activeContext());
    expect(answer.intent).toBeNull();
    expect(answer.title).toBe('Je ne sais pas répondre à cette question');
    expect(answer.lines[1]).toMatch(/pas avec une intelligence artificielle/);
  });

  it('douleur : aucun diagnostic, renvoi vers le check-in et un professionnel', () => {
    const lines = answerIntent('pain', activeContext()).lines.join(' ');
    expect(lines).toMatch(/ne peux pas évaluer une douleur/);
    expect(lines).toMatch(/professionnel de santé/);
  });

  it('progression : chiffres mesurés et records réels', () => {
    const ctx = activeContext({ workouts: [workout('w1', '2026-10-20', 20), workout('w2', '2026-10-27', 22), workout('w3', '2026-11-03', 24)] });
    const lines = answerIntent('progress', ctx).lines;
    expect(lines[0]).toBe('Musculation : 3 séances sur les 4 dernières semaines (0 les 4 semaines d’avant).');
    expect(lines.join(' ')).toMatch(/Poids : \+0,9 kg/);
    expect(lines.join(' ')).toMatch(/records? battus? en 4 semaines/);
  });

  it('pourquoi ma séance a changé : raisons du check-in et changements du planning', () => {
    const ctx = activeContext({
      readiness: { ...activeContext().readiness, level: 'adapted', reasons: [{ level: 'adapted', observation: 'Nuit courte (5 h 30)', effect: 'séance allégée' }] },
      planChanges: [{ kind: 'moved', templateKey: 'B', message: 'Séance B déplacée du jeudi au vendredi (match).' }],
    });
    expect(answerIntent('why-changed', ctx).lines).toEqual([
      'Aujourd’hui : séance adaptée (version allégée), à cause de :',
      '• Nuit courte (5 h 30) → séance allégée',
      'Séance B déplacée du jeudi au vendredi (match).',
    ]);
    expect(answerIntent('why-changed', activeContext()).lines[0]).toMatch(/Rien n’a changé/);
  });

  it('aucune IA distante n’est connectée', () => {
    expect(remoteCoachAvailability().available).toBe(false);
  });
});

describe('objectifs et bilans', () => {
  it('objectifs de la semaine tirés du planning et des données de la semaine', () => {
    const ctx = activeContext({ workouts: [workout('w2', '2026-11-03', 22)], drinks: [{ id: 'd', date: '2026-11-03', time: '10:00', ml: 2000, createdAt: 'x' }] });
    expect(weeklyGoals(ctx).map(({ id, done, target }) => [id, done, target])).toEqual([
      ['gym', 1, 2],
      ['checkins', 1, 3],
      ['hydration', 1, 5],
    ]);
  });

  it('un bilan tous les 14 jours depuis la création du profil, signalé une seule fois', () => {
    const ctx = activeContext();
    expect(completedPeriods('2026-10-01', TODAY)).toEqual([
      { start: '2026-10-15', end: '2026-10-28' },
      { start: '2026-10-01', end: '2026-10-14' },
    ]);
    expect(reviewToShow(ctx)?.end).toBe('2026-10-28');
    const seen = { ...ctx, state: markReviewSeen(ctx.state, '2026-10-28') };
    expect(reviewToShow(seen)).toBeNull();
    expect(completedPeriods('2026-10-25', TODAY)).toEqual([]);
  });

  it('bilan : séances, records et basket de la période', () => {
    const ctx = activeContext({
      workouts: [workout('w1', '2026-10-16', 20), workout('w2', '2026-10-20', 22), workout('w3', '2026-10-30', 30)],
      activityLogs: [
        { id: 'a', activityId: 'x', kind: 'match', date: '2026-10-18', played: true, intensity: 8, minutesPlayed: null, points: null, rebounds: null, assists: null, notes: '', updatedAt: 'x' },
      ],
    });
    const review = buildReview(ctx, { start: '2026-10-15', end: '2026-10-28' });
    expect(review.workouts.completed).toBe(2);
    expect(review.basketball).toEqual({ practices: 0, matches: 1 });
    expect(review.records.every((record) => record.date === '2026-10-20')).toBe(true);
    expect(review.headline).toMatch(/records? battus?/);
  });

  it('état du coach : valeurs abîmées ignorées', () => {
    expect(withCoachDefaults({ reviewSeenUntil: 'hier', dismissed: [{ id: 1 }, { id: 'a', date: '2026-11-01' }] })).toEqual({
      reviewSeenUntil: null,
      dismissed: [{ id: 'a', date: '2026-11-01' }],
    });
  });
});
