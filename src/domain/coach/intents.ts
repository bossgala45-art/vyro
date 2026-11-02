import { addDays } from '../calendar/time';
import { measurementSeries } from '../progress/series';
import { MEASUREMENT_KEYS, type MeasurementKey } from '../progress/types';
import { exerciseName } from '../training/exercises';
import { average, completed, completedBetween, fmt, frDate, plannedToday, recordEvents, sessionsThisWeek, signed } from './facts';
import { weeklyGoals } from './goals';
import type { CoachAnswer, CoachContext } from './types';

export const INTENT_IDS = [
  'today',
  'why-changed',
  'progress',
  'after-match',
  'recent-exercises',
  'records',
  'week-goals',
  'recovery',
  'regularity',
  'pain',
] as const;
export type IntentId = (typeof INTENT_IDS)[number];

interface Intent {
  question: string;
  /** Mots-clés (normalisés) reconnus dans une question libre. */
  keywords: readonly string[];
}

/** Questions auxquelles le coach sait répondre, et seulement celles-ci. */
export const INTENTS: Record<IntentId, Intent> = {
  today: { question: 'Que dois-je faire aujourd’hui ?', keywords: ['aujourd', 'ce soir', 'ce matin', 'faire quoi', 'programme du jour'] },
  'why-changed': { question: 'Pourquoi ma séance a-t-elle changé ?', keywords: ['change', 'pourquoi ma seance', 'modifi', 'deplace', 'allege', 'annule'] },
  progress: { question: 'Comment ai-je progressé ?', keywords: ['progres', 'evolu', 'avance', 'resultat'] },
  'after-match': { question: 'Puis-je m’entraîner après mon match ?', keywords: ['match'] },
  'recent-exercises': { question: 'Quels exercices ai-je réalisés récemment ?', keywords: ['exercice', 'recemment', 'dernieres seances', 'derniere seance', 'historique'] },
  records: { question: 'Quels sont mes records ?', keywords: ['record', 'meilleure perf', 'meilleures perf'] },
  'week-goals': { question: 'Quels sont mes objectifs de la semaine ?', keywords: ['objectif'] },
  recovery: { question: 'Comment mieux récupérer ?', keywords: ['recup', 'fatigu', 'repos', 'courbature', 'sommeil', 'dormi', 'epuise'] },
  regularity: { question: 'Suis-je régulier ?', keywords: ['regul', 'motiv', 'assidu', 'constan'] },
  pain: { question: 'J’ai mal quelque part, que faire ?', keywords: ['mal ', 'mal,', 'douleur', 'blesse', 'blessure', 'tendon', 'entorse'] },
};

export function normalizeQuestion(text: string): string {
  return ` ${text
    .toLocaleLowerCase('fr')
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'?!.;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/**
 * Reconnaît une question libre par mots-clés. Pas de compréhension du langage : si aucun
 * mot-clé ne correspond, la question n'est pas prise en charge (et le coach le dit).
 * La douleur passe avant tout le reste.
 */
export function matchIntent(text: string): IntentId | null {
  const normalized = normalizeQuestion(text);
  if (normalized.trim().length < 3) return null;
  if (INTENTS.pain.keywords.some((keyword) => normalized.includes(keyword))) return 'pain';
  let best: { id: IntentId; score: number } | null = null;
  for (const id of INTENT_IDS) {
    const score = INTENTS[id].keywords.filter((keyword) => normalized.includes(keyword)).length;
    if (score > 0 && (!best || score > best.score)) best = { id, score };
  }
  return best?.id ?? null;
}

export function unsupportedAnswer(question: string): CoachAnswer {
  return {
    title: 'Je ne sais pas répondre à cette question',
    lines: [
      `« ${question.trim().slice(0, 120)} » ne correspond à aucune question que je connais.`,
      'Je fonctionne avec des règles fixes, pas avec une intelligence artificielle : je ne comprends que les questions proposées.',
    ],
    basedOn: [],
    links: [],
  };
}

const LEVEL_TEXT = {
  normal: 'Séance normale',
  adapted: 'Séance adaptée (version allégée)',
  light: 'Activité légère seulement',
  rest: 'Repos conseillé',
  'need-info': 'Il me manque des réponses pour décider',
} as const;

const SHORT: Record<MeasurementKey, string> = { arm: 'Bras', chest: 'Poitrine', shoulders: 'Épaules', waist: 'Taille' };

function today(ctx: CoachContext): CoachAnswer {
  const lines: string[] = [];
  const session = plannedToday(ctx);
  const done = completed(ctx.workouts).some((workout) => workout.date === ctx.today);
  if (ctx.day.activities.length > 0) {
    lines.push(`Au calendrier : ${ctx.day.activities.map((activity) => `${activity.title}${activity.startTime ? ` (${activity.startTime.replace(':', ' h ')})` : ''}`).join(', ')}.`);
  }
  if (done) lines.push('Ta séance du jour est faite ✅ : place à la récupération.');
  else if (session) lines.push(`Musculation prévue : séance ${session.templateKey}${session.startTime ? ` à ${session.startTime.replace(':', ' h ')}` : ''}.`);
  else lines.push('Pas de musculation prévue aujourd’hui.');
  if (!done) {
    lines.push(`Mon conseil : ${LEVEL_TEXT[ctx.readiness.level].toLocaleLowerCase('fr')}.`);
    for (const reason of ctx.readiness.reasons.slice(0, 3)) lines.push(`• ${reason.observation} → ${reason.effect}`);
    if (!ctx.readiness.hasCheckIn) lines.push('Fais ton check-in pour un conseil adapté à ta forme du jour.');
  }
  return {
    title: 'Ta journée',
    lines,
    basedOn: ['calendrier', 'planning', ctx.readiness.hasCheckIn ? 'check-in du jour' : 'aucun check-in aujourd’hui'],
    links: ctx.readiness.hasCheckIn ? [{ label: 'Conseil du jour', to: '/recuperation/aujourdhui' }] : [{ label: 'Faire mon check-in', to: '/recuperation/check-in' }],
  };
}

function whyChanged(ctx: CoachContext): CoachAnswer {
  const lines: string[] = [];
  const session = plannedToday(ctx);
  if (ctx.readiness.hasCheckIn && ctx.readiness.level !== 'normal' && ctx.readiness.level !== 'need-info') {
    lines.push(`Aujourd’hui : ${LEVEL_TEXT[ctx.readiness.level].toLocaleLowerCase('fr')}, à cause de :`);
    for (const reason of ctx.readiness.reasons) lines.push(`• ${reason.observation} → ${reason.effect}`);
  }
  for (const change of ctx.planChanges) lines.push(change.message);
  const excludedToday = ctx.week?.excludedDays.find((day) => day.date === ctx.today);
  if (excludedToday && !session) lines.push(`Pas de séance aujourd’hui : ${excludedToday.reason}.`);
  if (session?.notes.length) lines.push(...session.notes);
  if (lines.length === 0) {
    lines.push('Rien n’a changé dans ton planning depuis ta dernière visite du calendrier.');
    if (ctx.week?.explanations.length) lines.push(...ctx.week.explanations);
    if (!ctx.program) lines.push('Tu n’as pas encore de programme : génère-le dans l’onglet Séances.');
  }
  return { title: 'Pourquoi ce changement', lines, basedOn: ['calendrier', 'disponibilités', 'check-in du jour'], links: [{ label: 'Voir le calendrier', to: '/calendrier' }] };
}

function progress(ctx: CoachContext): CoachAnswer {
  const lines: string[] = [];
  const from = addDays(ctx.today, -27);
  const recent = completedBetween(ctx.workouts, from, ctx.today).length;
  const before = completedBetween(ctx.workouts, addDays(from, -28), addDays(from, -1)).length;
  if (recent + before > 0) lines.push(`Musculation : ${recent} séance${recent > 1 ? 's' : ''} sur les 4 dernières semaines (${before} les 4 semaines d’avant).`);
  const records = recordEvents(ctx.workouts).filter((record) => record.date >= from);
  if (records.length > 0) {
    lines.push(`${records.length} record${records.length > 1 ? 's' : ''} battu${records.length > 1 ? 's' : ''} en 4 semaines, dont :`);
    for (const record of records.slice(-3).reverse()) lines.push(`• ${record.name} : ${record.description} (${frDate(record.date)})`);
  }
  const first = ctx.weights[0];
  const last = ctx.weights[ctx.weights.length - 1];
  if (first && last && ctx.weights.length >= 2) {
    lines.push(`Poids : ${signed(Math.round((last.value - first.value) * 10) / 10, 'kg')} entre le ${frDate(first.date)} et le ${frDate(last.date)} (mesuré).`);
  }
  for (const key of MEASUREMENT_KEYS) {
    const points = measurementSeries(ctx.measurements, key);
    const a = points[0];
    const b = points[points.length - 1];
    if (a && b && points.length >= 2) lines.push(`${SHORT[key]} : ${signed(Math.round((b.value - a.value) * 10) / 10, 'cm')} depuis le ${frDate(a.date)}.`);
  }
  if (lines.length === 0) {
    lines.push('Pas encore assez de données pour parler de progression : il faut des séances terminées, ou au moins deux pesées ou mensurations.');
  }
  return { title: 'Ta progression', lines, basedOn: ['séances terminées', 'records', 'pesées', 'mensurations'], links: [{ label: 'Onglet Progrès', to: '/progres' }] };
}

function afterMatch(ctx: CoachContext): CoachAnswer {
  const lines: string[] = [];
  const intense = ctx.thresholds.intenseMatch;
  if (ctx.day.isMatchDay) {
    lines.push('Match aujourd’hui : pas de musculation le jour d’un match (règle VYRO).');
    lines.push('Après le match : repas avec féculents et protéines, hydratation, sommeil. La muscu reprend un autre jour.');
  } else if (ctx.day.matchYesterday) {
    const { intensity } = ctx.day.matchYesterday;
    if (intensity === null) {
      lines.push('Match hier, intensité non notée : note-la dans le suivi basket pour un conseil précis.');
    } else if (intensity >= intense) {
      lines.push(`Match intense hier (${intensity}/10) : séance allégée aujourd’hui.`);
    } else {
      lines.push(`Match hier (${intensity}/10) : tu peux t’entraîner si ton check-in est bon.`);
    }
    lines.push(`Mon conseil du jour : ${LEVEL_TEXT[ctx.readiness.level].toLocaleLowerCase('fr')}.`);
  } else {
    lines.push('Aucun match hier ni aujourd’hui dans ton calendrier.');
  }
  lines.push(`Règles VYRO : jour de match → pas de muscu ; lendemain d’un match noté ${intense}/10 ou plus → séance allégée ; veille de match → pas de séance de jambes.`);
  return { title: 'Muscu et matchs', lines, basedOn: ['calendrier', 'suivi basket', 'check-in du jour'], links: [{ label: 'Suivi basket', to: '/calendrier/basket' }] };
}

function recentExercises(ctx: CoachContext): CoachAnswer {
  const workouts = completedBetween(ctx.workouts, addDays(ctx.today, -13), ctx.today);
  if (workouts.length === 0) {
    return { title: 'Exercices récents', lines: ['Aucune séance terminée ces 14 derniers jours.'], basedOn: ['séances terminées'], links: [{ label: 'Historique', to: '/entrainement/historique' }] };
  }
  const byExercise = new Map<string, { sessions: number; last: string; best: string | null }>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const sets = exercise.sets.filter((set) => set.done);
      if (exercise.skipped || sets.length === 0) continue;
      const top = [...sets].sort((a, b) => (b.loadKg ?? 0) - (a.loadKg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
      const current = byExercise.get(exercise.exerciseId);
      byExercise.set(exercise.exerciseId, {
        sessions: (current?.sessions ?? 0) + 1,
        last: workout.date,
        best: top ? `${top.loadKg !== null ? `${fmt(top.loadKg, 'kg')} × ` : ''}${top.reps ?? '?'}` : (current?.best ?? null),
      });
    }
  }
  const lines = [`${workouts.length} séance${workouts.length > 1 ? 's' : ''} en 14 jours :`];
  for (const [id, info] of byExercise) {
    lines.push(`• ${exerciseName(id)} : ${info.sessions} fois, dernière le ${frDate(info.last)}${info.best ? ` (meilleure série ${info.best})` : ''}`);
  }
  return { title: 'Exercices récents', lines, basedOn: ['séances terminées des 14 derniers jours'], links: [{ label: 'Historique', to: '/entrainement/historique' }] };
}

function records(ctx: CoachContext): CoachAnswer {
  const events = recordEvents(ctx.workouts);
  if (events.length === 0) {
    const done = completed(ctx.workouts).length;
    return {
      title: 'Tes records',
      lines: [done === 0 ? 'Aucune séance terminée pour l’instant : tes premières séances serviront de référence.' : 'Pas encore de record battu : tes premières séances servent de référence, les records viendront.'],
      basedOn: ['séances terminées'],
      links: [{ label: 'Mes références', to: '/entrainement/records' }],
    };
  }
  return {
    title: 'Tes derniers records',
    lines: events.slice(-5).reverse().map((record) => `• ${record.name} : ${record.description} (${frDate(record.date)})`),
    basedOn: ['séances terminées'],
    links: [{ label: 'Tous mes records', to: '/entrainement/records' }],
  };
}

function weekGoals(ctx: CoachContext): CoachAnswer {
  const goals = weeklyGoals(ctx);
  const lines = goals.map((goal) => `• ${goal.label} : ${goal.done}/${goal.target}${goal.done >= goal.target ? ' ✅' : ''}`);
  if (!goals.some((goal) => goal.id === 'gym')) lines.unshift('Pas de séance de musculation planifiée cette semaine.');
  return { title: 'Objectifs de la semaine', lines, basedOn: ['planning', 'check-ins', 'hydratation'], links: [] };
}

function recovery(ctx: CoachContext): CoachAnswer {
  const lines: string[] = [];
  const week = ctx.checkIns.filter((checkIn) => checkIn.date > addDays(ctx.today, -7));
  const sleep = average(week.map((checkIn) => checkIn.sleepHours));
  if (sleep) {
    lines.push(
      sleep.value < ctx.thresholds.shortSleepHours
        ? `Sommeil moyen sur 7 jours : ${fmt(sleep.value, 'h')} (${sleep.count} nuits notées). C’est le premier levier : vise des nuits plus longues.`
        : `Sommeil moyen sur 7 jours : ${fmt(sleep.value, 'h')} (${sleep.count} nuits notées). Continue comme ça.`,
    );
  } else {
    lines.push('Je n’ai pas de données de sommeil cette semaine : les check-ins me les donnent.');
  }
  lines.push(...ctx.readiness.advice.slice(0, 2));
  lines.push('Repères généraux : boire régulièrement, un repas avec protéines après l’effort, et au moins un jour sans sport intense par semaine.');
  return { title: 'Récupération', lines, basedOn: ['check-ins des 7 derniers jours', 'conseil du jour'], links: [{ label: 'Récupération', to: '/recuperation' }] };
}

function regularity(ctx: CoachContext): CoachAnswer {
  const weeks = [0, 1, 2, 3].map((index) => {
    const end = addDays(ctx.today, -7 * index);
    return completedBetween(ctx.workouts, addDays(end, -6), end).length;
  });
  const active = weeks.filter((count) => count > 0).length;
  const lines =
    completed(ctx.workouts).length === 0
      ? ['Pas encore de séance terminée : la régularité commence par la première.']
      : [
          `Séances sur les 4 dernières semaines (de la plus récente à la plus ancienne) : ${weeks.join(' · ')}.`,
          active >= 3 ? 'Tu t’entraînes presque chaque semaine : c’est exactement ce qui fait progresser.' : 'Vise au moins une séance chaque semaine : la régularité bat l’intensité.',
          'Une séance ratée ne se rattrape pas : on reprend simplement à la suivante.',
        ];
  const { planned, done } = sessionsThisWeek(ctx);
  if (planned > 0) lines.push(`Cette semaine : ${done}/${planned} séance${planned > 1 ? 's' : ''}.`);
  const note = [...ctx.motivation].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (note) lines.push(`Ta dernière note de motivation (${frDate(note.date)}) : « ${note.text} »`);
  return { title: 'Régularité', lines, basedOn: ['séances terminées', 'journal de motivation'], links: [{ label: 'Journal de motivation', to: '/coach/motivation' }] };
}

function pain(): CoachAnswer {
  return {
    title: 'Douleur',
    lines: [
      'Je ne peux pas évaluer une douleur ni poser de diagnostic.',
      'Signale-la dans ton check-in : les exercices qui sollicitent la zone sont retirés de ta séance.',
      'Si la douleur est forte, persiste ou t’inquiète, consulte un professionnel de santé.',
    ],
    basedOn: [],
    links: [{ label: 'Faire mon check-in', to: '/recuperation/check-in' }],
  };
}

const ANSWERS: Record<IntentId, (ctx: CoachContext) => CoachAnswer> = {
  today,
  'why-changed': whyChanged,
  progress,
  'after-match': afterMatch,
  'recent-exercises': recentExercises,
  records,
  'week-goals': weekGoals,
  recovery,
  regularity,
  pain,
};

export function answerIntent(intent: IntentId, ctx: CoachContext): CoachAnswer {
  return ANSWERS[intent](ctx);
}
