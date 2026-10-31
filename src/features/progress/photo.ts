import type { IsoDate } from '../../domain/common/dates';
import type { PhotoPose, ProgressPhoto, ProgressPhotoFile } from '../../domain/progress/types';
import { decodeImage, encodeImage, releaseImage } from '../../media/image';

/**
 * Tailles conservées : 1600 px (assez pour zoomer sur l'iPhone, ≈ 250–600 Ko) et une miniature
 * de 360 px pour la chronologie (≈ 20–40 Ko).
 */
export const FULL_MAX_SIDE = 1600;
export const FULL_QUALITY = 0.85;
export const THUMB_MAX_SIDE = 360;
export const THUMB_QUALITY = 0.72;

interface PhotoInput {
  id: string;
  date: IsoDate;
  pose: PhotoPose;
  notes: string;
  now: string;
}

export async function prepareProgressPhoto(file: File, input: PhotoInput): Promise<{ photo: ProgressPhoto; file: ProgressPhotoFile }> {
  const source = await decodeImage(file);
  try {
    const full = await encodeImage(source, FULL_MAX_SIDE, FULL_QUALITY);
    const thumbnail = await encodeImage(source, THUMB_MAX_SIDE, THUMB_QUALITY);
    return {
      photo: {
        id: input.id,
        date: input.date,
        pose: input.pose,
        width: full.width,
        height: full.height,
        bytes: full.data.byteLength,
        thumbnail,
        notes: input.notes,
        createdAt: input.now,
      },
      file: { id: input.id, mimeType: full.mimeType, data: full.data },
    };
  } finally {
    releaseImage(source);
  }
}
