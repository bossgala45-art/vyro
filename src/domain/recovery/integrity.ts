import { isIsoDate } from '../common/dates';
import { BODY_ZONES, SORENESS_LEVELS, type CheckIn } from './types';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNumberOrNull = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value));

export function isStoredCheckIn(value: unknown): value is CheckIn {
  return (
    isObject(value) &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    isNumberOrNull(value.sleepHours) &&
    isNumberOrNull(value.energy) &&
    isNumberOrNull(value.motivation) &&
    (value.soreness === null || SORENESS_LEVELS.includes(value.soreness as never)) &&
    (value.pain === null || typeof value.pain === 'boolean') &&
    Array.isArray(value.painZones) &&
    value.painZones.every((zone) => BODY_ZONES.includes(zone as never)) &&
    isNumberOrNull(value.painIntensity) &&
    isNumberOrNull(value.availableMinutes) &&
    typeof value.notes === 'string'
  );
}
