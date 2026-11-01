import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { nowIso, nowLocalTime } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { nutritionRepository } from '../../data/repositories/nutritionRepository';
import { reminderState } from '../../domain/nutrition/hydration';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { newId } from '../training/format';
import { formatMl, formatTime } from './labels';
import type { NutritionToday } from './useNutritionToday';

/** Heure locale rafraîchie chaque minute (pour les rappels affichés dans l'application). */
function useLocalTime(): string {
  const [time, setTime] = useState(nowLocalTime);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(nowLocalTime()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return time;
}

export function HydrationCard({ nutrition, compact = false }: { nutrition: NutritionToday; compact?: boolean }) {
  const { today, hydration, target, drinksToday, drankMl, advice } = nutrition;
  const time = useLocalTime();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminder = reminderState(hydration.reminders, time, drinksToday, target.totalMl);
  const percent = Math.min(100, Math.round((drankMl / target.totalMl) * 100));
  const last = drinksToday[drinksToday.length - 1];

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Non enregistré.');
    } finally {
      setBusy(false);
    }
  };
  const add = (ml: number) =>
    run(() => nutritionRepository.addDrink({ id: newId(), date: today, time: nowLocalTime(), ml, createdAt: nowIso() }));

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-snow">Hydratation</h2>
        <Link to={compact ? '/nutrition' : '/nutrition/hydratation'} className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
          {compact ? 'Nutrition' : 'Réglages'}
        </Link>
      </div>
      <p className="mt-1 text-sm text-snow">
        <strong className="font-display text-2xl">{formatMl(drankMl)}</strong> <span className="text-mist">sur un repère de {formatMl(target.totalMl)}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Hydratation du jour"
        aria-valuemin={0}
        aria-valuemax={target.totalMl}
        aria-valuenow={drankMl}
        className="mt-2 h-2 overflow-hidden rounded-full bg-ink-800"
      >
        <div className="h-full rounded-full bg-volt-500 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-mist">
          Repère : {formatMl(target.baseMl)}
          {target.extraMl > 0
            ? ` + ${formatMl(target.extraMl)} (${advice.sportSessions} séance${advice.sportSessions > 1 ? 's' : ''} de sport aujourd’hui)`
            : ' (pas de sport prévu aujourd’hui)'}
          . Ordre de grandeur général, à adapter à ta soif et à la chaleur.
        </p>
      )}
      {reminder.due && (
        <div className="mt-3">
          <Alert tone="info" title="Pense à boire 💧">
            Rien de noté depuis un moment. Un verre d’eau maintenant ?
          </Alert>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button busy={busy} onClick={() => void add(hydration.glassMl)}>
          + 1 verre ({formatMl(hydration.glassMl)})
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void add(500)}>
          + 500 ml
        </Button>
      </div>
      {!compact && last && (
        <Button variant="ghost" block disabled={busy} onClick={() => void run(() => nutritionRepository.removeDrink(last.id))}>
          Annuler le dernier ajout ({formatMl(last.ml)} à {formatTime(last.time)})
        </Button>
      )}
      {!compact && hydration.reminders.enabled && reminder.next && (
        <p className="mt-1 text-xs text-mist">Prochain rappel dans VYRO : {formatTime(reminder.next)} (application ouverte).</p>
      )}
    </Card>
  );
}
