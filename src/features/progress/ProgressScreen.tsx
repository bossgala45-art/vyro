import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function ProgressScreen() {
  return (
    <Screen title="Progrès" subtitle="Transformation">
      <ModulePlaceholder
        step={7}
        planned={[
          'Poids et mensurations avec graphiques',
          'Photos de progression stockées uniquement sur ton iPhone',
          'Comparaison avant / après',
        ]}
      />
    </Screen>
  );
}
