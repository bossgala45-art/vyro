import { addDays } from '../calendar/time';
import type { IsoDate } from '../common/dates';
import { isLowerBody, ZONE_LABELS } from './zones';
import type { CheckIn, ReadinessDecision, ReadinessLevel, ReadinessReason, RecoveryThresholds } from './types';

/**
 * Moteur de récupération : décision prudente et entièrement explicable.
 *
 * - Aucune note globale n'est calculée : un « score de forme » donnerait une fausse
 *   précision et pourrait être pris pour un diagnostic. Chaque signal est listé avec son effet.
 * - Les seuils sont des repères réglables, pas des valeurs médicales validées.
 * - Le moteur conseille ; l'utilisateur décide.
 */

export interface ReadinessContext {
  today: IsoDate;
  isMatchDay: boolean;
  matchTomorrow: boolean;
  /** Match(s) d'hier, avec l'intensité notée (`null` si non notée). */
  matchYesterday: { intensity: number | null } | null;
  /** Entraînements et matchs de basket des 3 derniers jours (aujourd'hui compris). */
  basketSessions3Days: number;
  lastWorkout: { date: IsoDate; sessionRpe: number | null } | null;
  workoutDoneToday: boolean;
  /** La séance prévue travaille les jambes. */
  plannedLegSession: boolean;
  /** Durée estimée de la séance prévue, si connue. */
  plannedMinutes: number | null;
}

const RANK: Record<Exclude<ReadinessLevel, 'need-info'>, number> = { normal: 0, adapted: 1, light: 2, rest: 3 };

const ADVICE: Record<ReadinessLevel, string> = {
  normal: 'Séance prévue normalement. Écoute tes sensations pendant l’échauffement.',
  adapted: 'Version allégée : une série de moins par exercice et aucune hausse de charge.',
  light: 'Pas de musculation aujourd’hui : 20 à 30 min d’activité légère (marche, vélo tranquille, mobilité, étirements doux).',
  rest: 'Repos aujourd’hui : hydrate-toi, mange normalement et privilégie une bonne nuit.',
  'need-info': 'Complète le check-in pour obtenir un conseil.',
};

export const PAIN_ADVICE =
  'Si la douleur persiste plus de quelques jours, augmente ou t’empêche de bouger normalement, demande l’avis d’un professionnel de santé.';

function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes === 0 ? `${whole} h` : `${whole} h ${String(minutes).padStart(2, '0')}`;
}

export function missingAnswers(checkIn: CheckIn | null): string[] {
  if (!checkIn) return ['Combien d’heures as-tu dormi ?', 'Quel est ton niveau d’énergie ?', 'As-tu une douleur inhabituelle ?'];
  const missing: string[] = [];
  if (checkIn.sleepHours === null) missing.push('Combien d’heures as-tu dormi ?');
  if (checkIn.energy === null) missing.push('Quel est ton niveau d’énergie ?');
  if (checkIn.pain === null) missing.push('As-tu une douleur inhabituelle ?');
  if (checkIn.pain === true && checkIn.painZones.length === 0) missing.push('Où as-tu mal ?');
  if (checkIn.pain === true && checkIn.painIntensity === null) missing.push('Quelle est l’intensité de la douleur ?');
  return missing;
}

export function evaluateReadiness(checkIn: CheckIn | null, context: ReadinessContext, t: RecoveryThresholds): ReadinessDecision {
  const reasons: ReadinessReason[] = [];
  const add = (level: ReadinessLevel, observation: string, effect: string) => reasons.push({ level, observation, effect });
  const advice: string[] = [];

  // Contraintes du calendrier : valables même sans check-in.
  if (context.isMatchDay) add('rest', 'Jour de match', 'pas de musculation aujourd’hui');
  if (context.workoutDoneToday) add('rest', 'Séance de musculation déjà faite aujourd’hui', 'pas de deuxième séance');

  const missing = missingAnswers(checkIn);
  let excludedZones: ReadinessDecision['excludedZones'] = [];
  let fatigueSignals = 0;

  if (checkIn) {
    // Douleur inhabituelle : jamais de séance intense sur la zone.
    if (checkIn.pain === true && checkIn.painZones.length > 0) {
      const zones = checkIn.painZones.map((zone) => ZONE_LABELS[zone].toLocaleLowerCase('fr')).join(', ');
      const intensity = checkIn.painIntensity;
      advice.push(PAIN_ADVICE);
      if (intensity !== null && intensity >= t.painRestIntensity) {
        add('rest', `Douleur inhabituelle ${intensity}/10 (${zones})`, 'repos conseillé');
      } else {
        excludedZones = [...checkIn.painZones];
        add(
          'adapted',
          `Douleur inhabituelle${intensity !== null ? ` ${intensity}/10` : ''} (${zones})`,
          'exercices qui sollicitent la zone retirés, séance allégée',
        );
        const lowerBody = checkIn.painZones.some(isLowerBody);
        if (lowerBody && (context.isMatchDay || context.matchTomorrow)) {
          add('light', 'Douleur aux jambes à l’approche d’un match', 'activité légère seulement, ménage-toi pour le match');
        }
        if (checkIn.painZones.includes('other')) {
          add('light', 'Zone douloureuse non précisée', 'impossible de savoir quels exercices éviter : activité légère');
        }
      }
    }

    if (checkIn.sleepHours !== null) {
      if (checkIn.sleepHours < t.veryShortSleepHours) {
        add('light', `Nuit très courte (${formatHours(checkIn.sleepHours)})`, 'activité légère seulement');
      } else if (checkIn.sleepHours < t.shortSleepHours) {
        fatigueSignals += 1;
        add('adapted', `Nuit courte (${formatHours(checkIn.sleepHours)})`, 'séance allégée');
      }
    }

    if (checkIn.energy !== null) {
      if (checkIn.energy <= t.veryLowEnergy) {
        add('light', `Énergie très basse (${checkIn.energy}/10)`, 'activité légère seulement');
      } else if (checkIn.energy <= t.lowEnergy) {
        fatigueSignals += 1;
        add('adapted', `Énergie basse (${checkIn.energy}/10)`, 'séance allégée');
      }
    }

    if (checkIn.soreness === 'strong') {
      fatigueSignals += 1;
      add('adapted', 'Fortes courbatures', 'séance allégée');
    } else if (checkIn.soreness === 'moderate') {
      add('normal', 'Courbatures modérées', 'un échauffement plus long peut aider');
    }

    if (checkIn.motivation !== null && checkIn.motivation <= t.lowMotivation) {
      add('normal', `Motivation basse (${checkIn.motivation}/10)`, 'commence par l’échauffement puis décide ; cela ne réduit pas la séance à lui seul');
    }

    if (checkIn.availableMinutes !== null) {
      if (checkIn.availableMinutes < t.minSessionMinutes) {
        add('light', `Seulement ${checkIn.availableMinutes} min disponibles`, 'pas assez pour une séance : activité légère');
      } else if (context.plannedMinutes !== null && checkIn.availableMinutes < context.plannedMinutes) {
        add('adapted', `${checkIn.availableMinutes} min disponibles (séance prévue : ${context.plannedMinutes} min)`, 'séance raccourcie : garde les exercices principaux');
      }
    }
  }

  if (context.basketSessions3Days >= t.basketSessions3Days) {
    fatigueSignals += 1;
    add('adapted', `${context.basketSessions3Days} séances de basket en 3 jours`, 'charge élevée : séance allégée');
  }
  if (context.matchYesterday) {
    const intensity = context.matchYesterday.intensity;
    if (intensity !== null && intensity >= t.intenseMatch) {
      fatigueSignals += 1;
      add('adapted', `Match intense hier (${intensity}/10)`, 'séance allégée');
    }
  }
  if (context.matchTomorrow && context.plannedLegSession) {
    add('adapted', 'Match demain et séance avec travail de jambes', 'version allégée pour garder des jambes fraîches');
  }
  if (context.lastWorkout?.sessionRpe != null && context.lastWorkout.sessionRpe >= t.hardWorkoutRpe) {
    if (context.lastWorkout.date === addDays(context.today, -1)) {
      fatigueSignals += 1;
      add('adapted', `Séance d’hier très difficile (${context.lastWorkout.sessionRpe}/10)`, 'séance allégée');
    }
  }

  if (fatigueSignals >= t.factorsForLightActivity) {
    add('light', `${fatigueSignals} signaux de fatigue cumulés`, 'activité légère plutôt qu’une séance');
  }

  const worst = reasons.reduce<Exclude<ReadinessLevel, 'need-info'>>((level, reason) => {
    if (reason.level === 'need-info') return level;
    return RANK[reason.level] > RANK[level] ? reason.level : level;
  }, 'normal');

  // Données insuffisantes : on le dit, sauf si une contrainte impose déjà le repos.
  const level: ReadinessLevel = missing.length > 0 && worst !== 'rest' ? 'need-info' : worst;
  advice.unshift(ADVICE[level]);
  if (excludedZones.length > 0 && (level === 'adapted' || level === 'normal')) {
    advice.push('Les exercices qui sollicitent la zone douloureuse sont retirés de la séance du jour, sans remplacement intense.');
  }
  return { level, reasons, missing, excludedZones, advice };
}

export interface CheckInErrors {
  sleepHours?: string;
  energy?: string;
  motivation?: string;
  painIntensity?: string;
  availableMinutes?: string;
}

export function validateCheckIn(checkIn: Pick<CheckIn, 'sleepHours' | 'energy' | 'motivation' | 'painIntensity' | 'availableMinutes'>): CheckInErrors {
  const errors: CheckInErrors = {};
  const scale = (value: number | null) => value === null || (Number.isInteger(value) && value >= 1 && value <= 10);
  if (checkIn.sleepHours !== null && (!Number.isFinite(checkIn.sleepHours) || checkIn.sleepHours < 0 || checkIn.sleepHours > 16)) {
    errors.sleepHours = 'Entre 0 et 16 heures.';
  }
  if (!scale(checkIn.energy)) errors.energy = 'Entre 1 et 10.';
  if (!scale(checkIn.motivation)) errors.motivation = 'Entre 1 et 10.';
  if (!scale(checkIn.painIntensity)) errors.painIntensity = 'Entre 1 et 10.';
  if (checkIn.availableMinutes !== null && (!Number.isInteger(checkIn.availableMinutes) || checkIn.availableMinutes < 0 || checkIn.availableMinutes > 300)) {
    errors.availableMinutes = 'Entre 0 et 300 minutes.';
  }
  return errors;
}
