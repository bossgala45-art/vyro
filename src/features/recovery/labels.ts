import type { ReadinessLevel, SorenessLevel } from '../../domain/recovery/types';

export const LEVEL_LABELS: Record<ReadinessLevel, { title: string; className: string }> = {
  normal: { title: 'Séance normale', className: 'bg-emerald-500/15 text-emerald-300' },
  adapted: { title: 'Séance adaptée', className: 'bg-volt-600/25 text-volt-400' },
  light: { title: 'Activité légère', className: 'bg-amber-400/15 text-amber-200' },
  rest: { title: 'Repos conseillé', className: 'bg-orange-500/20 text-orange-200' },
  'need-info': { title: 'Précisions nécessaires', className: 'bg-ink-700 text-mist' },
};

export const SORENESS_LABELS: Record<SorenessLevel, string> = {
  none: 'Aucune',
  light: 'Légères',
  moderate: 'Modérées',
  strong: 'Fortes',
};

export const DISCLAIMER =
  'Repères prudents et réglables, pas un avis médical. VYRO ne calcule aucune note de forme et ne pose aucun diagnostic.';
