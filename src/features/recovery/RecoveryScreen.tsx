import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { Screen } from '../../ui/Screen';

export function RecoveryScreen() {
  return (
    <Screen title="Récupération" subtitle="Check-in">
      <ModulePlaceholder
        step={5}
        planned={[
          'Check-in rapide avant chaque séance',
          'Suivi du sommeil, de l’énergie et des courbatures',
          'Recommandation explicable : normale, adaptée, légère ou repos',
        ]}
      />
    </Screen>
  );
}
