import { addDays } from '../calendar/time';
import { isIsoDate, type IsoDate } from '../common/dates';
import type { CoachState, MotivationEntry } from './types';

/** Un message masqué l'est pour 30 jours au plus (les identifiants datés ne reviennent pas). */
const DISMISS_KEEP_DAYS = 30;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function withCoachDefaults(stored: unknown): CoachState {
  if (!isObject(stored)) return { reviewSeenUntil: null, dismissed: [] };
  const reviewSeenUntil = typeof stored.reviewSeenUntil === 'string' && isIsoDate(stored.reviewSeenUntil) ? stored.reviewSeenUntil : null;
  const dismissed = Array.isArray(stored.dismissed)
    ? stored.dismissed.filter(
        (item): item is { id: string; date: IsoDate } => isObject(item) && typeof item.id === 'string' && typeof item.date === 'string' && isIsoDate(item.date),
      )
    : [];
  return { reviewSeenUntil, dismissed };
}

export function dismissMessage(state: CoachState, id: string, today: IsoDate): CoachState {
  const limit = addDays(today, -DISMISS_KEEP_DAYS);
  return { ...state, dismissed: [...state.dismissed.filter((item) => item.id !== id && item.date >= limit), { id, date: today }] };
}

export function markReviewSeen(state: CoachState, end: IsoDate): CoachState {
  return { ...state, reviewSeenUntil: state.reviewSeenUntil && state.reviewSeenUntil > end ? state.reviewSeenUntil : end };
}

export const MOTIVATION_TEXT_MAX = 500;

export function isStoredMotivation(value: unknown): value is MotivationEntry {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    (value.motivation === null || (typeof value.motivation === 'number' && Number.isInteger(value.motivation) && value.motivation >= 1 && value.motivation <= 10)) &&
    typeof value.text === 'string'
  );
}

export function validateMotivation(entry: MotivationEntry): string | null {
  if (entry.text.trim() === '') return 'Écris quelques mots.';
  if (entry.text.length > MOTIVATION_TEXT_MAX) return `${MOTIVATION_TEXT_MAX} caractères maximum.`;
  return null;
}
