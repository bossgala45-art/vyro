import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function TrainingScreen() {
  return (
    <Screen title="Séances" subtitle="Musculation">
      <ModulePlaceholder
        step={3}
        planned={[
          'Programme généré selon tes disponibilités et tes matchs',
          'Enregistrement des séries, charges et ressenti',
          'Progression prudente et records personnels',
        ]}
      />
    </Screen>
  );
}
