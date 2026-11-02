import { addDays } from '../calendar/time';
import type { IsoDate } from '../common/dates';
import { daysBetween } from '../common/dates';
import { measurementSeries } from '../progress/series';
import { MEASUREMENT_KEYS, type MeasurementKey } from '../progress/types';
import { average, completedBetween, drankOn, recordEvents, type RecordEvent } from './facts';
import type { CoachContext } from './types';

export const REVIEW_DAYS = 14;

export interface ReviewPeriod {
  start: IsoDate;
  end: IsoDate;
}

/** Périodes de 14 jours terminées depuis la création du profil, de la plus récente à la plus ancienne. */
export function completedPeriods(startDate: IsoDate | null, today: IsoDate): ReviewPeriod[] {
  if (!startDate || startDate >= today) return [];
  const count = Math.floor(daysBetween(startDate, today) / REVIEW_DAYS);
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(startDate, index * REVIEW_DAYS);
    return { start, end: addDays(start, REVIEW_DAYS - 1) };
  }).reverse();
}

/** Bilan à signaler : le plus récent, s'il n'a pas encore été consulté. */
export function reviewToShow(ctx: CoachContext): ReviewPeriod | null {
  const [latest] = completedPeriods(ctx.startDate, ctx.today);
  if (!latest) return null;
  return ctx.state.reviewSeenUntil !== null && ctx.state.reviewSeenUntil >= latest.end ? null : latest;
}

export interface Review extends ReviewPeriod {
  workouts: { completed: number; light: number };
  basketball: { practices: number; matches: number };
  checkIns: { count: number; sleep: ReturnType<typeof average>; energy: ReturnType<typeof average> };
  weight: { from: number; to: number; delta: number } | null;
  measurements: { key: MeasurementKey; delta: number }[];
  records: RecordEvent[];
  hydration: { daysLogged: number; daysAtTarget: number };
  /** Résumé en une phrase, tiré des chiffres ci-dessus (jamais culpabilisant). */
  headline: string;
}

const between = (date: IsoDate, period: ReviewPeriod) => date >= period.start && date <= period.end;

export function buildReview(ctx: CoachContext, period: ReviewPeriod): Review {
  const workouts = completedBetween(ctx.workouts, period.start, period.end);
  const logs = ctx.activityLogs.filter((log) => log.played && between(log.date, period));
  const checkIns = ctx.checkIns.filter((checkIn) => between(checkIn.date, period));
  const weights = ctx.weights.filter((point) => between(point.date, period));
  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];
  const days = Array.from({ length: REVIEW_DAYS }, (_, index) => addDays(period.start, index));
  const drank = days.map((date) => drankOn(ctx, date)).filter((value): value is number => value !== null);

  const review: Omit<Review, 'headline'> = {
    ...period,
    workouts: { completed: workouts.length, light: workouts.filter((workout) => workout.light).length },
    basketball: { practices: logs.filter((log) => log.kind === 'practice').length, matches: logs.filter((log) => log.kind === 'match').length },
    checkIns: {
      count: checkIns.length,
      sleep: average(checkIns.map((checkIn) => checkIn.sleepHours)),
      energy: average(checkIns.map((checkIn) => checkIn.energy)),
    },
    weight:
      firstWeight && lastWeight && weights.length >= 2
        ? { from: firstWeight.value, to: lastWeight.value, delta: Math.round((lastWeight.value - firstWeight.value) * 10) / 10 }
        : null,
    measurements: MEASUREMENT_KEYS.flatMap((key) => {
      const points = measurementSeries(ctx.measurements, key).filter((point) => between(point.date, period));
      const first = points[0];
      const last = points[points.length - 1];
      return first && last && points.length >= 2 ? [{ key, delta: Math.round((last.value - first.value) * 10) / 10 }] : [];
    }),
    records: recordEvents(ctx.workouts).filter((record) => between(record.date, period)),
    hydration: { daysLogged: drank.length, daysAtTarget: drank.filter((ml) => ml >= ctx.hydrationBaseMl).length },
  };
  return { ...review, headline: headline(review) };
}

function headline(review: Omit<Review, 'headline'>): string {
  const sport = review.workouts.completed + review.basketball.practices + review.basketball.matches;
  if (review.records.length > 0) return `${review.records.length} record${review.records.length > 1 ? 's' : ''} battu${review.records.length > 1 ? 's' : ''} : la progression est là.`;
  if (review.workouts.completed >= 4) return 'Belle régularité en musculation sur ces deux semaines.';
  if (sport > 0) return `${sport} séance${sport > 1 ? 's' : ''} de sport enregistrée${sport > 1 ? 's' : ''} : chaque séance compte.`;
  return 'Période calme dans tes données. On relance tranquillement, une séance à la fois.';
}
