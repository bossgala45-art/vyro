import { WEEKDAYS, type Weekday } from '../../domain/training/types';
import { WEEKDAY_SHORT } from './format';

interface WeekdayPickerProps {
  label: string;
  hint?: string;
  values: readonly Weekday[];
  onChange: (values: Weekday[]) => void;
}

export function WeekdayPicker({ label, hint, values, onChange }: WeekdayPickerProps) {
  const toggle = (day: Weekday) =>
    onChange(values.includes(day) ? values.filter((item) => item !== day) : [...values, day].sort((a, b) => a - b));
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-sm font-medium text-snow">{label}</legend>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => {
          const checked = values.includes(day);
          return (
            <label
              key={day}
              className={`grid min-h-12 cursor-pointer place-items-center rounded-xl border text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-volt-400 ${
                checked ? 'border-volt-500 bg-volt-600/25 font-semibold text-snow' : 'border-ink-700 bg-ink-950 text-mist'
              }`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(day)} className="sr-only" aria-label={`${label} : ${WEEKDAY_SHORT[day]}`} />
              {WEEKDAY_SHORT[day]}
            </label>
          );
        })}
      </div>
      {hint && <p className="text-xs text-mist">{hint}</p>}
    </fieldset>
  );
}
