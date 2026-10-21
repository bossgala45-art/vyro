import { isIsoDate } from '../common/dates';
import { isLocalTime } from './time';
import type { Activity, ActivityLog, DayOverride, OccurrenceException, PlanningSettings, Vacation } from './types';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isDate = (value: unknown) => typeof value === 'string' && isIsoDate(value);
const isTimeOrNull = (value: unknown) => value === null || (typeof value === 'string' && isLocalTime(value));
const isWeekday = (value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;
const isNumberOrNull = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value));

export function isStoredActivity(value: unknown): value is Activity {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.title !== 'string') return false;
  if (!['practice', 'match', 'other'].includes(value.kind as string)) return false;
  if (!isTimeOrNull(value.startTime) || !isNumberOrNull(value.durationMinutes)) return false;
  const recurrence = value.recurrence;
  if (recurrence === null) return isDate(value.date);
  return (
    value.date === null &&
    isObject(recurrence) &&
    isWeekday(recurrence.weekday) &&
    isDate(recurrence.from) &&
    (recurrence.until === null || isDate(recurrence.until))
  );
}

export function isStoredException(value: unknown): value is OccurrenceException {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.activityId === 'string' &&
    isDate(value.date) &&
    (value.action === 'cancel' || (value.action === 'move' && isDate(value.newDate) && isTimeOrNull(value.newStartTime)))
  );
}

export function isStoredVacation(value: unknown): value is Vacation {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    isDate(value.start) &&
    isDate(value.end) &&
    typeof value.basketballSuspended === 'boolean' &&
    (value.gym === 'none' || value.gym === 'usual')
  );
}

export function isStoredPlanning(value: unknown): value is PlanningSettings {
  return (
    isObject(value) &&
    value.id === 'me' &&
    typeof value.includeOptionalThird === 'boolean' &&
    Array.isArray(value.gymSlots) &&
    value.gymSlots.every((slot) => isObject(slot) && isWeekday(slot.weekday) && isTimeOrNull(slot.from) && isTimeOrNull(slot.to))
  );
}

export function isStoredOverride(value: unknown): value is DayOverride {
  return (
    isObject(value) &&
    isDate(value.date) &&
    typeof value.rest === 'boolean' &&
    typeof value.gymUnavailable === 'boolean' &&
    typeof value.fatigue === 'boolean' &&
    (value.gymWindow === null || (isObject(value.gymWindow) && isTimeOrNull(value.gymWindow.from) && isTimeOrNull(value.gymWindow.to)))
  );
}

export function isStoredLog(value: unknown): value is ActivityLog {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    isDate(value.date) &&
    typeof value.played === 'boolean' &&
    isNumberOrNull(value.intensity) &&
    isNumberOrNull(value.minutesPlayed)
  );
}
