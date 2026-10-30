import { useState } from 'react';
import { todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useSettings } from '../../data/hooks';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { buildIcs } from '../../domain/calendar/ics';
import { reminderEvents, reminderTimes, validateHydration, type HydrationErrors } from '../../domain/nutrition/hydration';
import { DEFAULT_HYDRATION, REMINDER_INTERVALS, type HydrationSettings } from '../../domain/nutrition/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ChoiceGroup, TextField, Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { deliverIcs } from '../calendar/deliverIcs';
import { formatTime } from './labels';

export function HydrationSettingsScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return <HydrationForm initial={settings.nutrition.hydration} />;
}

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);

function HydrationForm({ initial }: { initial: HydrationSettings }) {
  const [base, setBase] = useState(String(initial.baseGoalMl));
  const [extra, setExtra] = useState(String(initial.sportExtraMl));
  const [glass, setGlass] = useState(String(initial.glassMl));
  const [enabled, setEnabled] = useState(initial.reminders.enabled);
  const [from, setFrom] = useState(initial.reminders.from);
  const [to, setTo] = useState(initial.reminders.to);
  const [every, setEvery] = useState(String(initial.reminders.everyMinutes));
  const [errors, setErrors] = useState<HydrationErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const current = (): HydrationSettings => ({
    baseGoalMl: toInt(base),
    sportExtraMl: toInt(extra),
    glassMl: toInt(glass),
    reminders: { enabled, from, to, everyMinutes: Number(every) },
  });

  const save = async (next: HydrationSettings) => {
    const found = validateHydration(next);
    setErrors(found);
    setMessage(null);
    setFailure(null);
    if (Object.keys(found).length > 0) return false;
    try {
      await settingsRepository.update((settings) => ({ ...settings, nutrition: { ...settings.nutrition, hydration: next } }));
      setMessage('Réglages enregistrés.');
      return true;
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Réglages non enregistrés.');
      return false;
    }
  };

  const reset = async () => {
    const defaults = { ...DEFAULT_HYDRATION, reminders: { ...DEFAULT_HYDRATION.reminders } };
    if (await save(defaults)) {
      setBase(String(defaults.baseGoalMl));
      setExtra(String(defaults.sportExtraMl));
      setGlass(String(defaults.glassMl));
      setEnabled(defaults.reminders.enabled);
      setFrom(defaults.reminders.from);
      setTo(defaults.reminders.to);
      setEvery(String(defaults.reminders.everyMinutes));
    }
  };

  const exportReminders = async () => {
    const next = current();
    const found = validateHydration(next);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const outcome = await deliverIcs(buildIcs(reminderEvents(next.reminders, todayIso()), new Date()), 'vyro-hydratation.ics', 'Rappels VYRO');
    setMessage(
      outcome === 'cancelled'
        ? null
        : 'Fichier prêt : ajoute-le au Calendrier de l’iPhone. Les rappels sonneront même VYRO fermé ; supprime l’événement répété pour les arrêter.',
    );
  };

  const preview = (() => {
    const next = current();
    return Object.keys(validateHydration(next)).length === 0 ? reminderTimes(next.reminders) : [];
  })();

  return (
    <Screen title="Hydratation" subtitle="Réglages">
      <Alert tone="info">
        Repères généraux, à adapter à ta soif, à la chaleur et à l’intensité : par défaut 2 L de boissons par jour (l’EFSA retient 2,5 L
        d’eau par jour pour un homme adulte, dont une partie vient des aliments) et 0,5 L de plus par séance de sport.
      </Alert>
      <Card>
        <div className="space-y-4">
          <TextField name="hydration-base" label="Repère quotidien" inputMode="numeric" suffix="ml" value={base} onChange={setBase} error={errors.baseGoalMl} />
          <TextField
            name="hydration-extra"
            label="En plus par séance de sport"
            hint="Basket ou musculation, deux séances au plus comptées par jour."
            inputMode="numeric"
            suffix="ml"
            value={extra}
            onChange={setExtra}
            error={errors.sportExtraMl}
          />
          <TextField name="hydration-glass" label="Taille de ton verre" inputMode="numeric" suffix="ml" value={glass} onChange={setGlass} error={errors.glassMl} />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Rappels</h2>
        <div className="mt-3 space-y-4">
          <Toggle
            label="Rappels dans VYRO"
            description="Affichés quand l’application est ouverte, si tu n’as rien noté depuis l’intervalle choisi."
            checked={enabled}
            onChange={setEnabled}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField name="hydration-from" label="De" type="time" value={from} onChange={setFrom} />
            <TextField name="hydration-to" label="À" type="time" value={to} onChange={setTo} />
          </div>
          <ChoiceGroup<string>
            name="hydration-every"
            label="Toutes les"
            columns={2}
            value={every}
            onChange={setEvery}
            error={errors.reminders}
            options={REMINDER_INTERVALS.map((minutes) => ({ value: String(minutes), label: `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ''}` }))}
          />
          {preview.length > 0 && <p className="text-xs text-mist">Horaires : {preview.map(formatTime).join(', ')}.</p>}
        </div>
      </Card>

      {message && <Alert tone="info">{message}</Alert>}
      {failure && <Alert tone="error">{failure}</Alert>}
      <Button block onClick={() => void save(current())}>
        Enregistrer
      </Button>

      <Card>
        <h2 className="font-semibold text-snow">Rappels quand VYRO est fermé</h2>
        <p className="mt-1 text-sm text-mist">
          Une application web ne peut pas programmer elle-même de notification sur iPhone sans serveur. À la place, exporte ces horaires vers
          le Calendrier de l’iPhone : ses alertes fonctionnent même quand VYRO est fermé.
        </p>
        <Button variant="secondary" block className="mt-3" onClick={() => void exportReminders()}>
          Exporter les rappels vers le Calendrier
        </Button>
      </Card>
      <Button variant="ghost" block onClick={() => void reset()}>
        Revenir aux valeurs par défaut
      </Button>
    </Screen>
  );
}
