import { describe, expect, it } from 'vitest';
import type { Profile } from '../profile/types';
import { EQUIPMENT } from '../profile/types';
import { EXERCISES, alternativesFor, getExercise, matchesAvoided } from './exercises';
import { estimateMinutes, generateProgram, programExerciseIds, templateLegDemand } from './program';
import { PROGRESSION_RULES, computeTarget, type Exposure } from './progression';
import { computeRecords, newRecordsIn } from './records';
import { adviseSession, nextCoreTemplate, weekStart, weekStatuses, weekdayOf } from './schedule';
import type { ExerciseSlot, LoggedSet, Program, Workout } from './types';
import { buildWarmup } from './warmup';
import { createWorkout, exposuresFor, lastCompletedCoreKey, summarizeWorkout, validateSet } from './workout';

const FULL_GYM: Profile['training']['equipment'] = ['dumbbells', 'bench', 'barbell', 'plates', 'cables', 'machines', 'pullupBar'];

function trainingProfile(overrides: Partial<Profile['training']> = {}, experience: Profile['experience'] = '3to6m') {
  return {
    experience,
    training: {
      equipment: FULL_GYM,
      sessionMinutes: { min: 60, max: 90 },
      likedExercises: [],
      avoidedExercises: [],
      noUnassistedFreeBench: true,
      ...overrides,
    },
  };
}

const program = (overrides: Partial<Profile['training']> = {}, experience?: Profile['experience']) =>
  generateProgram({ id: 'p1', now: '2026-10-20T08:00:00.000Z', profile: trainingProfile(overrides, experience) }).program;

describe('bibliothèque d’exercices', () => {
  it('a des identifiants uniques et des fiches complètes', () => {
    const ids = EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const exercise of EXERCISES) {
      expect(exercise.technique.length, exercise.id).toBeGreaterThan(0);
      expect(exercise.safety.length, exercise.id).toBeGreaterThan(0);
      expect(exercise.equipment.every((item) => EQUIPMENT.includes(item)), exercise.id).toBe(true);
      if (exercise.loadType === 'external') expect(exercise.loadIncrementKg, exercise.id).toBeGreaterThan(0);
    }
  });

  it('garde des identifiants stables (référencés par l’historique)', () => {
    // Si ce test échoue, un identifiant a été renommé : l'historique deviendrait illisible.
    expect(EXERCISES.map((exercise) => exercise.id)).toEqual(
      expect.arrayContaining(['leg-press', 'db-bench-press', 'lat-pulldown', 'db-romanian-deadlift', 'barbell-bench-press']),
    );
  });

  it('reconnaît un exercice à éviter saisi librement', () => {
    const rdl = getExercise('db-romanian-deadlift');
    expect(rdl && matchesAvoided(rdl, ['soulevé de terre'])).toBe(true);
    expect(rdl && matchesAvoided(rdl, ['pompes'])).toBe(false);
    expect(rdl && matchesAvoided(rdl, ['de'])).toBe(false);
  });

  it('propose des alternatives du même mouvement, avec le matériel disponible', () => {
    const options = { equipment: ['dumbbells', 'bench'] as const, avoidedExercises: [], noUnassistedFreeBench: true, allowIntermediate: true };
    const alternatives = alternativesFor('db-bench-press', { ...options, equipment: [...options.equipment] }).map((e) => e.id);
    expect(alternatives).toContain('incline-db-press');
    expect(alternatives).toContain('push-up');
    expect(alternatives).not.toContain('machine-chest-press');
    expect(alternatives).not.toContain('barbell-bench-press');
  });
});

describe('génération du programme', () => {
  it('produit 2 séances principales et une 3e facultative sans jambes', () => {
    const generated = program();
    expect(generated.templates.map((t) => [t.key, t.optional])).toEqual([
      ['A', false],
      ['B', false],
      ['C', true],
    ]);
    const c = generated.templates.find((t) => t.key === 'C');
    expect(c && templateLegDemand(c)).toBe('none');
  });

  it('exclut le développé couché libre quand c’est demandé', () => {
    expect(programExerciseIds(program({ noUnassistedFreeBench: true }))).not.toContain('barbell-bench-press');
  });

  it('respecte le matériel disponible', () => {
    const generated = program({ equipment: ['dumbbells', 'bench'] });
    for (const id of programExerciseIds(generated)) {
      const exercise = getExercise(id);
      expect(exercise?.equipment.every((item) => ['dumbbells', 'bench'].includes(item)), id).toBe(true);
    }
  });

  it('exclut les exercices à éviter et préfère les exercices aimés', () => {
    const ids = programExerciseIds(program({ avoidedExercises: ['presse'], likedExercises: ['squat gobelet'] }));
    expect(ids).not.toContain('leg-press');
    expect(ids).toContain('goblet-squat');
  });

  it('signale un mouvement impossible à couvrir au lieu d’inventer un exercice', () => {
    const { warnings } = generateProgram({
      id: 'p',
      now: 'x',
      profile: trainingProfile({ equipment: [], avoidedExercises: ['pompes'] }),
    });
    expect(warnings.some((warning) => warning.includes('poussée horizontale'))).toBe(true);
  });

  it('tient dans la durée maximale choisie en retirant des exercices accessoires', () => {
    const generated = program({ sessionMinutes: { min: 30, max: 45 } });
    for (const template of generated.templates) {
      expect(estimateMinutes(template.slots), template.key).toBeLessThanOrEqual(45);
      expect(template.slots.some((slot) => slot.role === 'main')).toBe(true);
    }
    expect(generated.rationale.some((line) => line.includes('retiré'))).toBe(true);
  });

  it('ne fixe aucune charge de départ inventée', () => {
    expect(program().templates.flatMap((t) => t.slots).every((slot) => slot.startLoadKg === null)).toBe(true);
  });

  it('vise toujours des répétitions en réserve (jamais l’échec)', () => {
    for (const experience of ['none', '3to6m', 'gt2y'] as const) {
      expect(program({}, experience).templates.flatMap((t) => t.slots).every((slot) => slot.targetRir >= 2)).toBe(true);
    }
  });

  it('est déterministe', () => {
    expect(program()).toEqual(program());
  });
});

const slot = (overrides: Partial<ExerciseSlot> = {}): ExerciseSlot => ({
  exerciseId: 'db-bench-press',
  sets: 3,
  repMin: 8,
  repMax: 10,
  restSeconds: 120,
  targetRir: 2,
  startLoadKg: null,
  role: 'main',
  ...overrides,
});

const sets = (reps: number[], loadKg: number | null, rir: number | null = 2): LoggedSet[] =>
  reps.map((value) => ({ reps: value, loadKg, rir, done: true }));

const exposure = (overrides: Partial<Exposure> = {}): Exposure => ({
  date: '2026-10-15',
  light: false,
  pain: false,
  sessionRpe: 7,
  repMin: 8,
  repMax: 10,
  plannedSets: 3,
  sets: sets([10, 10, 10], 20),
  ...overrides,
});

const bench = getExercise('db-bench-press');
if (!bench) throw new Error('exercice manquant');
const TODAY = '2026-10-20';

describe('progression', () => {
  it('n’invente pas de charge de départ : charge à déterminer', () => {
    const target = computeTarget(slot(), bench, [], TODAY);
    expect(target.decision).toBe('calibrate');
    expect(target.loadKg).toBeNull();
    expect(target.note).toContain('réserve');
  });

  it('utilise la charge de départ choisie par l’utilisateur', () => {
    expect(computeTarget(slot({ startLoadKg: 16 }), bench, [], TODAY)).toMatchObject({ decision: 'start', loadKg: 16 });
  });

  it('augmente du plus petit incrément quand tout le haut de fourchette est atteint avec marge', () => {
    const target = computeTarget(slot(), bench, [exposure()], TODAY);
    expect(target).toMatchObject({ decision: 'increase-load', loadKg: 22, repMin: 8 });
  });

  it('ajoute des répétitions avant la charge quand la fourchette n’est pas encore au maximum', () => {
    const target = computeTarget(slot(), bench, [exposure({ sets: sets([10, 9, 8], 20) })], TODAY);
    expect(target).toMatchObject({ decision: 'add-reps', loadKg: 20 });
  });

  it('n’augmente JAMAIS la charge après une douleur, et la réduit', () => {
    const target = computeTarget(slot(), bench, [exposure({ pain: true })], TODAY);
    expect(target.decision).toBe('pain');
    expect(target.loadKg).toBeLessThan(20);
    expect(target.note).toContain('professionnel de santé');
  });

  it('n’augmente pas la charge si les répétitions en réserve ne sont pas renseignées', () => {
    const target = computeTarget(slot(), bench, [exposure({ sets: sets([10, 10, 10], 20, null) })], TODAY);
    expect(target).toMatchObject({ decision: 'hold', loadKg: 20 });
    expect(target.note).toContain('réserve');
  });

  it('n’augmente pas la charge après une série à l’échec', () => {
    const failing = [...sets([10, 10], 20), { reps: 10, loadKg: 20, rir: 0, done: true }];
    expect(computeTarget(slot(), bench, [exposure({ sets: failing })], TODAY).decision).toBe('hold');
  });

  it('n’augmente pas la charge après une séance jugée très difficile', () => {
    expect(computeTarget(slot(), bench, [exposure({ sessionRpe: PROGRESSION_RULES.hardSessionRpe })], TODAY).decision).toBe('hold');
  });

  it('ne progresse pas à partir d’une séance allégée', () => {
    expect(computeTarget(slot(), bench, [exposure({ light: true })], TODAY)).toMatchObject({ decision: 'hold', loadKg: 20 });
  });

  it('ne progresse pas après une séance incomplète', () => {
    expect(computeTarget(slot(), bench, [exposure({ sets: sets([10, 10], 20) })], TODAY).decision).toBe('hold');
  });

  it('réduit légèrement la charge après deux séances sous la fourchette', () => {
    const under = exposure({ sets: sets([7, 6, 6], 20) });
    const target = computeTarget(slot(), bench, [under, { ...under, date: '2026-10-12' }], TODAY);
    expect(target.decision).toBe('reduce');
    expect(target.loadKg).toBe(18);
  });

  it('garde la charge après une seule séance sous la fourchette', () => {
    expect(computeTarget(slot(), bench, [exposure({ sets: sets([7, 6, 6], 20) })], TODAY).decision).toBe('hold');
  });

  it('réduit la charge à la reprise après une longue interruption', () => {
    expect(computeTarget(slot(), bench, [exposure({ date: '2026-10-01' })], TODAY)).toMatchObject({ decision: 'reentry', loadKg: 18 });
    expect(computeTarget(slot(), bench, [exposure({ date: '2026-09-01' })], TODAY)).toMatchObject({ decision: 'reentry', loadKg: 16 });
  });

  it('redemande la charge si elle n’a pas été notée', () => {
    expect(computeTarget(slot(), bench, [exposure({ sets: sets([10, 10, 10], null) })], TODAY).decision).toBe('calibrate');
  });

  it('au poids du corps, progresse en répétitions puis propose une variante', () => {
    const pushUp = getExercise('push-up');
    if (!pushUp) throw new Error();
    expect(computeTarget(slot({ exerciseId: 'push-up' }), pushUp, [], TODAY).decision).toBe('start');
    const top = computeTarget(slot({ exerciseId: 'push-up' }), pushUp, [exposure({ sets: sets([10, 10, 10], null) })], TODAY);
    expect(top).toMatchObject({ decision: 'add-reps', loadKg: null });
    expect(top.note).toContain('variante');
  });
});

describe('semaine et rotation', () => {
  const generated = program();

  it('marque une séance passée non faite comme manquée, sans rattrapage', () => {
    const sessions = [
      { date: '2026-10-19', templateKey: 'A' as const },
      { date: '2026-10-20', templateKey: 'B' as const },
      { date: '2026-10-22', templateKey: 'A' as const },
    ];
    expect([...weekStatuses(sessions, TODAY, []).values()]).toEqual(['missed', 'today', 'upcoming']);
    // Séance A faite mardi au lieu de lundi : elle compte comme faite.
    const statuses = weekStatuses(sessions, TODAY, [{ date: TODAY, templateKey: 'A' }]);
    expect(statuses.get('2026-10-19')).toBe('done');
    expect(statuses.get('2026-10-20')).toBe('today');
    expect(statuses.get('2026-10-22')).toBe('upcoming');
  });

  it('calcule les jours de la semaine', () => {
    expect(weekdayOf('2026-10-19')).toBe(0);
    expect(weekdayOf('2026-10-25')).toBe(6);
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
  });

  it('alterne A et B selon la dernière séance faite', () => {
    expect(nextCoreTemplate(generated, null)).toBe('A');
    expect(nextCoreTemplate(generated, 'A')).toBe('B');
    expect(nextCoreTemplate(generated, 'B')).toBe('A');
  });
});

describe('conseil avant séance (situations à risque)', () => {
  it('conseille le repos un jour de match ou en cas de douleur', () => {
    expect(adviseSession({ isMatchDay: true, isDayBeforeMatch: false, legSession: false, feeling: 'good' }).mode).toBe('rest');
    expect(adviseSession({ isMatchDay: false, isDayBeforeMatch: false, legSession: false, feeling: 'pain' }).mode).toBe('rest');
  });

  it('allège la veille d’un match pour une séance de jambes, ou en cas de fatigue', () => {
    expect(adviseSession({ isMatchDay: false, isDayBeforeMatch: true, legSession: true, feeling: 'good' }).mode).toBe('light');
    expect(adviseSession({ isMatchDay: false, isDayBeforeMatch: false, legSession: false, feeling: 'tired' }).mode).toBe('light');
    expect(adviseSession({ isMatchDay: false, isDayBeforeMatch: true, legSession: false, feeling: 'good' }).mode).toBe('normal');
  });
});

function completedWorkout(id: string, date: string, loadKg: number, reps: number[], templateKey: 'A' | 'B' = 'A'): Workout {
  const generated = program();
  const workout = createWorkout({ id, program: generated, templateKey, date, now: `${date}T10:00:00.000Z`, light: false, history: [] });
  return {
    ...workout,
    status: 'completed',
    finishedAt: `${date}T11:00:00.000Z`,
    sessionRpe: 7,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: reps.map((value) => ({ reps: value, loadKg: exercise.slot.exerciseId.includes('push-up') ? null : loadKg, rir: 2, done: true })),
    })),
  };
}

describe('séances et historique', () => {
  it('prépare une séance avec un objectif expliqué par exercice', () => {
    const workout = createWorkout({ id: 'w', program: program(), templateKey: 'A', date: TODAY, now: 'n', light: false, history: [] });
    expect(workout.status).toBe('in-progress');
    expect(workout.exercises.length).toBeGreaterThan(3);
    expect(workout.exercises.every((exercise) => exercise.targetNote.length > 0)).toBe(true);
    expect(workout.exercises.every((exercise) => exercise.target.loadKg === null)).toBe(true);
  });

  it('applique la progression à partir de l’historique réel', () => {
    const history = [completedWorkout('w1', '2026-10-15', 20, [10, 10, 10])];
    const workout = createWorkout({ id: 'w2', program: program(), templateKey: 'A', date: TODAY, now: 'n', light: false, history });
    const press = workout.exercises.find((exercise) => exercise.exerciseId === 'db-bench-press');
    expect(press?.target.loadKg).toBe(22);
  });

  it('une séance allégée retire une série et ne monte pas la charge', () => {
    const history = [completedWorkout('w1', '2026-10-15', 20, [10, 10, 10])];
    const workout = createWorkout({ id: 'w2', program: program(), templateKey: 'A', date: TODAY, now: 'n', light: true, history });
    const press = workout.exercises.find((exercise) => exercise.exerciseId === 'db-bench-press');
    expect(press?.target).toMatchObject({ loadKg: 20, sets: 2 });
  });

  it('ignore les séances non terminées dans l’historique de progression', () => {
    const abandoned = { ...completedWorkout('w1', '2026-10-15', 20, [10, 10, 10]), status: 'abandoned' as const };
    expect(exposuresFor('db-bench-press', [abandoned])).toEqual([]);
  });

  it('retrouve la dernière séance principale pour la rotation', () => {
    const history = [completedWorkout('w1', '2026-10-13', 20, [8, 8, 8], 'A'), completedWorkout('w2', '2026-10-15', 20, [8, 8, 8], 'B')];
    expect(lastCompletedCoreKey(program(), history)).toBe('B');
  });

  it('résume une séance', () => {
    const summary = summarizeWorkout(completedWorkout('w1', '2026-10-15', 20, [10, 10]));
    expect(summary.setsDone).toBeGreaterThan(0);
    expect(summary.durationMinutes).toBe(60);
  });

  it('valide les séries saisies', () => {
    expect(validateSet({ reps: null, loadKg: 20, rir: null, done: true }, 'external')).toBeDefined();
    expect(validateSet({ reps: 8, loadKg: null, rir: null, done: true }, 'external')).toBeDefined();
    expect(validateSet({ reps: 8, loadKg: null, rir: 2, done: true }, 'bodyweight')).toBeUndefined();
    expect(validateSet({ reps: 8, loadKg: 20, rir: 11, done: true }, 'external')).toBeDefined();
  });
});

describe('records personnels', () => {
  it('ne compte que les séries réellement enregistrées', () => {
    const records = computeRecords([completedWorkout('w1', '2026-10-15', 20, [10, 8])]);
    expect(records.get('db-bench-press')?.heaviest).toMatchObject({ loadKg: 20, reps: 10 });
    expect(computeRecords([{ ...completedWorkout('w1', '2026-10-15', 20, [10]), status: 'in-progress' }]).size).toBe(0);
  });

  it('détecte un record battu, mais pas une première réalisation', () => {
    const first = completedWorkout('w1', '2026-10-13', 20, [10, 10, 10]);
    expect(newRecordsIn(first, [])).toEqual([]);
    const second = completedWorkout('w2', '2026-10-15', 22, [8, 8, 8]);
    const found = newRecordsIn(second, [first]).filter((record) => record.exerciseId === 'db-bench-press');
    expect(found.map((record) => record.kind)).toContain('heaviest');
  });
});

describe('échauffement', () => {
  const template = (key: 'A' | 'C', p: Program = program()) => {
    const found = p.templates.find((t) => t.key === key);
    if (!found) throw new Error();
    return found;
  };

  it('adapte la mobilité à la séance', () => {
    expect(buildWarmup(template('A'), null).map((step) => step.title)).toContain('Mobilité hanches et chevilles');
    expect(buildWarmup(template('C'), null).map((step) => step.title)).toContain('Mobilité des épaules');
  });

  it('monte progressivement sans dépasser la charge de travail', () => {
    const steps = buildWarmup(template('A'), 100);
    expect(steps.at(-1)?.detail).toContain('50 kg');
    expect(steps.at(-1)?.detail).toContain('75 kg');
  });

  it('reste générique quand la charge est inconnue', () => {
    expect(buildWarmup(template('A'), null).at(-1)?.detail).toContain('Charge à déterminer');
  });
});
