import { proteinGuide, PROTEIN_G_PER_KG } from '../../domain/nutrition/advice';
import { indexPreferences } from '../../domain/nutrition/foods';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { NUTRITION_DISCLAIMER } from './labels';
import { useNutritionToday } from './useNutritionToday';

const fmt = (value: number) => value.toLocaleString('fr-FR');

export function ProteinScreen() {
  const nutrition = useNutritionToday();
  if (!nutrition) return null;
  const preferences = nutrition.profile?.foods ?? { liked: [], tolerated: [], refused: [] };
  const guide = proteinGuide(nutrition.weightKg, preferences);
  const index = indexPreferences(preferences);

  return (
    <Screen title="Protéines" subtitle="Nutrition">
      <Card>
        <h2 className="font-semibold text-snow">L’essentiel, sans compter</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
          <li>Une source de protéines à chaque repas : c’est plus simple et plus efficace que de tout manger d’un coup.</li>
          <li>Après la musculation : un repas ou une collation avec protéines dans les deux heures.</li>
          <li>Les légumineuses (lentilles, pois chiches) avec un féculent (riz, pain, semoule) sont une solution très économique.</li>
          <li>Les compléments (poudres) ne sont pas indispensables quand les repas en apportent déjà.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Repère général</h2>
        <p className="mt-1 text-sm text-mist">
          Les recommandations pour les sportifs (ACSM, Academy of Nutrition and Dietetics, Dietitians of Canada, 2016) situent les besoins
          entre {fmt(PROTEIN_G_PER_KG.min)} et {fmt(PROTEIN_G_PER_KG.max)} g par kg de poids et par jour.
        </p>
        {guide.range ? (
          <p className="mt-2 text-sm text-snow">
            Avec ta dernière pesée ({fmt(nutrition.weightKg ?? 0)} kg) : environ {guide.range.min} à {guide.range.max} g par jour, à titre
            indicatif.
          </p>
        ) : (
          <p className="mt-2 text-sm text-mist">Enregistre une pesée dans ton profil pour voir ce repère à ton poids.</p>
        )}
        <p className="mt-2 text-xs text-mist">
          VYRO ne compte pas tes apports et ne calcule pas la composition de tes repas : ce repère sert seulement de culture générale.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold text-snow">Sources économiques</h2>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Sources de protéines">
          {guide.sources.map((food) => (
            <li
              key={food.id}
              className={`rounded-full px-3 py-1 text-sm ${index.status(food.id) === 'liked' ? 'bg-volt-600/25 text-snow' : 'bg-ink-800 text-snow'}`}
            >
              {food.name}
              {index.status(food.id) === 'liked' ? ' ★' : ''}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-mist">★ aliments que tu aimes. Tes aliments refusés ne sont pas proposés.</p>
      </Card>
      <p className="text-xs text-mist">{NUTRITION_DISCLAIMER}</p>
    </Screen>
  );
}
