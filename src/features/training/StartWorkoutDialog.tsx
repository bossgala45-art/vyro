import { useId, useState } from 'react';
import { templateLegDemand } from '../../domain/training/program';
import { adviseSession, weekdayOf } from '../../domain/training/schedule';
import type { SessionTemplate, Weekday, WeeklyRoutine } from '../../domain/training/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/fields';

type Feeling = 'good' | 'tired' | 'pain';

interface StartWorkoutDialogProps {
  template: SessionTemplate;
  routine: WeeklyRoutine | null;
  today: string;
  busy: boolean;
  onStart: (light: boolean) => void;
  onCancel: () => void;
}

/** Question rapide avant la séance : VYRO conseille, l'utilisateur décide (rien n'est imposé). */
export function StartWorkoutDialog({ template, routine, today, busy, onStart, onCancel }: StartWorkoutDialogProps) {
  const titleId = useId();
  const [feeling, setFeeling] = useState<Feeling | ''>('');
  const weekday = weekdayOf(today);
  const tomorrow = ((weekday + 1) % 7) as Weekday;
  const legDemand = templateLegDemand(template);
  const advice = adviseSession({
    isMatchDay: routine?.matchDays.includes(weekday) ?? false,
    isDayBeforeMatch: routine?.matchDays.includes(tomorrow) ?? false,
    legSession: legDemand === 'moderate' || legDemand === 'high',
    feeling: feeling || 'unknown',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md animate-screen-in space-y-4 rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-snow">
            {template.name}
          </h2>
          <p className="text-sm text-mist">{template.focus}</p>
        </div>
        <ChoiceGroup<Feeling>
          name="feeling"
          label="Comment te sens-tu ?"
          columns={3}
          value={feeling}
          onChange={setFeeling}
          options={[
            { value: 'good', label: 'Bien' },
            { value: 'tired', label: 'Fatigué' },
            { value: 'pain', label: 'Douleur' },
          ]}
        />
        <Alert tone={advice.mode === 'normal' ? 'info' : 'warning'} title={advice.mode === 'rest' ? 'Repos conseillé' : advice.mode === 'light' ? 'Version allégée conseillée' : 'Séance normale'}>
          <ul className="space-y-1">
            {advice.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Alert>
        <div className="flex flex-col gap-2">
          {advice.mode === 'rest' ? (
            <>
              <Button onClick={onCancel}>Je me repose aujourd’hui</Button>
              <Button variant="secondary" busy={busy} onClick={() => onStart(true)}>
                Commencer quand même la version allégée
              </Button>
            </>
          ) : advice.mode === 'light' ? (
            <>
              <Button busy={busy} onClick={() => onStart(true)}>
                Commencer la version allégée
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => onStart(false)}>
                Séance normale
              </Button>
            </>
          ) : (
            <>
              <Button busy={busy} onClick={() => onStart(false)}>
                Commencer
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => onStart(true)}>
                Version allégée
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
