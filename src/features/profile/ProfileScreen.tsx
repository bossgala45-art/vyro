import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function ProfileScreen() {
  return (
    <Screen title="Profil" subtitle="Toi">
      <ModulePlaceholder
        step={2}
        planned={[
          'Configuration initiale du profil sportif',
          'Préférences d’exercices, de matériel et d’aliments',
          'Date d’objectif personnalisable',
        ]}
      />
    </Screen>
  );
}
