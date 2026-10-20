import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function SettingsScreen() {
  return (
    <Screen title="Réglages" subtitle="Application">
      <ModulePlaceholder
        step={9}
        planned={[
          'Confidentialité et verrouillage local (étape 2)',
          'Sauvegarde chiffrée et restauration contrôlée',
          'Notifications réellement disponibles sur iPhone',
        ]}
      />
    </Screen>
  );
}
