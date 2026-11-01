/**
 * Point d'intégration d'un futur service d'analyse de photos de repas.
 *
 * Aucun service n'est connecté dans cette version : la photo sert seulement d'illustration
 * à la saisie manuelle et n'est jamais analysée ni transmise. Pour en brancher un plus tard :
 * - l'analyse passera par un serveur VYRO (la clé du fournisseur ne doit jamais être dans l'app) ;
 * - l'utilisateur devra l'activer explicitement, photo par photo ;
 * - un résultat restera une proposition à valider, jamais une donnée enregistrée d'office.
 */

export interface MealImageInput {
  mimeType: string;
  data: ArrayBuffer;
}

/** Proposition d'un service d'analyse, à valider par l'utilisateur. */
export interface MealImageProposal {
  description: string;
  /** Confiance annoncée par le service (0–1), affichée telle quelle. */
  confidence: number;
  provider: string;
}

export interface MealImageAnalyzer {
  readonly id: string;
  readonly label: string;
  analyze(image: MealImageInput): Promise<MealImageProposal>;
}

export type AnalysisAvailability = { available: true; analyzer: MealImageAnalyzer } | { available: false; reason: string };

/** Aucun fournisseur réel n'est branché : l'analyse est désactivée. */
const CONNECTED_ANALYZER: MealImageAnalyzer | null = null;

export function imageAnalysisAvailability(analyzer: MealImageAnalyzer | null = CONNECTED_ANALYZER): AnalysisAvailability {
  if (!analyzer) {
    return {
      available: false,
      reason: 'Analyse automatique désactivée : aucun service n’est connecté. La photo illustre ta saisie et reste sur ton iPhone.',
    };
  }
  return { available: true, analyzer };
}
