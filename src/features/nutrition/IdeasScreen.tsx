import { useState } from 'react';
import { Link } from 'react-router';
import { IDEA_MOMENTS, suggestMeals, type IdeaMoment } from '../../domain/nutrition/meals';
import { Alert } from '../../ui/Alert';
import { Card } from '../../ui/Card';
import { ChoiceGroup } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { MOMENT_LABELS, NUTRITION_DISCLAIMER } from './labels';
import { useNutritionToday } from './useNutritionToday';

const FAMILY_TIPS = [
  'Au repas de famille : sers-toi bien en féculents (pâtes, riz, pommes de terre, pain) et prends ta part de viande, poisson ou œufs.',
  'Les légumes passent mieux mixés (soupe, sauce tomate) ou mélangés (omelette, pâtes) : pas besoin de les aimer « nature ».',
  'Fruits faciles et pas chers : banane, compote, pomme. Une compote compte autant qu’un fruit à éplucher.',
  'Petit budget : œufs, lentilles, thon et sardines en boîte, lait, flocons d’avoine et légumes surgelés sont parmi les moins chers.',
];

export function IdeasScreen() {
  const nutrition = useNutritionToday();
  const [chosen, setChosen] = useState<IdeaMoment | null>(null);
  if (!nutrition) return null;
  const moment = chosen ?? nutrition.advice.moments[0] ?? 'meal';
  const preferences = nutrition.profile?.foods ?? { liked: [], tolerated: [], refused: [] };
  const { suggestions, unrecognized } = suggestMeals(moment, preferences);

  return (
    <Screen title="Idées de repas" subtitle="Nutrition">
      <ChoiceGroup<IdeaMoment>
        name="idea-moment"
        label="Pour quel moment ?"
        columns={2}
        value={moment}
        onChange={setChosen}
        options={IDEA_MOMENTS.map((value) => ({ value, label: MOMENT_LABELS[value] }))}
      />
      {nutrition.advice.moments.length > 0 && chosen === null && (
        <p className="text-xs text-mist">Moment choisi d’après ton calendrier du jour.</p>
      )}

      {preferences.refused.length > 0 && (
        <p className="text-xs text-mist">Aliments refusés écartés : {preferences.refused.join(', ')}.</p>
      )}
      {unrecognized.length > 0 && (
        <Alert tone="info">
          Non reconnus, donc pas pris en compte : {unrecognized.join(', ')}. Vérifie que les idées te conviennent.
        </Alert>
      )}

      {suggestions.length === 0 ? (
        <Alert tone="warning">Aucune idée ne respecte tous tes refus pour ce moment. Essaie un autre moment ou revois tes goûts.</Alert>
      ) : (
        <ul className="space-y-3">
          {suggestions.map(({ idea, items, removed, liked }) => (
            <li key={idea.id}>
              <Card>
                <h2 className="font-semibold text-snow">{idea.name}</h2>
                <p className="mt-1 text-sm text-snow/90">{items.map((item) => item.name).join(' · ')}</p>
                <p className="mt-1 text-sm text-mist">{idea.howTo}</p>
                {liked.length > 0 && <p className="mt-2 text-xs text-volt-400">Avec ce que tu aimes : {liked.join(', ').toLocaleLowerCase('fr')}</p>}
                {removed.length > 0 && <p className="mt-1 text-xs text-mist">Sans : {removed.join(', ').toLocaleLowerCase('fr')} (refusé)</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <h2 className="font-semibold text-snow">Astuces</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
          {FAMILY_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Card>
      <Link to="/profil/modifier/foods" className="block text-center text-sm font-medium text-volt-400">
        Modifier mes goûts
      </Link>
      <p className="text-xs text-mist">Aucune quantité n’est imposée : mange à ta faim. {NUTRITION_DISCLAIMER}</p>
    </Screen>
  );
}
