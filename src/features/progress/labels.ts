import type { PhotoPose } from '../../domain/progress/types';
import type { MetricKey } from '../../domain/progress/series';

export const METRIC_LABELS: Record<MetricKey, { label: string; short: string; unit: 'kg' | 'cm' }> = {
  weight: { label: 'Poids', short: 'Poids', unit: 'kg' },
  arm: { label: 'Tour de bras', short: 'Bras', unit: 'cm' },
  chest: { label: 'Tour de poitrine', short: 'Poitrine', unit: 'cm' },
  shoulders: { label: 'Tour d’épaules', short: 'Épaules', unit: 'cm' },
  waist: { label: 'Tour de taille', short: 'Taille', unit: 'cm' },
};

export const POSE_LABELS: Record<PhotoPose, string> = {
  front: 'Face',
  side: 'Profil',
  back: 'Dos',
};

export const MEASURE_TIPS: Record<Exclude<MetricKey, 'weight'>, string> = {
  arm: 'Bras relâché le long du corps, au point le plus large, toujours le même bras.',
  chest: 'Sous les aisselles, au niveau des pectoraux, en fin d’expiration normale.',
  shoulders: 'Autour des deux épaules, au point le plus large, bras relâchés.',
  waist: 'Au niveau du nombril, ventre relâché, sans rentrer le ventre.',
};

export const PROGRESS_DISCLAIMER =
  'VYRO affiche uniquement ce que tu as mesuré : aucune estimation de masse grasse ou musculaire, aucun score de transformation.';

const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const shortDateYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d ?? 1);
};

export function formatChartDate(iso: string): string {
  return (toDate(iso).getFullYear() === new Date().getFullYear() ? shortDate : shortDateYear).format(toDate(iso));
}

export function formatMonth(month: string): string {
  const text = monthFormat.format(toDate(`${month}-01`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatValue(value: number, unit: string): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
}

export function formatDelta(delta: number, unit: string): string {
  if (delta === 0) return `stable (0 ${unit})`;
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 ** 2).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}
