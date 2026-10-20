import { Plus, X } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

const inputClass =
  'w-full min-h-12 rounded-xl border bg-ink-950 px-3 text-snow placeholder:text-mist/60 transition-colors focus:border-volt-500 focus:outline-none';

function borderFor(error?: string) {
  return error ? 'border-red-500/70' : 'border-ink-700';
}

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-snow">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-mist">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
  suffix?: string;
  /** Identifiant stable, utile pour placer le focus sur le premier champ en erreur. */
  name: string;
}

export function TextField({ label, value, onChange, hint, error, suffix, name, ...props }: TextFieldProps) {
  const id = `field-${name}`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`${inputClass} ${borderFor(error)} ${suffix ? 'pr-12' : ''}`}
          {...props}
        />
        {suffix && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-mist">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

interface TextAreaFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
  maxLength?: number;
  placeholder?: string;
}

export function TextAreaField({ name, label, value, onChange, hint, error, maxLength, placeholder }: TextAreaFieldProps) {
  const id = `field-${name}`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        name={name}
        value={value}
        rows={3}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} ${borderFor(error)} py-3`}
      />
    </FieldShell>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface ChoiceGroupProps<T extends string> {
  name: string;
  label: string;
  options: readonly Option<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string | undefined;
  columns?: 1 | 2 | 3;
}

/** Choix unique sous forme de grosses cases faciles à toucher (boutons radio natifs). */
export function ChoiceGroup<T extends string>({ name, label, options, value, onChange, error, columns = 2 }: ChoiceGroupProps<T>) {
  const id = `field-${name}`;
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[columns];
  return (
    <fieldset id={id} aria-describedby={error ? `${id}-error` : undefined} className="space-y-1.5">
      <legend className="mb-1.5 text-sm font-medium text-snow">{label}</legend>
      <div className={`grid gap-2 ${grid}`}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-volt-400 ${
                checked ? 'border-volt-500 bg-volt-600/20 text-snow' : `${borderFor(error)} bg-ink-950 text-mist`
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className={checked ? 'font-semibold' : 'font-medium'}>{option.label}</span>
              {option.description && <span className="text-xs text-mist">{option.description}</span>}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-300">
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface MultiChoiceProps<T extends string> {
  name: string;
  label: string;
  options: readonly Option<T>[];
  values: readonly T[];
  onChange: (values: T[]) => void;
  hint?: string;
  error?: string | undefined;
}

export function MultiChoice<T extends string>({ name, label, options, values, onChange, hint, error }: MultiChoiceProps<T>) {
  const id = `field-${name}`;
  const toggle = (value: T) =>
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  return (
    <fieldset id={id} className="space-y-1.5">
      <legend className="mb-1.5 text-sm font-medium text-snow">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-volt-400 ${
                checked ? 'border-volt-500 bg-volt-600/20 font-semibold text-snow' : 'border-ink-700 bg-ink-950 text-mist'
              }`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(option.value)} className="sr-only" />
              {option.label}
            </label>
          );
        })}
      </div>
      {hint && !error && <p className="text-xs text-mist">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-300">{error}</p>}
    </fieldset>
  );
}

interface TagInputProps {
  name: string;
  label: string;
  values: readonly string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | undefined;
}

/** Liste libre (aliments, exercices) : saisir puis « Ajouter » ou touche Entrée. */
export function TagInput({ name, label, values, onAdd, onRemove, placeholder, hint, error }: TagInputProps) {
  const [text, setText] = useState('');
  const id = `field-${name}`;
  const listId = useId();
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText('');
  };
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="flex gap-2">
        <input
          id={id}
          name={name}
          value={text}
          placeholder={placeholder}
          enterKeyHint="done"
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          aria-describedby={describedBy(id, hint, error)}
          aria-invalid={error ? true : undefined}
          className={`${inputClass} ${borderFor(error)}`}
        />
        <button
          type="button"
          onClick={submit}
          aria-label={`Ajouter à « ${label} »`}
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-ink-800 text-volt-400 active:bg-ink-700"
        >
          <Plus aria-hidden size={20} />
        </button>
      </div>
      {values.length > 0 && (
        <ul id={listId} aria-label={`Liste : ${label}`} className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <li key={value} className="inline-flex items-center gap-1 rounded-full bg-ink-800 py-1 pr-1 pl-3 text-sm text-snow">
              {value}
              <button
                type="button"
                onClick={() => onRemove(value)}
                aria-label={`Retirer ${value}`}
                className="grid size-8 place-items-center rounded-full text-mist active:bg-ink-700 active:text-snow"
              >
                <X aria-hidden size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </FieldShell>
  );
}

interface ToggleProps {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p id={`${id}-label`} className="text-sm font-medium text-snow">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-xs text-mist">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-13 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-volt-600' : 'bg-ink-700'}`}
      >
        <span
          aria-hidden
          className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

/** Place le focus sur le premier champ en erreur après une validation ratée. */
export function focusFirstError(fields: readonly string[], errors: Partial<Record<string, string>>): void {
  const first = fields.find((field) => errors[field]);
  if (!first) return;
  const element = document.getElementById(`field-${first}`);
  if (!element) return;
  element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  const focusable = element.matches('input, textarea, select') ? element : element.querySelector<HTMLElement>('input');
  focusable?.focus({ preventScroll: true });
}
