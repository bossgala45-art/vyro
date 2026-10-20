import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { StorageError } from '../../data/errors';
import { useSettings } from '../../data/hooks';
import { deleteAllData } from '../../data/maintenance';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { CURRENT_SCHEMA_VERSION } from '../../data/schema';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { LockSettings } from './LockSettings';
import { StorageSettings } from './StorageSettings';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-snow">{title}</h2>
      {children}
    </Card>
  );
}

export function SettingsScreen() {
  const settings = useSettings();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!settings) return null;

  const setHideWhenInactive = async (hideWhenInactive: boolean) => {
    setError(null);
    try {
      await settingsRepository.update((s) => ({ ...s, privacy: { ...s.privacy, hideWhenInactive } }));
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Réglage non enregistré.');
    }
  };

  const deleteEverything = async () => {
    setDeleting(true);
    try {
      await deleteAllData();
      setConfirmingDelete(false);
      navigate('/bienvenue', { replace: true });
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Suppression impossible.');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen title="Réglages" subtitle="Application">
      {error && <Alert tone="error">{error}</Alert>}

      <Section title="Confidentialité">
        <div className="space-y-4">
          <Alert tone="info" title="Tes données restent sur cet iPhone">
            Pas de compte, pas de serveur, pas de publicité, pas de statistiques d’usage. VYRO n’envoie aucune donnée
            personnelle sur Internet.
          </Alert>
          <Toggle
            label="Masquer l’écran en arrière-plan"
            description="Cache le contenu de VYRO dès que tu changes d’app. iOS peut toutefois capturer l’aperçu du sélecteur d’apps avant ce masquage."
            checked={settings.privacy.hideWhenInactive}
            onChange={(value) => void setHideWhenInactive(value)}
          />
        </div>
      </Section>

      <Section title="Verrouillage par code">
        <LockSettings settings={settings} />
      </Section>

      <Section title="Stockage">
        <StorageSettings />
      </Section>

      <Section title="Sauvegardes">
        <p className="text-sm text-mist">
          L’export chiffré et la restauration de tes données arrivent à l’étape 9. En attendant, tes données n’existent que
          sur cet iPhone.
        </p>
      </Section>

      <Section title="Effacer mes données">
        <p className="mb-3 text-sm text-mist">
          Supprime définitivement ton profil, tes pesées et tes réglages de cet iPhone. Aucune copie n’existe ailleurs.
        </p>
        <Button variant="danger" block onClick={() => setConfirmingDelete(true)}>
          Effacer toutes mes données
        </Button>
      </Section>

      <p className="pt-2 text-center text-xs text-mist">
        VYRO {__APP_VERSION__} · données v{CURRENT_SCHEMA_VERSION}
      </p>

      <ConfirmDialog
        open={confirmingDelete}
        title="Effacer toutes tes données ?"
        confirmLabel="Tout effacer"
        tone="danger"
        requireText="EFFACER"
        busy={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void deleteEverything()}
      >
        <p>Profil, pesées et réglages seront supprimés de cet iPhone. Cette action est irréversible.</p>
      </ConfirmDialog>
    </Screen>
  );
}
