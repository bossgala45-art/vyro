import { DEFAULT_THRESHOLDS, type RecoveryThresholds } from './types';

export interface ThresholdField {
  key: keyof RecoveryThresholds;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

/** Description de chaque repère, affichée dans les réglages et la documentation. */
export const THRESHOLD_FIELDS: readonly ThresholdField[] = [
  { key: 'shortSleepHours', label: 'Nuit courte', description: 'En dessous : séance allégée.', min: 4, max: 9, step: 0.5, unit: 'h' },
  { key: 'veryShortSleepHours', label: 'Nuit très courte', description: 'En dessous : activité légère seulement.', min: 3, max: 8, step: 0.5, unit: 'h' },
  { key: 'lowEnergy', label: 'Énergie basse', description: 'À ce niveau ou moins : séance allégée.', min: 1, max: 8, step: 1, unit: '/10' },
  { key: 'veryLowEnergy', label: 'Énergie très basse', description: 'À ce niveau ou moins : activité légère.', min: 1, max: 6, step: 1, unit: '/10' },
  { key: 'lowMotivation', label: 'Motivation basse', description: 'Simple remarque, ne réduit pas la séance seule.', min: 1, max: 8, step: 1, unit: '/10' },
  { key: 'painRestIntensity', label: 'Douleur : repos', description: 'À partir de cette intensité : repos conseillé.', min: 3, max: 10, step: 1, unit: '/10' },
  { key: 'basketSessions3Days', label: 'Basket chargé', description: 'Séances de basket sur 3 jours à partir desquelles la séance est allégée.', min: 2, max: 6, step: 1, unit: 'séances' },
  { key: 'intenseMatch', label: 'Match intense', description: 'Intensité de match à partir de laquelle le lendemain est allégé.', min: 5, max: 10, step: 1, unit: '/10' },
  { key: 'hardWorkoutRpe', label: 'Séance très dure', description: 'Difficulté de la séance de la veille à partir de laquelle on allège.', min: 6, max: 10, step: 1, unit: '/10' },
  { key: 'minSessionMinutes', label: 'Temps minimal', description: 'En dessous : activité légère au lieu d’une séance.', min: 15, max: 60, step: 5, unit: 'min' },
  { key: 'factorsForLightActivity', label: 'Signaux cumulés', description: 'Nombre de signaux de fatigue qui font passer à l’activité légère.', min: 2, max: 5, step: 1, unit: '' },
];

export function withThresholdDefaults(stored: Partial<RecoveryThresholds> | undefined): RecoveryThresholds {
  const merged = { ...DEFAULT_THRESHOLDS, ...stored };
  return Object.keys(validateThresholds(merged)).length > 0 ? { ...DEFAULT_THRESHOLDS } : merged;
}

export function validateThresholds(thresholds: RecoveryThresholds): Partial<Record<keyof RecoveryThresholds, string>> {
  const errors: Partial<Record<keyof RecoveryThresholds, string>> = {};
  for (const field of THRESHOLD_FIELDS) {
    const value = thresholds[field.key];
    if (!Number.isFinite(value) || value < field.min || value > field.max) {
      errors[field.key] = `Entre ${field.min} et ${field.max}.`;
    }
  }
  if (!errors.veryShortSleepHours && !errors.shortSleepHours && thresholds.veryShortSleepHours >= thresholds.shortSleepHours) {
    errors.veryShortSleepHours = 'Doit être inférieure à la nuit courte.';
  }
  if (!errors.veryLowEnergy && !errors.lowEnergy && thresholds.veryLowEnergy >= thresholds.lowEnergy) {
    errors.veryLowEnergy = 'Doit être inférieure à l’énergie basse.';
  }
  return errors;
}
