import { Camera, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { MEAL_SLOTS } from '../../domain/nutrition/types';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { HydrationCard } from './HydrationCard';
import { NUTRITION_DISCLAIMER, PORTION_LABELS, SLOT_LABELS } from './labels';
import { useNutritionToday } from './useNutritionToday';

const DAY_KIND_LABELS = { match: 'Jour de match', sport: 'Jour de sport', rest: 'Jour sans sport' } as const;

const LINKS = [
  { to: '/nutrition/idees', label: 'Idées de repas', description: 'Économiques, selon tes goûts' },
  { to: '/nutrition/proteines', label: 'Protéines', description: 'Où en trouver sans se ruiner' },
  { to: '/nutrition/historique', label: 'Mes habitudes', description: 'Repas et hydratation sur 14 jours' },
  { to: '/profil/modifier/foods', label: 'Mes goûts', description: 'Aliments aimés, tolérés et refusés' },
];

export function NutritionScreen() {
  const nutrition = useNutritionToday();
  if (!nutrition) return null;
  const { today, meals, advice } = nutrition;
  const todayMeals = meals.filter((meal) => meal.date === today);

  return (
    <Screen title="Nutrition" subtitle="Repas et hydratation">
      <HydrationCard nutrition={nutrition} />

      <Card>
        <h2 className="font-semibold text-snow">Conseils du jour</h2>
        <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-volt-400 uppercase">{DAY_KIND_LABELS[advice.kind]}</p>
        <ul className="mt-2 space-y-2 text-sm">
          {advice.tips.map((tip) => (
            <li key={tip.title}>
              <span className="font-medium text-snow">{tip.title} : </span>
              <span className="text-mist">{tip.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Journal du jour</h2>
        <p className="mt-1 text-xs text-mist">Note simplement ce que tu manges : pas de pesée, pas de calories.</p>
        <ul className="mt-3 divide-y divide-ink-700/60">
          {MEAL_SLOTS.map((slot) => {
            const entries = todayMeals.filter((meal) => meal.slot === slot);
            return (
              <li key={slot} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-snow">{SLOT_LABELS[slot]}</h3>
                  <Link
                    to={`/nutrition/repas/nouveau?moment=${slot}`}
                    aria-label={`Ajouter : ${SLOT_LABELS[slot]}`}
                    className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400"
                  >
                    {entries.length === 0 ? 'Ajouter' : '+ Ajouter'}
                  </Link>
                </div>
                {entries.map((meal) => (
                  <Link
                    key={meal.id}
                    to={`/nutrition/repas/${meal.id}`}
                    className="mt-1 flex min-h-11 items-center gap-2 rounded-xl bg-ink-800/60 px-3 py-2 text-sm active:bg-ink-800"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-snow">{meal.skipped ? 'Repas sauté' : meal.description}</span>
                      {!meal.skipped && (
                        <span className="block text-xs text-mist">
                          Portion : {meal.portion ? PORTION_LABELS[meal.portion].toLocaleLowerCase('fr') : 'non précisée'}
                          {meal.protein === true ? ' · protéines ✓' : ''}
                          {meal.fruitOrVegetable === true ? ' · fruit/légume ✓' : ''}
                        </span>
                      )}
                    </span>
                    {meal.photoId && <Camera aria-label="Avec photo" size={16} className="text-mist" />}
                    <ChevronRight aria-hidden size={16} className="text-mist" />
                  </Link>
                ))}
              </li>
            );
          })}
        </ul>
      </Card>

      <nav aria-label="Nutrition">
        <ul className="overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/80">
          {LINKS.map((link) => (
            <li key={link.to} className="border-b border-ink-700/60 last:border-b-0">
              <Link to={link.to} className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-ink-800">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-snow">{link.label}</span>
                  <span className="block truncate text-sm text-mist">{link.description}</span>
                </span>
                <ChevronRight aria-hidden size={18} className="text-mist" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="text-xs text-mist">{NUTRITION_DISCLAIMER}</p>
    </Screen>
  );
}
