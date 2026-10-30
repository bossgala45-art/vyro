import type { ReadinessDecision } from '../../domain/recovery/types';
import { DISCLAIMER, LEVEL_LABELS } from './labels';

/** Décision du jour avec chaque signal observé et son effet (rien n'est caché derrière une note). */
export function ReadinessPanel({ decision, compact = false }: { decision: ReadinessDecision; compact?: boolean }) {
  const label = LEVEL_LABELS[decision.level];
  const reasons = compact ? decision.reasons.slice(0, 2) : decision.reasons;
  return (
    <div className="space-y-3">
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${label.className}`}>{label.title}</span>
      {reasons.length > 0 && (
        <ul className="space-y-1 text-sm" aria-label="Signaux pris en compte">
          {reasons.map((reason) => (
            <li key={`${reason.observation}-${reason.effect}`} className="text-snow">
              {reason.observation} <span className="text-mist">→ {reason.effect}</span>
            </li>
          ))}
          {compact && decision.reasons.length > 2 && <li className="text-mist">+ {decision.reasons.length - 2} autre(s)</li>}
        </ul>
      )}
      {decision.reasons.length === 0 && decision.level === 'normal' && (
        <p className="text-sm text-mist">Aucun signal de fatigue particulier dans tes réponses.</p>
      )}
      {decision.missing.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-snow">À compléter :</p>
          <ul className="list-disc pl-5 text-mist">
            {decision.missing.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}
      {!compact && (
        <>
          <ul className="space-y-1 text-sm text-mist">
            {decision.advice.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-xs text-mist">{DISCLAIMER}</p>
        </>
      )}
    </div>
  );
}
