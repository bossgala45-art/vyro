import { daysBetween } from '../common/dates';
import { exerciseName } from '../training/exercises';
import { newRecordsIn } from '../training/records';
import { completed, daysSinceLastWorkout, frDate, inProgress, plannedToday } from './facts';
import { reviewToShow } from './review';
import type { CoachContext, CoachMessage } from './types';

/**
 * Règles des messages proactifs (documentées dans ARCHITECTURE.md).
 * Chaque règle s'appuie sur un événement réel ; l'ordre de priorité règle les contradictions :
 * sécurité et récupération d'abord, puis séance, puis le reste. Un message qui pousse à
 * s'entraîner (`push`) n'est jamais affiché si la récupération conseille repos ou activité légère,
 * ni un jour de match.
 */

const NO_WORKOUT_DAYS = 7;
const WEIGHT_REMINDER_DAYS = 14;
/** Sauvegarde conseillée après 7 jours d'utilisation, puis tous les 30 jours. */
const BACKUP_FIRST_DAYS = 7;
const BACKUP_EVERY_DAYS = 30;

type Rule = (ctx: CoachContext) => CoachMessage | CoachMessage[] | null;

const rules: Rule[] = [
  // 1. Récupération : douleur, repos, activité légère.
  (ctx) => {
    const { readiness } = ctx;
    if (readiness.level !== 'rest' && readiness.level !== 'light') return null;
    const pain = readiness.reasons.find((reason) => /douleur/i.test(reason.observation));
    const first = pain ?? readiness.reasons[0];
    return {
      id: `recovery:${readiness.level}:${ctx.today}`,
      kind: pain ? 'safety' : 'recovery',
      priority: 1,
      push: false,
      title: readiness.level === 'rest' ? 'Repos aujourd’hui' : 'Activité légère aujourd’hui',
      text: `${first ? `${first.observation}. ` : ''}${
        readiness.level === 'rest' ? 'Récupérer fait aussi progresser.' : 'Bouge doucement, sans forcer : tu repars plus fort demain.'
      }`,
      basedOn: readiness.hasCheckIn ? 'ton check-in du jour et ton calendrier' : 'ton calendrier',
      action: { label: 'Voir le conseil du jour', to: '/recuperation/aujourdhui' },
    };
  },
  // 2. Séance commencée et pas terminée.
  (ctx) => {
    const running = inProgress(ctx);
    if (!running) return null;
    return {
      id: `running:${running.id}`,
      kind: 'session',
      priority: 2,
      push: false,
      title: 'Séance en cours',
      text: `Ta séance ${running.templateKey} du ${frDate(running.date)} n’est pas terminée. Reprends-la ou termine-la.`,
      basedOn: 'tes séances enregistrées',
      action: { label: 'Reprendre', to: `/entrainement/seance/${running.id}` },
    };
  },
  // 3. Séance terminée aujourd'hui, avec les records réellement battus.
  (ctx) => {
    const done = completed(ctx.workouts);
    const today = done.filter((workout) => workout.date === ctx.today).pop();
    if (!today) return null;
    const records = newRecordsIn(today, done.filter((workout) => workout !== today));
    return {
      id: `done:${today.id}`,
      kind: 'celebration',
      priority: 3,
      push: false,
      title: records.length > 0 ? 'Nouveau record 🔥' : 'Séance validée ✅',
      text:
        records.length > 0
          ? `${records
              .slice(0, 2)
              .map((record) => `${exerciseName(record.exerciseId)} : ${record.description}`)
              .join(' · ')}. Bravo, c’est mérité.`
          : `Séance ${today.templateKey} terminée. Une de plus dans la bonne direction.`,
      basedOn: 'ta séance terminée aujourd’hui',
      action: { label: 'Voir mes records', to: '/entrainement/records' },
    };
  },
  // 4. Match aujourd'hui ou demain.
  (ctx) => {
    if (ctx.day.isMatchDay) {
      const match = ctx.day.activities.find((activity) => activity.kind === 'match');
      return {
        id: `match-day:${ctx.today}`,
        kind: 'planning',
        priority: 4,
        push: false,
        title: 'Jour de match 🏀',
        text: `${match?.startTime ? `Match à ${match.startTime.replace(':', ' h ')}. ` : ''}Pas de musculation aujourd’hui : garde toute ton énergie pour le terrain.`,
        basedOn: 'ton calendrier',
        action: { label: 'Conseils repas et hydratation', to: '/nutrition' },
      };
    }
    if (ctx.day.matchTomorrow) {
      return {
        id: `match-tomorrow:${ctx.today}`,
        kind: 'planning',
        priority: 5,
        push: false,
        title: 'Match demain',
        text: 'Pas de jambes lourdes aujourd’hui, dors bien et bois régulièrement.',
        basedOn: 'ton calendrier',
        action: null,
      };
    }
    return null;
  },
  // 5. Planning modifié depuis la dernière consultation.
  (ctx) => {
    if (ctx.planChanges.length === 0) return null;
    return {
      id: `plan-changed:${ctx.today}:${ctx.planChanges.length}`,
      kind: 'planning',
      priority: 6,
      push: false,
      title: 'Ton planning a changé',
      text: ctx.planChanges[0]?.message ?? '',
      basedOn: 'ton calendrier et tes disponibilités',
      action: { label: 'Voir le calendrier', to: '/calendrier' },
    };
  },
  // 6. Bilan de 14 jours disponible.
  (ctx) => {
    const review = reviewToShow(ctx);
    if (!review) return null;
    return {
      id: `review:${review.end}`,
      kind: 'review',
      priority: 7,
      push: false,
      title: 'Ton bilan est prêt',
      text: `Les 14 jours du ${frDate(review.start)} au ${frDate(review.end)} en un coup d’œil.`,
      basedOn: 'toutes tes données de la période',
      action: { label: 'Voir le bilan', to: '/coach/bilans' },
    };
  },
  // 7. Séance prévue aujourd'hui.
  (ctx) => {
    const session = plannedToday(ctx);
    if (!session || completed(ctx.workouts).some((workout) => workout.date === ctx.today) || inProgress(ctx)) return null;
    const name = ctx.readiness.template?.key === session.templateKey ? ctx.readiness.template.name : `séance ${session.templateKey}`;
    if (!ctx.readiness.hasCheckIn) {
      return {
        id: `checkin:${ctx.today}`,
        kind: 'session',
        priority: 8,
        push: true,
        title: `${name} aujourd’hui`,
        text: '30 secondes de check-in pour savoir si on y va à fond ou en version allégée.',
        basedOn: 'ton planning de la semaine',
        action: { label: 'Faire mon check-in', to: `/recuperation/check-in?seance=${session.templateKey}` },
      };
    }
    const light = ctx.readiness.level === 'adapted' || session.light;
    return {
      id: `go:${ctx.today}`,
      kind: 'session',
      priority: 8,
      push: true,
      title: light ? 'Séance allégée, mais séance quand même 💪' : 'C’est parti 💪',
      text: `${name}${session.startTime ? ` à ${session.startTime.replace(':', ' h ')}` : ''}. ${
        light ? 'Version allégée conseillée aujourd’hui : la régularité compte plus que l’intensité.' : 'Tu es prêt : concentre-toi sur la technique.'
      }`,
      basedOn: 'ton planning et ton check-in du jour',
      action: { label: 'Voir le conseil du jour', to: '/recuperation/aujourdhui' },
    };
  },
  // 8. Pas de séance depuis un moment (jamais de rattrapage, jamais de reproche).
  (ctx) => {
    if (!ctx.program || ctx.day.vacation) return null;
    const since = daysSinceLastWorkout(ctx);
    const programAge = daysBetween(ctx.program.createdAt.slice(0, 10), ctx.today);
    const gap = since ?? programAge;
    if (gap < NO_WORKOUT_DAYS) return null;
    const next = ctx.readiness.template;
    return {
      id: `restart:${ctx.today}`,
      kind: 'regularity',
      priority: 9,
      push: true,
      title: 'On repart quand tu veux',
      text: `${since === null ? 'Pas encore de séance terminée' : `Dernière séance il y a ${since} jours`}. ${
        next ? `La prochaine (${next.name}) suffit pour relancer la machine` : 'Une séance suffit pour relancer la machine'
      } : rien à rattraper.`,
      basedOn: 'tes séances enregistrées',
      action: { label: 'Voir mes séances', to: '/entrainement' },
    };
  },
  // 9. Motivation basse dans le check-in : rappel des propres mots de l'utilisateur.
  (ctx) => {
    const checkIn = ctx.checkIns.find((item) => item.date === ctx.today);
    if (!checkIn || checkIn.motivation === null || checkIn.motivation > ctx.thresholds.lowMotivation) return null;
    const note = [...ctx.motivation].filter((entry) => entry.text.trim()).sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      id: `motivation:${ctx.today}`,
      kind: 'motivation',
      priority: 10,
      push: false,
      title: 'Motivation en baisse : normal, ça arrive',
      text: note ? `Le ${frDate(note.date)}, tu as écrit : « ${note.text.trim()} »` : 'Écris dans ton journal pourquoi tu as commencé : ça aide les jours sans.',
      basedOn: note ? 'ton check-in et ton journal de motivation' : 'ton check-in du jour',
      action: { label: 'Journal de motivation', to: '/coach/motivation' },
    };
  },
  // 10. Photo du mois (seulement si l'utilisateur a déjà commencé les photos).
  (ctx) => {
    if (ctx.photoDates.length === 0) return null;
    const month = ctx.today.slice(0, 7);
    if (ctx.photoDates.some((date) => date.startsWith(month))) return null;
    return {
      id: `photo:${month}`,
      kind: 'tracking',
      priority: 11,
      push: false,
      title: 'Photo du mois',
      text: 'Même lumière, même pose que la dernière fois : 2 minutes pour voir le chemin parcouru.',
      basedOn: 'tes photos de progression',
      action: { label: 'Ajouter une photo', to: '/progres/photos/nouvelle' },
    };
  },
  // 11. Pesée ancienne.
  (ctx) => {
    const last = ctx.weights[ctx.weights.length - 1];
    if (!last || daysBetween(last.date, ctx.today) < WEIGHT_REMINDER_DAYS) return null;
    return {
      id: `weight:${ctx.today}`,
      kind: 'tracking',
      priority: 12,
      push: false,
      title: 'Petite pesée ?',
      text: `Dernière pesée le ${frDate(last.date)}. Une pesée de temps en temps suffit pour suivre l’évolution.`,
      basedOn: 'tes pesées',
      action: { label: 'Nouvelle pesée', to: '/progres' },
    };
  },
  // 12. Sauvegarde : les données n'existent que sur cet iPhone.
  (ctx) => {
    if (!ctx.startDate) return null;
    const last = ctx.lastBackupAt ? ctx.lastBackupAt.slice(0, 10) : null;
    const due = last ? daysBetween(last, ctx.today) >= BACKUP_EVERY_DAYS : daysBetween(ctx.startDate, ctx.today) >= BACKUP_FIRST_DAYS;
    if (!due) return null;
    return {
      id: `backup:${ctx.today.slice(0, 7)}`,
      kind: 'tracking',
      priority: 13,
      push: false,
      title: 'Sauvegarde conseillée',
      text: last ? `Dernière sauvegarde le ${frDate(last)}. Un export chiffré protège tes séances et tes photos.` : 'Tes données n’existent que sur cet iPhone : un export chiffré les met à l’abri.',
      basedOn: 'la date de ta dernière sauvegarde',
      action: { label: 'Sauvegarder', to: '/reglages/sauvegarde' },
    };
  },
];

/** Messages du jour, du plus important au moins important, contradictions résolues. */
export function proactiveMessages(ctx: CoachContext): CoachMessage[] {
  const holdBack = ctx.readiness.level === 'rest' || ctx.readiness.level === 'light' || ctx.day.isMatchDay;
  const dismissed = new Set(ctx.state.dismissed.map((item) => item.id));
  return rules
    .flatMap((rule) => {
      const result = rule(ctx);
      return result === null ? [] : Array.isArray(result) ? result : [result];
    })
    .filter((message) => !(holdBack && message.push))
    .filter((message) => !dismissed.has(message.id))
    .sort((a, b) => a.priority - b.priority);
}

/** Message d'accueil : court, personnalisé, toujours fondé sur une donnée réelle. */
export function greeting(ctx: CoachContext): { title: string; text: string } {
  const hello = ctx.firstName ? `Salut ${ctx.firstName} !` : 'Salut !';
  if (!ctx.goal) return { title: hello, text: 'Complète ton profil pour que je puisse t’accompagner.' };
  const daysLeft = daysBetween(ctx.today, ctx.goal.targetDate);
  const done = completed(ctx.workouts).length;
  const next = ctx.readiness.template;
  if (daysLeft <= 0) return { title: hello, text: 'Ta date d’objectif est atteinte : fixe-toi la suivante dans ton profil.' };
  if (done === 0) {
    return { title: hello, text: `J-${daysLeft} avant ton objectif. ${next ? `Première étape : ${next.name}.` : 'Première étape : générer ton programme.'}` };
  }
  return {
    title: hello,
    text: `J-${daysLeft} avant ton objectif · ${done} séance${done > 1 ? 's' : ''} terminée${done > 1 ? 's' : ''} depuis le début.`,
  };
}

export const COACH_RULES = { NO_WORKOUT_DAYS, WEIGHT_REMINDER_DAYS, BACKUP_FIRST_DAYS, BACKUP_EVERY_DAYS } as const;
