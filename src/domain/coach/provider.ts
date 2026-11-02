import { answerIntent, matchIntent, unsupportedAnswer, type IntentId } from './intents';
import type { CoachAnswer, CoachContext } from './types';

/**
 * Architecture prévue pour brancher plus tard une véritable IA, sans rien changer à l'interface.
 *
 * - Le coach passe toujours par un `CoachProvider`.
 * - Aujourd'hui, seul `localRulesCoach` existe : règles documentées, aucune IA, aucun réseau.
 * - Un futur fournisseur distant appellera un **backend VYRO** (jamais l'API d'un fournisseur
 *   directement) : la clé reste sur le serveur, jamais dans l'application. Il ne recevra qu'un
 *   résumé minimal (`CoachSummary`) et seulement après un accord explicite de l'utilisateur.
 * - Tant qu'aucun backend n'est configuré, `remoteCoachAvailability()` répond « indisponible ».
 */

export interface CoachQuestion {
  text: string;
  /** Question proposée (bouton) ; `null` pour une question libre. */
  intent: IntentId | null;
}

export interface CoachProvider {
  readonly id: string;
  readonly label: string;
  answer(question: CoachQuestion, context: CoachContext): Promise<CoachAnswer & { intent: IntentId | null }>;
}

export const localRulesCoach: CoachProvider = {
  id: 'local-rules',
  label: 'Règles locales (sans IA)',
  answer(question, context) {
    const intent = question.intent ?? matchIntent(question.text);
    if (!intent) return Promise.resolve({ ...unsupportedAnswer(question.text), intent: null });
    return Promise.resolve({ ...answerIntent(intent, context), intent });
  },
};

/** Données minimales qu'un futur backend pourrait recevoir (jamais de photo, jamais de nom). */
export interface CoachSummary {
  goalType: string | null;
  daysToGoal: number | null;
  sessionsLast28Days: number;
  readinessLevel: string;
}

/** Aucun backend IA n'est configuré dans cette version. */
const REMOTE_COACH_ENDPOINT: string | null = null;

export function remoteCoachAvailability(endpoint: string | null = REMOTE_COACH_ENDPOINT): { available: boolean; reason: string } {
  return endpoint
    ? { available: true, reason: 'Service distant configuré.' }
    : { available: false, reason: 'Aucune IA connectée : le coach utilise uniquement des règles locales, et rien ne quitte ton iPhone.' };
}
