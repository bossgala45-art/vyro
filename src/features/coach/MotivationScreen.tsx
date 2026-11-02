import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useMotivation, useProfile } from '../../data/hooks';
import { coachRepository } from '../../data/repositories/coachRepository';
import { frDate } from '../../domain/coach/facts';
import { MOTIVATION_TEXT_MAX, validateMotivation } from '../../domain/coach/state';
import type { MotivationEntry } from '../../domain/coach/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextAreaField } from '../../ui/fields';
import { ScaleField } from '../../ui/ScaleField';
import { Screen } from '../../ui/Screen';
import { newId } from '../training/format';

export function MotivationScreen() {
  const entries = useMotivation();
  const profile = useProfile();
  const [motivation, setMotivation] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<MotivationEntry | null>(null);
  if (!entries || profile === undefined) return null;

  const save = async () => {
    const entry: MotivationEntry = { id: newId(), date: todayIso(), motivation, text: text.trim(), createdAt: nowIso() };
    const found = validateMotivation(entry);
    setError(found ?? undefined);
    if (found) return;
    setSaving(true);
    setFailure(null);
    try {
      await coachRepository.addMotivation(entry);
      setText('');
      setMotivation(null);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Note non enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await coachRepository.removeMotivation(toDelete.id);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Suppression impossible.');
    }
    setToDelete(null);
  };

  return (
    <Screen title="Motivation" subtitle="Journal">
      <p className="text-sm text-mist">
        Note pourquoi tu t’entraînes, ce qui te fait plaisir, ce que tu veux atteindre. Les jours de motivation basse, le coach te rappelle tes
        propres mots.
      </p>
      {profile?.goal.notes && (
        <Card>
          <p className="text-xs font-semibold tracking-[0.14em] text-volt-400 uppercase">Ton objectif</p>
          <p className="mt-1 text-sm text-snow">{profile.goal.notes}</p>
        </Card>
      )}
      <Card>
        <div className="space-y-4">
          <ScaleField name="motivation-level" label="Motivation du moment (facultatif)" value={motivation} onChange={setMotivation} />
          <TextAreaField
            name="motivation-text"
            label="Ta note"
            placeholder="ex. Être prêt physiquement pour la saison"
            value={text}
            onChange={setText}
            maxLength={MOTIVATION_TEXT_MAX}
            error={error}
          />
        </div>
      </Card>
      {failure && <Alert tone="error">{failure}</Alert>}
      <Button block busy={saving} onClick={() => void save()}>
        Ajouter au journal
      </Button>

      {entries.length > 0 && (
        <ul aria-label="Journal de motivation" className="space-y-2">
          {[...entries].reverse().map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 rounded-2xl border border-ink-700/80 bg-ink-900/80 p-3">
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-xs text-mist">
                  {frDate(entry.date)}
                  {entry.motivation !== null ? ` · motivation ${entry.motivation}/10` : ''}
                </p>
                <p className="mt-1 text-snow">{entry.text}</p>
              </div>
              <button
                type="button"
                onClick={() => setToDelete(entry)}
                aria-label={`Supprimer la note du ${frDate(entry.date)}`}
                className="grid size-11 shrink-0 place-items-center text-mist active:text-red-300"
              >
                <Trash2 aria-hidden size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette note ?"
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      >
        <p>La note sera supprimée définitivement.</p>
      </ConfirmDialog>
    </Screen>
  );
}
