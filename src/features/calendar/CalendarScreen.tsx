import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function CalendarScreen() {
  return (
    <Screen title="Calendrier" subtitle="Planning">
      <ModulePlaceholder
        step={4}
        planned={[
          'Vue semaine et mois',
          'Entraînements et matchs de basket récurrents',
          'Mode vacances et export vers le Calendrier iPhone (ICS)',
        ]}
      />
    </Screen>
  );
}
