/**
 * Point d'intégration d'une future analyse visuelle des photos de progression.
 *
 * Aucune analyse n'existe dans cette version : VYRO n'estime ni masse grasse, ni masse
 * musculaire, ni « score de transformation ». Pour brancher un vrai fournisseur plus tard :
 * - passage par un serveur VYRO (aucune clé dans l'application) ;
 * - activation explicite par l'utilisateur, photo par photo, après information claire sur
 *   l'envoi de la photo (aujourd'hui, aucune photo ne quitte l'appareil) ;
 * - un résultat reste une observation du fournisseur, affichée comme telle, jamais un chiffre
 *   présenté comme une mesure.
 */

export interface ProgressImageInput {
  mimeType: string;
  data: ArrayBuffer;
}

export interface VisualObservation {
  text: string;
  provider: string;
}

export interface ProgressPhotoAnalyzer {
  readonly id: string;
  readonly label: string;
  compare(before: ProgressImageInput, after: ProgressImageInput): Promise<VisualObservation>;
}

export type VisualAnalysisAvailability = { available: true; analyzer: ProgressPhotoAnalyzer } | { available: false; reason: string };

/** Aucun fournisseur réel n'est branché : l'analyse est désactivée. */
const CONNECTED_ANALYZER: ProgressPhotoAnalyzer | null = null;

export function visualAnalysisAvailability(analyzer: ProgressPhotoAnalyzer | null = CONNECTED_ANALYZER): VisualAnalysisAvailability {
  if (!analyzer) {
    return {
      available: false,
      reason: 'Analyse visuelle désactivée : aucun service n’est connecté. VYRO compare tes photos côte à côte, sans les interpréter, et elles restent sur ton iPhone.',
    };
  }
  return { available: true, analyzer };
}
