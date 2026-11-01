import { isIsoDate } from '../common/dates';
import { MEASUREMENT_KEYS, MEASUREMENT_LIMITS, PHOTO_POSES, type MeasurementEntry, type MeasurementKey, type ProgressPhoto, type ProgressPhotoFile } from './types';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNumberOrNull = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value));
/** Indépendant du contexte d'exécution (un ArrayBuffer relu d'IndexedDB peut venir d'un autre « realm »). */
const isBuffer = (value: unknown): value is ArrayBuffer =>
  Object.prototype.toString.call(value) === '[object ArrayBuffer]' && (value as ArrayBuffer).byteLength > 0;

export function isStoredMeasurement(value: unknown): value is MeasurementEntry {
  return (
    isObject(value) &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    MEASUREMENT_KEYS.every((key) => isNumberOrNull(value[key])) &&
    typeof value.notes === 'string'
  );
}

export function isStoredProgressPhoto(value: unknown): value is ProgressPhoto {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    PHOTO_POSES.includes(value.pose as never) &&
    typeof value.bytes === 'number' &&
    isObject(value.thumbnail) &&
    typeof value.thumbnail.mimeType === 'string' &&
    isBuffer(value.thumbnail.data) &&
    typeof value.notes === 'string'
  );
}

export function isStoredPhotoFile(value: unknown): value is ProgressPhotoFile {
  return isObject(value) && typeof value.id === 'string' && typeof value.mimeType === 'string' && value.mimeType.startsWith('image/') && isBuffer(value.data);
}

export type MeasurementErrors = Partial<Record<MeasurementKey | 'date' | 'empty' | 'notes', string>>;

export function validateMeasurement(entry: MeasurementEntry, today: string): MeasurementErrors {
  const errors: MeasurementErrors = {};
  if (!isIsoDate(entry.date)) errors.date = 'Choisis une date.';
  else if (entry.date > today) errors.date = 'La date ne peut pas être dans le futur.';
  for (const key of MEASUREMENT_KEYS) {
    const value = entry[key];
    const { min, max } = MEASUREMENT_LIMITS[key];
    if (value !== null && (!Number.isFinite(value) || value < min || value > max)) errors[key] = `Entre ${min} et ${max} cm.`;
  }
  if (MEASUREMENT_KEYS.every((key) => entry[key] === null)) errors.empty = 'Renseigne au moins un tour.';
  if (entry.notes.length > 300) errors.notes = '300 caractères maximum.';
  return errors;
}
