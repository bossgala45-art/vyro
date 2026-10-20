import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function CoachScreen() {
  return (
    <Screen title="Coach" subtitle="Conseils">
      <ModulePlaceholder
        step={8}
        planned={[
          'Messages fondés sur tes données réelles',
          'Réponses aux questions prévues (pourquoi ma séance a changé…)',
          'Bilan automatique tous les 14 jours',
        ]}
      />
    </Screen>
  );
}
