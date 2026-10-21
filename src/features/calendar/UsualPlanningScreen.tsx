import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useCalendarData } from '../../data/hooks';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { isLocalTime, toMinutes } from '../../domain/calendar/time';
import type { GymSlot, PlanningSettings } from '../../domain/calendar/types';
import { WEEKDAY_LABELS } from '../../domain/training/schedule';
import { WEEKDAYS, type Weekday } from '../../domain/training/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { formatTimeRange, KIND_LABELS } from './labels';

export function UsualPlanningScreen() {
  const data = useCalendarData();
  if (!data) return null;
  const today = todayIso();
  const recurring = data.activities
    .filter((activity) => activity.recurrence && (activity.recurrence.until === null || activity.recurrence.until >= today))
    .sort((a, b) => (a.recurrence?.weekday ?? 0) - (b.recurrence?.weekday ?? 0) || (a.startTime ?? '').localeCompare(b.startTime ?? ''));

  return (
    <Screen title="Planning habituel" subtitle="Calendrier">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-snow">Basket et activités habituelles</h2>
          <Link to="/calendrier/activite/nouvelle" className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
            + Ajouter
          </Link>
        </div>
        {recurring.length === 0 ? (
          <p className="mt-1 text-sm text-mist">Aucune activité habituelle. Ajoute tes entraînements et tes matchs (avec « Chaque semaine »).</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink-700/60">
            {recurring.map((activity) => (
              <li key={activity.id}>
                <Link to={`/calendrier/activite/${activity.id}`} className="flex min-h-14 items-center gap-3 py-2 active:bg-ink-800">
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-snow">
                      {WEEKDAY_LABELS[activity.recurrence?.weekday ?? 0]} — {activity.title}
                    </span>
                    <span className="block text-xs text-mist">
                      {KIND_LABELS[activity.kind]} · {formatTimeRange(activity)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden size={16} className="text-mist" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <GymAvailability planning={data.planning} />
    </Screen>
  );
}

interface SlotDraft {
  enabled: boolean;
  from: string;
  to: string;
}

function GymAvailability({ planning }: { planning: PlanningSettings | null }) {
  const [slots, setSlots] = useState<Record<Weekday, SlotDraft>>(() => {
    const initial = {} as Record<Weekday, SlotDraft>;
    for (const weekday of WEEKDAYS) {
      const slot = planning?.gymSlots.find((item) => item.weekday === weekday);
      initial[weekday] = { enabled: Boolean(slot), from: slot?.from ?? '', to: slot?.to ?? '' };
    }
    return initial;
  });
  const [includeOptionalThird, setIncludeOptionalThird] = useState(planning?.includeOptionalThird ?? false);
  const [errors, setErrors] = useState<Partial<Record<Weekday, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const change = (weekday: Weekday, patch: Partial<SlotDraft>) => {
    setSlots((current) => ({ ...current, [weekday]: { ...current[weekday], ...patch } }));
    setSaved(false);
  };

  const save = async () => {
    const found: Partial<Record<Weekday, string>> = {};
    const gymSlots: GymSlot[] = [];
    for (const weekday of WEEKDAYS) {
      const slot = slots[weekday];
      if (!slot.enabled) continue;
      if (!slot.from && !slot.to) {
        gymSlots.push({ weekday, from: null, to: null });
      } else if (!isLocalTime(slot.from) || !isLocalTime(slot.to) || toMinutes(slot.to) <= toMinutes(slot.from)) {
        found[weekday] = 'Indique un début et une fin valides, ou laisse les deux vides.';
      } else {
        gymSlots.push({ weekday, from: slot.from, to: slot.to });
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setFailure(null);
    try {
      await calendarRepository.savePlanning({ id: 'me', gymSlots, includeOptionalThird, updatedAt: nowIso() });
      setSaved(true);
    } catch (e) {
      setFailure(e instanceof StorageError ? e.message : 'Disponibilités non enregistrées.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-snow">Disponibilités pour la salle</h2>
      <p className="mt-1 text-sm text-mist">
        Coche les jours possibles. Les horaires sont facultatifs : avec eux, VYRO place la séance en évitant le basket et vérifie le temps disponible.
      </p>
      <ul className="mt-3 space-y-3">
        {WEEKDAYS.map((weekday) => {
          const slot = slots[weekday];
          return (
            <li key={weekday} className="rounded-xl bg-ink-950/60 p-3">
              <label className="flex min-h-8 items-center gap-3">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={(event) => change(weekday, { enabled: event.target.checked })}
                  className="size-5 accent-[#1f5eff]"
                />
                <span className="font-medium text-snow">{WEEKDAY_LABELS[weekday]}</span>
              </label>
              {slot.enabled && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-xs text-mist">
                    De
                    <input
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[weekday]} : début`}
                      value={slot.from}
                      onChange={(event) => change(weekday, { from: event.target.value })}
                      className="mt-1 min-h-11 w-full rounded-lg border border-ink-700 bg-ink-950 px-2 text-snow"
                    />
                  </label>
                  <label className="text-xs text-mist">
                    À
                    <input
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[weekday]} : fin`}
                      value={slot.to}
                      onChange={(event) => change(weekday, { to: event.target.value })}
                      className="mt-1 min-h-11 w-full rounded-lg border border-ink-700 bg-ink-950 px-2 text-snow"
                    />
                  </label>
                  {errors[weekday] && <p className="col-span-2 text-xs text-red-300">{errors[weekday]}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <Toggle
          label="Proposer une 3e séance facultative"
          description="Haut du corps, seulement si un jour laisse assez de récupération."
          checked={includeOptionalThird}
          onChange={(value) => {
            setIncludeOptionalThird(value);
            setSaved(false);
          }}
        />
      </div>
      {failure && (
        <div className="mt-3">
          <Alert tone="error">{failure}</Alert>
        </div>
      )}
      {saved && (
        <div className="mt-3">
          <Alert tone="info">Disponibilités enregistrées : le planning est recalculé.</Alert>
        </div>
      )}
      <Button block className="mt-4" busy={saving} onClick={() => void save()}>
        Enregistrer les disponibilités
      </Button>
    </Card>
  );
}
