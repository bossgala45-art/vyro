import { useState } from 'react';
import { StorageError } from '../../data/errors';
import { useSettings } from '../../data/hooks';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { THRESHOLD_FIELDS, validateThresholds } from '../../domain/recovery/thresholds';
import { DEFAULT_THRESHOLDS, type RecoveryThresholds } from '../../domain/recovery/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { TextField } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { parseNumber } from '../training/format';
import { DISCLAIMER } from './labels';

export function ThresholdsScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return <ThresholdsForm initial={settings.recovery.thresholds} />;
}

const toText = (thresholds: RecoveryThresholds) =>
  Object.fromEntries(THRESHOLD_FIELDS.map((field) => [field.key, String(thresholds[field.key]).replace('.', ',')])) as Record<
    keyof RecoveryThresholds,
    string
  >;

function ThresholdsForm({ initial }: { initial: RecoveryThresholds }) {
  const [values, setValues] = useState(() => toText(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof RecoveryThresholds, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const save = async (thresholds: RecoveryThresholds) => {
    const found = validateThresholds(thresholds);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;
    try {
      await settingsRepository.update((current) => ({ ...current, recovery: { thresholds } }));
      setValues(toText(thresholds));
      setMessage('Repères enregistrés : les prochains conseils en tiennent compte.');
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Repères non enregistrés.');
    }
  };

  const parsed = () =>
    Object.fromEntries(THRESHOLD_FIELDS.map((field) => [field.key, parseNumber(values[field.key]) ?? NaN])) as unknown as RecoveryThresholds;

  return (
    <Screen title="Repères" subtitle="Récupération">
      <Alert tone="info">{DISCLAIMER} Les valeurs par défaut sont volontairement prudentes.</Alert>
      <Card>
        <div className="space-y-4">
          {THRESHOLD_FIELDS.map((field) => (
            <TextField
              key={field.key}
              name={`threshold-${field.key}`}
              label={field.label}
              hint={`${field.description} (par défaut : ${String(DEFAULT_THRESHOLDS[field.key]).replace('.', ',')}${field.unit ? ` ${field.unit}` : ''})`}
              inputMode="decimal"
              suffix={field.unit}
              value={values[field.key]}
              onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
              error={errors[field.key]}
            />
          ))}
        </div>
      </Card>
      {message && <Alert tone="info">{message}</Alert>}
      {failure && <Alert tone="error">{failure}</Alert>}
      <Button block onClick={() => void save(parsed())}>
        Enregistrer les repères
      </Button>
      <Button variant="ghost" block onClick={() => void save({ ...DEFAULT_THRESHOLDS })}>
        Revenir aux valeurs par défaut
      </Button>
    </Screen>
  );
}
