import { todayIso } from '../../app/clock';
import { useActiveProgram, useCalendarData, useCheckIns, useProfile, useSettings, useWorkouts } from '../../data/hooks';
import { planForWeek, type CalendarData } from '../../domain/calendar/weekly';
import type { IsoDate } from '../../domain/common/dates';
import type { Profile } from '../../domain/profile/types';
import { buildReadinessContext } from '../../domain/recovery/context';
import { evaluateReadiness, type ReadinessContext } from '../../domain/recovery/engine';
import type { CheckIn, ReadinessDecision, ReadinessLevel, RecoveryThresholds } from '../../domain/recovery/types';
import { nextCoreTemplate, weekStart } from '../../domain/training/schedule';
import type { Program, SessionTemplate, TemplateKey, Workout } from '../../domain/training/types';
import { lastCompletedCoreKey } from '../../domain/training/workout';

export interface TodayReadiness {
  today: IsoDate;
  checkIn: CheckIn | null;
  decision: ReadinessDecision;
  context: ReadinessContext;
  /** Séance envisagée aujourd'hui : prévue au calendrier, sinon la suivante de la rotation. */
  template: SessionTemplate | null;
  /** Séance prévue aujourd'hui par le calendrier (`false` si on propose la suivante sans qu'elle soit planifiée). */
  plannedToday: boolean;
}

interface ComputeInput {
  today: IsoDate;
  data: CalendarData;
  program: Program | null;
  profile: Profile | null;
  workouts: Workout[];
  checkIns: CheckIn[];
  thresholds: RecoveryThresholds;
  /** Séance choisie explicitement (ex. séance facultative). */
  templateKey?: TemplateKey | undefined;
}

export function computeTodayReadiness({ today, data, program, profile, workouts, checkIns, thresholds, templateKey }: ComputeInput): TodayReadiness {
  const planned =
    program && profile
      ? planForWeek({ data, program, workouts, sessionMinutes: profile.training.sessionMinutes, monday: weekStart(today), today }).sessions.find(
          (session) => session.date === today,
        )
      : undefined;
  const key = templateKey ?? planned?.templateKey ?? (program ? nextCoreTemplate(program, lastCompletedCoreKey(program, workouts)) : null);
  const template = program?.templates.find((item) => item.key === key) ?? null;
  const checkIn = checkIns.find((item) => item.date === today) ?? null;
  const context = buildReadinessContext({ today, data, workouts, template });
  return {
    today,
    checkIn,
    decision: evaluateReadiness(checkIn, context, thresholds),
    context,
    template,
    plannedToday: planned !== undefined && planned.templateKey === key,
  };
}

/**
 * Effet du check-in du jour sur le planning : seulement s'il a été rempli et qu'aucune séance
 * n'a déjà été faite aujourd'hui (sinon la séance faite disparaîtrait du planning).
 */
export function readinessForPlanning(readiness: TodayReadiness): ReadonlyMap<IsoDate, ReadinessLevel> | undefined {
  const { checkIn, decision, context } = readiness;
  if (!checkIn || context.workoutDoneToday) return undefined;
  if (decision.level === 'adapted' || decision.level === 'light' || decision.level === 'rest') {
    return new Map([[readiness.today, decision.level]]);
  }
  return undefined;
}

export interface ReadinessData {
  readiness: TodayReadiness;
  /** Données du calendrier tenant compte du check-in du jour. */
  data: CalendarData;
  program: Program | null;
  profile: Profile | null;
  workouts: Workout[];
}

/** Données du jour (calendrier + check-in), recalculées à chaque changement. */
export function useReadinessData(templateKey?: TemplateKey): ReadinessData | undefined {
  const data = useCalendarData();
  const program = useActiveProgram();
  const profile = useProfile();
  const workouts = useWorkouts();
  const checkIns = useCheckIns();
  const settings = useSettings();
  if (!data || program === undefined || profile === undefined || !workouts || !checkIns || !settings) return undefined;
  const today = todayIso();
  const readiness = computeTodayReadiness({
    today,
    data,
    program,
    profile,
    workouts,
    checkIns,
    thresholds: settings.recovery.thresholds,
    templateKey,
  });
  const forPlanning = readinessForPlanning(readiness);
  return {
    readiness,
    data: forPlanning ? { ...data, readiness: forPlanning } : data,
    program,
    profile,
    workouts,
  };
}
