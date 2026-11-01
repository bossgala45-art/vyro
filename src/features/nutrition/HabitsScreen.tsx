import { summarizeHabits, type Share } from '../../domain/nutrition/habits';
import { MEAL_SLOTS } from '../../domain/nutrition/types';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { formatShortDate } from '../training/format';
import { formatMl, SLOT_LABELS } from './labels';
import { useNutritionToday } from './useNutritionToday';

const DAYS = 14;

function shareText(value: Share): string {
  if (value.answered === 0) return 'pas encore de réponse';
  return `${value.yes} repas sur ${value.answered}${value.unknown > 0 ? ` (${value.unknown} sans réponse)` : ''}`;
}

export function HabitsScreen() {
  const nutrition = useNutritionToday();
  if (!nutrition) return null;
  const week = summarizeHabits(nutrition.meals, nutrition.drinks, nutrition.today, 7);
  const history = summarizeHabits(nutrition.meals, nutrition.drinks, nutrition.today, DAYS);
  const { portions } = week;

  return (
    <Screen title="Mes habitudes" subtitle="Nutrition">
      <Card>
        <h2 className="font-semibold text-snow">7 derniers jours</h2>
        {week.daysLogged === 0 && week.hydration.daysLogged === 0 ? (
          <p className="mt-1 text-sm text-mist">Rien de noté pour l’instant : les habitudes apparaîtront au fil de ton journal.</p>
        ) : (
          <dl className="mt-2 divide-y divide-ink-700/60 text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-mist">Jours avec repas notés</dt>
              <dd className="text-snow">{week.daysLogged} / 7</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-mist">Petit-déjeuner</dt>
              <dd className="text-right text-snow">
                pris {week.breakfast.eaten} fois, sauté {week.breakfast.skipped} fois
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-mist">Avec protéines</dt>
              <dd className="text-right text-snow">{shareText(week.protein)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-mist">Avec fruit ou légume</dt>
              <dd className="text-right text-snow">{shareText(week.fruitOrVegetable)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-mist">Portions ressenties</dt>
              <dd className="text-right text-snow">
                {portions.small} petite(s), {portions.normal} normale(s), {portions.large} grande(s)
                {portions.unknown > 0 ? `, ${portions.unknown} non précisée(s)` : ''}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-mist">Hydratation moyenne</dt>
              <dd className="text-right text-snow">
                {week.hydration.averageMl === null
                  ? 'pas de boisson notée'
                  : `${formatMl(week.hydration.averageMl)} (sur ${week.hydration.daysLogged} jour${week.hydration.daysLogged > 1 ? 's' : ''} notés)`}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-2 text-xs text-mist">
          Calculé uniquement sur ce que tu as noté : un jour ou une réponse manquants ne sont jamais comptés comme « non ».
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Jour par jour ({DAYS} jours)</h2>
        <ul className="mt-2 divide-y divide-ink-700/60 text-sm">
          {[...history.days].reverse().map((day) => (
            <li key={day.date} className="py-2">
              <p className="font-medium text-snow">{formatShortDate(day.date)}</p>
              <p className="text-xs text-mist">
                {day.eaten.length + day.skipped.length === 0
                  ? 'Aucun repas noté'
                  : MEAL_SLOTS.filter((slot) => day.eaten.includes(slot) || day.skipped.includes(slot))
                      .map((slot) => `${SLOT_LABELS[slot]}${day.eaten.includes(slot) ? '' : ' (sauté)'}`)
                      .join(' · ')}
              </p>
              <p className="text-xs text-mist">{day.drankMl === null ? 'Hydratation non notée' : `Bu : ${formatMl(day.drankMl)}`}</p>
            </li>
          ))}
        </ul>
      </Card>
    </Screen>
  );
}
