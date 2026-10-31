import type { IsoDate } from '../common/dates';

/** Tours mesurés au mètre ruban, en cm. */
export const MEASUREMENT_KEYS = ['arm', 'chest', 'shoulders', 'waist'] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

/**
 * Mensurations d'un jour (une saisie par date, la dernière remplace la précédente).
 * Un tour non mesuré reste `null` : rien n'est interpolé ni estimé.
 */
export interface MeasurementEntry {
  date: IsoDate;
  arm: number | null;
  chest: number | null;
  shoulders: number | null;
  waist: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const PHOTO_POSES = ['front', 'side', 'back'] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];

/**
 * Photo de progression : métadonnées et miniature. L'image complète est dans une table à part
 * pour que la chronologie reste légère. Les photos ne quittent jamais l'appareil.
 */
export interface ProgressPhoto {
  id: string;
  date: IsoDate;
  pose: PhotoPose;
  width: number;
  height: number;
  /** Taille de l'image complète, en octets. */
  bytes: number;
  thumbnail: { mimeType: string; data: ArrayBuffer; width: number; height: number };
  notes: string;
  createdAt: string;
}

/** Image complète d'une photo de progression. */
export interface ProgressPhotoFile {
  id: string;
  mimeType: string;
  data: ArrayBuffer;
}

/** Plages acceptées (cm) : elles évitent une faute de frappe, pas une « norme » corporelle. */
export const MEASUREMENT_LIMITS: Record<MeasurementKey, { min: number; max: number }> = {
  arm: { min: 15, max: 70 },
  chest: { min: 50, max: 200 },
  shoulders: { min: 60, max: 220 },
  waist: { min: 40, max: 200 },
};
