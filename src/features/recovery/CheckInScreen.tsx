import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useCheckIns } from '../../data/hooks';
import { recoveryRepository } from '../../data/repositories/recoveryRepository';
import { validateCheckIn, type CheckInErrors } from '../../domain/recovery/engine';
import { BODY_ZONES, type BodyZone, type CheckIn, type SorenessLevel } from '../../domain/recovery/types';
import { ZONE_LABELS } from '../../domain/recovery/zones';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ChoiceGroup, MultiChoice, TextAreaField, TextField } from '../../ui/fields';
import { ScaleField } from '../../ui/ScaleField';
import { Screen } from '../../ui/Screen';
import { parseNumber } from '../training/format';
import { SORENESS_LABELS } from './labels';

export function CheckInScreen() {
  const checkIns = useCheckIns();
  if (!checkIns) return null;
  const existing = checkIns.find((item) => item.date === todayIso());
  return <CheckInForm key={existing?.updatedAt ?? 'new'} existing={existing} />;
}

type PainAnswer = 'yes' | 'no' | '';

function CheckInForm({ existing }: { existing: CheckIn | undefined }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [sleep, setSleep] = useState(existing?.sleepHours === null || !existing ? '' : String(existing.sleepHours).replace('.', ','));
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [motivation, setMotivation] = useState<number | null>(existing?.motivation ?? null);
  const [soreness, setSoreness] = useState<SorenessLevel | ''>(existing?.soreness ?? '');
  const [pain, setPain] = useState<PainAnswer>(existing?.pain === true ? 'yes' : existing?.pain === false ? 'no' : '');
  const [painZones, setPainZones] = useState<BodyZone[]>(existing?.painZones ?? []);
  const [painIntensity, setPainIntensity] = useState<number | null>(existing?.painIntensity ?? null);
  const [minutes, setMinutes] = useState(existing?.availableMinutes == null ? '' : String(existing.availableMinutes));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<CheckInErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const now = nowIso();
    const sleepHours = sleep.trim() === '' ? null : (parseNumber(sleep) ?? NaN);
    const availableMinutes = minutes.trim() === '' ? null : /^\d+$/.test(minutes.trim()) ? Number(minutes) : NaN;
    const checkIn: CheckIn = {
      date: todayIso(),
      sleepHours,
      energy,
      motivation,
      soreness: soreness || null,
      pain: pain === '' ? null : pain === 'yes',
      painZones: pain === 'yes' ? painZones : [],
      painIntensity: pain === 'yes' ? painIntensity : null,
      availableMinutes,
      notes: notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const found = validateCheckIn(checkIn);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setFailure(null);
    try {
      await recoveryRepository.save(checkIn);
      const seance = params.get('seance');
      navigate(`/recuperation/aujourdhui${seance ? `?seance=${seance}` : ''}`, { replace: true });
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Check-in non enregistré.');
      setSaving(false);
    }
  };

  return (
    <Screen title="Check-in" subtitle="Récupération">
      <p className="text-sm text-mist">30 secondes pour adapter ta journée. Réponds à ce que tu sais : une question sans réponse n’est jamais devinée.</p>
      <Card>
        <div className="space-y-6">
          <TextField
            name="sleep"
            label="Sommeil cette nuit"
            inputMode="decimal"
            placeholder="ex. 7,5"
            suffix="h"
            value={sleep}
            onChange={setSleep}
            error={errors.sleepHours}
          />
          <ScaleField name="energy" label="Énergie" hint="1 = vidé, 10 = au top" value={energy} onChange={setEnergy} error={errors.energy} />
          <ScaleField name="motivation" label="Motivation" value={motivation} onChange={setMotivation} error={errors.motivation} />
          <ChoiceGroup<SorenessLevel>
            name="soreness"
            label="Courbatures"
            columns={2}
            value={soreness}
            onChange={setSoreness}
            options={(Object.entries(SORENESS_LABELS) as [SorenessLevel, string][]).map(([value, label]) => ({ value, label }))}
          />
          <ChoiceGroup<'yes' | 'no'>
            name="pain"
            label="Douleur inhabituelle ? (pas de simples courbatures)"
            columns={2}
            value={pain}
            onChange={setPain}
            options={[
              { value: 'no', label: 'Non' },
              { value: 'yes', label: 'Oui' },
            ]}
          />
          {pain === 'yes' && (
            <>
              <MultiChoice<BodyZone>
                name="painZones"
                label="Où ?"
                options={BODY_ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] }))}
                values={painZones}
                onChange={setPainZones}
              />
              <ScaleField
                name="painIntensity"
                label="Intensité de la douleur"
                hint="1 = gêne légère, 10 = très forte"
                value={painIntensity}
                onChange={setPainIntensity}
                error={errors.painIntensity}
              />
            </>
          )}
          <TextField
            name="availableMinutes"
            label="Temps disponible aujourd’hui (facultatif)"
            inputMode="numeric"
            suffix="min"
            value={minutes}
            onChange={setMinutes}
            error={errors.availableMinutes}
          />
          <TextAreaField name="checkin-notes" label="Notes (facultatif)" value={notes} onChange={setNotes} maxLength={300} />
        </div>
      </Card>
      {failure && (
        <Alert tone="error" title="Check-in non enregistré">
          {failure} Tes réponses sont conservées : tu peux réessayer.
        </Alert>
      )}
      <Button block busy={saving} onClick={() => void save()}>
        Voir mon conseil du jour
      </Button>
    </Screen>
  );
}
