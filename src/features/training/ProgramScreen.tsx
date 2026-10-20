import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { nowIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useActiveProgram, useProfile } from '../../data/hooks';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { exerciseName } from '../../domain/training/exercises';
import { estimateMinutes, generateProgram } from '../../domain/training/program';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Screen } from '../../ui/Screen';
import { formatLoad, formatReps, formatRest, newId } from './format';

export function ProgramScreen() {
  const program = useActiveProgram();
  const profile = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (program === undefined || profile === undefined) return null;
  if (program === null) return <Navigate to="/entrainement" replace />;

  const regenerate = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const result = generateProgram({ id: newId(), now: nowIso(), profile });
      await trainingRepository.activateNewProgram(result.program);
      setWarnings(result.warnings);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Programme non régénéré.');
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Mon programme" subtitle="Musculation">
      {error && <Alert tone="error">{error}</Alert>}
      {warnings.length > 0 && (
        <Alert tone="warning" title="À noter">
          {warnings.join(' ')}
        </Alert>
      )}
      <p className="text-sm text-mist">Touche un exercice pour le modifier : exercice, séries, répétitions, repos ou charge de départ.</p>

      {program.templates.map((template) => (
        <Card key={template.key}>
          <h2 className="font-semibold text-snow">{template.name}</h2>
          <p className="text-sm text-mist">
            {template.focus} · environ {estimateMinutes(template.slots)} min
          </p>
          <ul className="mt-3 divide-y divide-ink-700/60">
            {template.slots.map((slot, index) => (
              <li key={`${slot.exerciseId}-${index}`}>
                <Link to={`/entrainement/programme/${template.key}/${index}`} className="flex min-h-14 items-center gap-3 py-2 active:bg-ink-800">
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-snow">{exerciseName(slot.exerciseId)}</span>
                    <span className="block text-xs text-mist">
                      {slot.sets} × {formatReps(slot.repMin, slot.repMax)} · repos {formatRest(slot.restSeconds)} · départ :{' '}
                      {formatLoad(slot.exerciseId, slot.startLoadKg)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden size={16} className="text-mist" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card>
        <details>
          <summary className="min-h-8 cursor-pointer font-semibold text-snow">Pourquoi ce programme ?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
            {program.rationale.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>La charge n’augmente que lorsque toutes les séries atteignent le haut de la fourchette avec des répétitions en réserve, et jamais après une douleur.</li>
          </ul>
        </details>
      </Card>

      <Button variant="secondary" block onClick={() => setConfirming(true)}>
        Régénérer le programme
      </Button>

      <ConfirmDialog
        open={confirming}
        title="Régénérer le programme ?"
        confirmLabel="Régénérer"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void regenerate()}
      >
        <p>Un nouveau programme sera créé depuis ton profil actuel. Tes modifications manuelles seront remplacées ; l’historique de tes séances est conservé.</p>
      </ConfirmDialog>
    </Screen>
  );
}
