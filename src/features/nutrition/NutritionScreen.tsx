import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function NutritionScreen() {
  return (
    <Screen title="Nutrition" subtitle="Repas et hydratation">
      <ModulePlaceholder
        step={6}
        planned={[
          'Journal alimentaire simple, sans comptage de calories',
          'Idées de repas économiques selon tes goûts',
          'Suivi de l’hydratation',
        ]}
      />
    </Screen>
  );
}
