import { isIsoDate } from '../common/dates';
import { EQUIPMENT, EXPERIENCE_LEVELS, GOAL_TYPES, SEXES, type BodyWeightEntry, type Profile } from './types';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (options as readonly string[]).includes(value);

/**
 * Vérifie la structure d'un profil relu depuis le stockage.
 * Un enregistrement abîmé doit être signalé, jamais pris pour « aucun profil »
 * (ce qui conduirait à l'écraser par une nouvelle configuration).
 */
export function isStoredProfile(value: unknown): value is Profile {
  if (!isObject(value) || value.id !== 'me') return false;
  const { goal, training, foods } = value;
  return (
    (value.firstName === null || typeof value.firstName === 'string') &&
    isFiniteNumber(value.birthYear) &&
    isOneOf(SEXES, value.sex) &&
    isFiniteNumber(value.heightCm) &&
    isOneOf(EXPERIENCE_LEVELS, value.experience) &&
    isObject(goal) &&
    isOneOf(GOAL_TYPES, goal.type) &&
    typeof goal.targetDate === 'string' &&
    isIsoDate(goal.targetDate) &&
    typeof goal.notes === 'string' &&
    isObject(training) &&
    Array.isArray(training.equipment) &&
    training.equipment.every((item) => isOneOf(EQUIPMENT, item)) &&
    isObject(training.sessionMinutes) &&
    isFiniteNumber(training.sessionMinutes.min) &&
    isFiniteNumber(training.sessionMinutes.max) &&
    isStringArray(training.likedExercises) &&
    isStringArray(training.avoidedExercises) &&
    typeof training.noUnassistedFreeBench === 'boolean' &&
    isObject(foods) &&
    isStringArray(foods.liked) &&
    isStringArray(foods.tolerated) &&
    isStringArray(foods.refused) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export function isStoredBodyWeight(value: unknown): value is BodyWeightEntry {
  return (
    isObject(value) &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    isFiniteNumber(value.kg) &&
    typeof value.createdAt === 'string'
  );
}
