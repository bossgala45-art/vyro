interface ScaleFieldProps {
  name: string;
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string | undefined;
  min?: number;
  max?: number;
}

/** Échelle 1–10 en boutons (un second appui efface la réponse). */
export function ScaleField({ name, label, hint, value, onChange, error, min = 1, max = 10 }: ScaleFieldProps) {
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return (
    <fieldset id={`field-${name}`} className="space-y-1.5">
      <legend className="mb-1.5 text-sm font-medium text-snow">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            aria-label={`${label} : ${option}`}
            onClick={() => onChange(value === option ? null : option)}
            className={`min-h-11 rounded-lg text-sm font-semibold transition-colors ${
              value === option ? 'bg-volt-600 text-white' : 'bg-ink-800 text-mist active:bg-ink-700'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {hint && !error && <p className="text-xs text-mist">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-300">{error}</p>}
    </fieldset>
  );
}
