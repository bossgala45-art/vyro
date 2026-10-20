import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import type { LoggedSet, LoadType } from '../../domain/training/types';
import { validateSet } from '../../domain/training/workout';
import { parseNumber } from './format';

interface SetRowProps {
  index: number;
  set: LoggedSet;
  loadType: LoadType;
  exerciseName: string;
  onSave: (set: LoggedSet) => void;
  onReopen: () => void;
}

const RIR_OPTIONS = ['', '0', '1', '2', '3', '4', '5'];

/** Une série : saisie des répétitions, de la charge et des répétitions en réserve, puis validation. */
export function SetRow({ index, set, loadType, exerciseName, onSave, onReopen }: SetRowProps) {
  const [reps, setReps] = useState(set.reps === null ? '' : String(set.reps));
  const [load, setLoad] = useState(set.loadKg === null ? '' : String(set.loadKg).replace('.', ','));
  const [rir, setRir] = useState(set.rir === null ? '' : String(set.rir));
  const [error, setError] = useState<string | null>(null);
  const label = `${exerciseName}, série ${index + 1}`;

  if (set.done) {
    return (
      <li className="flex min-h-12 items-center gap-3 rounded-xl bg-emerald-500/10 px-3 text-sm">
        <span className="w-6 font-semibold text-emerald-300">{index + 1}</span>
        <span className="flex-1 text-snow">
          {set.reps} rép.{set.loadKg !== null ? ` × ${String(set.loadKg).replace('.', ',')} kg` : ''}
          {set.rir !== null ? ` · ${set.rir} en réserve` : ''}
        </span>
        <button type="button" onClick={onReopen} aria-label={`Modifier ${label}`} className="grid size-11 place-items-center text-mist active:text-snow">
          <Pencil aria-hidden size={16} />
        </button>
      </li>
    );
  }

  const submit = () => {
    const parsedReps = reps.trim() === '' ? null : Number.isInteger(Number(reps)) ? Number(reps) : NaN;
    const candidate: LoggedSet = {
      reps: parsedReps !== null && Number.isNaN(parsedReps) ? -1 : parsedReps,
      loadKg: loadType === 'external' ? parseNumber(load) : load.trim() === '' ? null : parseNumber(load),
      rir: rir === '' ? null : Number(rir),
      done: true,
    };
    const problem = validateSet(candidate, loadType);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onSave(candidate);
  };

  const input = 'min-h-11 w-full rounded-lg border border-ink-700 bg-ink-950 px-2 text-center text-snow focus:border-volt-500 focus:outline-none';

  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-6 text-sm font-semibold text-mist">{index + 1}</span>
        <input aria-label={`Répétitions — ${label}`} inputMode="numeric" placeholder="rép." value={reps} onChange={(e) => setReps(e.target.value)} className={input} />
        <input
          aria-label={`Charge en kg — ${label}`}
          inputMode="decimal"
          placeholder={loadType === 'external' ? 'kg' : '+kg'}
          value={load}
          onChange={(e) => setLoad(e.target.value)}
          className={input}
        />
        <select aria-label={`Répétitions en réserve — ${label}`} value={rir} onChange={(e) => setRir(e.target.value)} className={`${input} px-1`}>
          {RIR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === '' ? 'RIR' : option === '5' ? '5+' : option}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          aria-label={`Valider ${label}`}
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-volt-600 text-white active:bg-volt-500"
        >
          <Check aria-hidden size={18} />
        </button>
      </div>
      {error && <p className="pl-8 text-xs font-medium text-red-300">{error}</p>}
    </li>
  );
}
