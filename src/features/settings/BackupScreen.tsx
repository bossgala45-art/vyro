import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { backupFileName, exportBackup, stageRestore, type StagedRestore } from '../../data/backup';
import { StorageError } from '../../data/errors';
import { useSettings } from '../../data/hooks';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { BackupError, inspectBackup, validatePassphrase, type BackupFileInfo } from '../../security/backupCrypto';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextField, Toggle } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { shareOrDownload } from '../../ui/shareFile';
import { formatBytes } from '../progress/labels';

const TABLE_LABELS: Record<string, string> = {
  profile: 'Profil',
  bodyWeights: 'Pesées',
  settings: 'Réglages',
  programs: 'Programmes',
  workouts: 'Séances de musculation',
  activities: 'Activités du calendrier',
  exceptions: 'Séances annulées ou reportées',
  vacations: 'Vacances',
  dayOverrides: 'Ajustements de journée',
  planning: 'Planning habituel',
  activityLogs: 'Suivi basket',
  planSnapshots: 'Plannings consultés',
  checkIns: 'Check-ins',
  meals: 'Repas',
  mealPhotos: 'Photos de repas',
  drinks: 'Boissons',
  measurements: 'Mensurations',
  progressPhotos: 'Photos de progression',
  progressPhotoFiles: 'Images des photos de progression',
  motivation: 'Notes de motivation',
};

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
const describe = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'date inconnue' : dateTime.format(date);
};
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof BackupError || error instanceof StorageError ? error.message : fallback;

export function BackupScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return (
    <Screen title="Sauvegarde" subtitle="Réglages">
      <Alert tone="info" title="Comment ça marche">
        La sauvegarde contient toutes tes données, photos comprises, chiffrées avec ta phrase secrète (AES-256). Tu choisis où la
        garder : Fichiers, iCloud Drive, AirDrop vers un ordinateur… Sans la phrase secrète, personne ne peut la lire, pas même toi :
        VYRO ne peut pas la retrouver.
      </Alert>
      <ExportCard lastExportAt={settings.backup.lastExportAt} />
      <RestoreCard />
    </Screen>
  );
}

function ExportCard({ lastExportAt }: { lastExportAt: string | null }) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{ passphrase?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async () => {
    const found: typeof errors = {};
    const weak = validatePassphrase(passphrase);
    if (weak) found.passphrase = weak;
    if (confirm !== passphrase) found.confirm = 'Les deux phrases ne sont pas identiques.';
    setErrors(found);
    setMessage(null);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const bytes = await exportBackup(passphrase);
      const file = new File([bytes], backupFileName(todayIso()), { type: 'application/octet-stream' });
      const outcome = await shareOrDownload(file, 'Sauvegarde VYRO');
      if (outcome === 'cancelled') {
        setMessage('Partage annulé : aucune sauvegarde n’a été enregistrée.');
        return;
      }
      await settingsRepository.update((settings) => ({ ...settings, backup: { lastExportAt: nowIso() } }));
      setPassphrase('');
      setConfirm('');
      setMessage(
        `Sauvegarde créée (${formatBytes(bytes.byteLength)}). ${
          outcome === 'shared' ? 'Vérifie qu’elle est bien arrivée là où tu l’as envoyée.' : 'Retrouve-la dans tes téléchargements (app Fichiers).'
        }`,
      );
    } catch (error) {
      setFailure(errorMessage(error, 'Sauvegarde impossible.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-snow">Créer une sauvegarde chiffrée</h2>
      <p className="mt-1 text-sm text-mist">{lastExportAt ? `Dernière sauvegarde : ${describe(lastExportAt)}.` : 'Aucune sauvegarde pour l’instant.'}</p>
      <div className="mt-4 space-y-4">
        <TextField
          name="backup-passphrase"
          label="Phrase secrète"
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          hint="Au moins 12 caractères. Une suite de 4 mots que toi seul connais est facile à retenir."
          value={passphrase}
          onChange={setPassphrase}
          error={errors.passphrase}
        />
        <TextField
          name="backup-confirm"
          label="Confirme la phrase secrète"
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
        />
        <Toggle label="Afficher la phrase secrète" checked={visible} onChange={setVisible} />
      </div>
      <div className="mt-4">
        <Alert tone="warning">Note ta phrase secrète en lieu sûr. Si tu l’oublies, la sauvegarde est définitivement illisible.</Alert>
      </div>
      {message && (
        <div className="mt-3">
          <Alert tone="info">{message}</Alert>
        </div>
      )}
      {failure && (
        <div className="mt-3">
          <Alert tone="error">{failure}</Alert>
        </div>
      )}
      <Button block className="mt-4" busy={busy} onClick={() => void run()}>
        Créer la sauvegarde
      </Button>
    </Card>
  );
}

function RestoreCard() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; info: BackupFileInfo } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [staged, setStaged] = useState<StagedRestore | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Quitter l'écran abandonne une restauration préparée (sa base temporaire est supprimée).
  const stagedRef = useRef<StagedRestore | null>(null);
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  useEffect(() => () => void stagedRef.current?.discard(), []);

  const reset = async () => {
    await staged?.discard();
    setStaged(null);
    setFile(null);
    setPassphrase('');
    if (input.current) input.current.value = '';
  };

  const choose = async (picked: File | undefined) => {
    if (!picked) return;
    await staged?.discard();
    setStaged(null);
    setFailure(null);
    setDone(false);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      setFile({ name: picked.name, bytes, info: inspectBackup(bytes) });
    } catch (error) {
      setFile(null);
      setFailure(errorMessage(error, 'Fichier illisible.'));
    }
  };

  const check = async () => {
    if (!file) return;
    setBusy(true);
    setFailure(null);
    try {
      setStaged(await stageRestore(file.bytes, passphrase));
    } catch (error) {
      setFailure(errorMessage(error, 'Vérification impossible.'));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!staged) return;
    setBusy(true);
    try {
      await staged.apply();
      setStaged(null);
      setFile(null);
      setPassphrase('');
      setDone(true);
    } catch (error) {
      setFailure(`${errorMessage(error, 'Restauration impossible.')} Tes données actuelles n’ont pas été modifiées.`);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-snow">Restaurer une sauvegarde</h2>
      <p className="mt-1 text-sm text-mist">
        Rien n’est remplacé avant ta confirmation : VYRO déchiffre d’abord la sauvegarde, la vérifie et te montre son contenu.
      </p>
      <input ref={input} type="file" className="sr-only" aria-label="Choisir un fichier de sauvegarde" onChange={(event) => void choose(event.target.files?.[0])} />
      {!staged && (
        <Button variant="secondary" block className="mt-4" onClick={() => input.current?.click()}>
          {file ? 'Choisir un autre fichier' : 'Choisir le fichier de sauvegarde'}
        </Button>
      )}
      {file && !staged && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-snow">
            {file.name} · créée le {describe(file.info.createdAt)} (VYRO {file.info.appVersion})
          </p>
          <TextField name="restore-passphrase" label="Phrase secrète de cette sauvegarde" type="password" autoComplete="off" value={passphrase} onChange={setPassphrase} />
          <Button block busy={busy} disabled={passphrase.length === 0} onClick={() => void check()}>
            Déchiffrer et vérifier
          </Button>
        </div>
      )}
      {failure && (
        <div className="mt-3">
          <Alert tone="error">{failure}</Alert>
        </div>
      )}
      {done && (
        <div className="mt-3">
          <Alert tone="info" title="Sauvegarde restaurée">
            Tes données ont été remplacées. Ton code de verrouillage actuel est conservé. <Link to="/" className="font-semibold text-volt-400">Retour à l’accueil</Link>
          </Alert>
        </div>
      )}
      {staged && (
        <div className="mt-4 space-y-3">
          <Alert tone="info" title="Sauvegarde vérifiée ✓">
            Créée le {describe(staged.preview.info.createdAt)}
            {staged.preview.firstName ? `, profil de ${staged.preview.firstName}` : ''}. Photos : {formatBytes(staged.preview.photoBytes)}.
          </Alert>
          <table className="w-full text-sm">
            <caption className="sr-only">Contenu de la sauvegarde comparé à cet iPhone</caption>
            <thead>
              <tr className="text-left text-xs text-mist">
                <th className="py-1 font-medium">Élément</th>
                <th className="py-1 text-right font-medium">Sauvegarde</th>
                <th className="py-1 text-right font-medium">Cet iPhone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {staged.preview.counts
                .filter((count) => count.backup + count.current > 0 && count.table !== 'settings' && count.table !== 'planSnapshots')
                .map((count) => (
                  <tr key={count.table}>
                    <th scope="row" className="py-1 text-left font-normal text-mist">
                      {TABLE_LABELS[count.table] ?? count.table}
                    </th>
                    <td className="py-1 text-right text-snow">{count.backup}</td>
                    <td className="py-1 text-right text-snow">{count.current}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <Alert tone="warning">
            Restaurer remplace toutes les données actuelles de cet iPhone par celles de la sauvegarde. Si tu veux les garder, crée d’abord
            une sauvegarde ci-dessus.
          </Alert>
          <Button variant="danger" block busy={busy} onClick={() => setConfirming(true)}>
            Remplacer par la sauvegarde
          </Button>
          <Button variant="ghost" block disabled={busy} onClick={() => void reset()}>
            Annuler
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title="Remplacer toutes tes données ?"
        confirmLabel="Restaurer"
        tone="danger"
        requireText="RESTAURER"
        busy={busy}
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      >
        <p>Les données actuelles de cet iPhone seront remplacées par la sauvegarde. Tout est remplacé d’un coup, ou rien en cas d’erreur.</p>
      </ConfirmDialog>
    </Card>
  );
}
