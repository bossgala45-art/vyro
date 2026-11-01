import { describe, expect, it } from 'vitest';
import type { BodyWeightEntry } from '../profile/types';
import { validateMeasurement } from './integrity';
import { defaultComparison, groupByMonth, lastPhotoOfPose, monthlyStatus } from './photos';
import { inRange, measuredChange, measurementSeries, nearestPoint, weightSeries } from './series';
import type { MeasurementEntry, ProgressPhoto } from './types';
import { visualAnalysisAvailability } from './visualAnalysis';

const weight = (date: string, kg: number, createdAt = `${date}T08:00:00Z`): BodyWeightEntry => ({ date, kg, createdAt });

const measure = (date: string, overrides: Partial<MeasurementEntry> = {}): MeasurementEntry => ({
  date,
  arm: null,
  chest: null,
  shoulders: null,
  waist: null,
  notes: '',
  createdAt: `${date}T08:00:00Z`,
  updatedAt: `${date}T08:00:00Z`,
  ...overrides,
});

const photo = (id: string, date: string, pose: ProgressPhoto['pose'] = 'front'): ProgressPhoto => ({
  id,
  date,
  pose,
  width: 1200,
  height: 1600,
  bytes: 1000,
  thumbnail: { mimeType: 'image/jpeg', data: new ArrayBuffer(8), width: 270, height: 360 },
  notes: '',
  createdAt: `${date}T08:00:00Z`,
});

describe('séries mesurées', () => {
  it('une seule valeur par jour (la dernière saisie), triées dans le temps', () => {
    const series = weightSeries([weight('2026-10-20', 59, '2026-10-20T20:00:00Z'), weight('2026-09-01', 58), weight('2026-10-20', 58.6)]);
    expect(series).toEqual([
      { date: '2026-09-01', value: 58 },
      { date: '2026-10-20', value: 59 },
    ]);
  });

  it('un tour non mesuré n’apparaît pas (aucune interpolation)', () => {
    const entries = [measure('2026-08-01', { arm: 30 }), measure('2026-09-01', { waist: 72 }), measure('2026-10-01', { arm: 31.5 })];
    expect(measurementSeries(entries, 'arm')).toEqual([
      { date: '2026-08-01', value: 30 },
      { date: '2026-10-01', value: 31.5 },
    ]);
    expect(measurementSeries(entries, 'chest')).toEqual([]);
  });

  it('filtre par période et calcule l’évolution mesurée seulement avec deux mesures', () => {
    const points = weightSeries([weight('2026-04-01', 56), weight('2026-09-15', 57.4), weight('2026-10-20', 58.1)]);
    expect(inRange(points, '3m', '2026-10-31').map((point) => point.date)).toEqual(['2026-09-15', '2026-10-20']);
    expect(measuredChange(inRange(points, 'all', '2026-10-31'))).toMatchObject({ delta: 2.1, days: 202 });
    expect(measuredChange(inRange(points, '1m', '2026-10-31'))).toBeNull();
  });

  it('la mesure « proche » d’une photo doit être à 7 jours au plus', () => {
    const points = weightSeries([weight('2026-10-01', 58), weight('2026-10-20', 59)]);
    expect(nearestPoint(points, '2026-10-05')?.value).toBe(58);
    expect(nearestPoint(points, '2026-10-17')?.value).toBe(59);
    expect(nearestPoint(points, '2026-11-15')).toBeNull();
  });
});

describe('mensurations', () => {
  it('refuse une saisie vide, hors limites ou datée dans le futur', () => {
    expect(validateMeasurement(measure('2026-10-20'), '2026-10-31').empty).toBeDefined();
    expect(validateMeasurement(measure('2026-10-20', { arm: 300 }), '2026-10-31').arm).toBe('Entre 15 et 70 cm.');
    expect(validateMeasurement(measure('2026-11-02', { arm: 31 }), '2026-10-31').date).toBeDefined();
    expect(validateMeasurement(measure('2026-10-20', { waist: 74.5 }), '2026-10-31')).toEqual({});
  });
});

describe('photos', () => {
  const photos = [photo('a', '2026-08-03'), photo('b', '2026-08-03', 'side'), photo('c', '2026-10-02'), photo('d', '2026-09-01', 'back')];

  it('chronologie par mois, du plus récent au plus ancien', () => {
    expect(groupByMonth(photos).map((month) => [month.month, month.photos.map((item) => item.id)])).toEqual([
      ['2026-10', ['c']],
      ['2026-09', ['d']],
      ['2026-08', ['a', 'b']],
    ]);
  });

  it('rappel mensuel : photo du mois faite ou non', () => {
    expect(monthlyStatus(photos, '2026-10-31')).toEqual({ done: true, lastDate: '2026-10-02' });
    expect(monthlyStatus(photos, '2026-11-01').done).toBe(false);
    expect(monthlyStatus([], '2026-11-01')).toEqual({ done: false, lastDate: null });
  });

  it('comparaison par défaut : la plus ancienne et la plus récente de la même pose', () => {
    expect(defaultComparison(photos, 'front')).toEqual({ before: photos[0], after: photos[2] });
    expect(defaultComparison(photos, 'side')).toBeNull();
    expect(lastPhotoOfPose(photos, 'front')?.id).toBe('c');
  });

  it('aucune analyse visuelle tant qu’aucun service n’est connecté', () => {
    const availability = visualAnalysisAvailability();
    expect(availability.available).toBe(false);
  });
});
