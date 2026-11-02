import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { profileRepository } from '../../data/repositories/profileRepository';
import { UpdatePrompt } from '../../pwa/UpdatePrompt';
import { pwaStub } from '../../test/pwaRegisterStub';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';
import * as share from '../../ui/shareFile';

vi.mock('../../ui/shareFile', () => ({ shareOrDownload: vi.fn() }));

type User = ReturnType<typeof userEvent.setup>;
const PASS = 'quatre mots pour basket';

beforeEach(async () => {
  vi.mocked(share.shareOrDownload).mockReset();
  await resetDatabase();
});

async function fillExport(user: User, passphrase: string, confirm = passphrase) {
  await user.type(await screen.findByLabelText('Phrase secrète'), passphrase);
  await user.type(screen.getByLabelText('Confirme la phrase secrète'), confirm);
  await user.click(screen.getByRole('button', { name: 'Créer la sauvegarde' }));
}

/** Crée une vraie sauvegarde chiffrée via l'écran et renvoie le fichier produit. */
async function exportThroughScreen(user: User): Promise<File> {
  let captured: File | null = null;
  vi.mocked(share.shareOrDownload).mockImplementation(async (file) => {
    captured = file;
    return 'downloaded';
  });
  const view = renderRoute('/reglages/sauvegarde');
  await fillExport(user, PASS);
  await screen.findByText(/Sauvegarde créée/, {}, { timeout: 5000 });
  view.unmount();
  if (!captured) throw new Error('aucun fichier');
  return captured;
}

describe('export chiffré', () => {
  it('refuse une phrase faible ou mal recopiée, puis exporte et note la date', async () => {
    const user = userEvent.setup();
    await seedProfile();
    vi.mocked(share.shareOrDownload).mockResolvedValue('downloaded');
    renderRoute('/reglages/sauvegarde');
    expect(await screen.findByText('Aucune sauvegarde pour l’instant.')).toBeInTheDocument();
    await fillExport(user, 'court');
    expect(await screen.findByText(/Au moins 12 caractères/)).toBeInTheDocument();
    expect(share.shareOrDownload).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Phrase secrète'));
    await user.clear(screen.getByLabelText('Confirme la phrase secrète'));
    await fillExport(user, PASS, `${PASS}x`);
    expect(await screen.findByText('Les deux phrases ne sont pas identiques.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Confirme la phrase secrète'));
    await user.type(screen.getByLabelText('Confirme la phrase secrète'), PASS);
    await user.click(screen.getByRole('button', { name: 'Créer la sauvegarde' }));
    expect(await screen.findByText(/Sauvegarde créée/, {}, { timeout: 5000 })).toBeInTheDocument();
    const [file] = vi.mocked(share.shareOrDownload).mock.calls[0] ?? [];
    expect(file?.name).toMatch(/^vyro-sauvegarde-\d{4}-\d{2}-\d{2}\.vyro$/);
    expect((await settingsRepository.get()).backup.lastExportAt).not.toBeNull();
    expect(screen.getByLabelText('Phrase secrète')).toHaveValue('');
  });

  it('partage annulé : la date de sauvegarde n’est pas notée', async () => {
    const user = userEvent.setup();
    await seedProfile();
    vi.mocked(share.shareOrDownload).mockResolvedValue('cancelled');
    renderRoute('/reglages/sauvegarde');
    await fillExport(user, PASS);
    expect(await screen.findByText(/Partage annulé/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect((await settingsRepository.get()).backup.lastExportAt).toBeNull();
  });
});

describe('restauration', () => {
  it('aperçu avant toute modification, puis remplacement confirmé', async () => {
    const user = userEvent.setup({ applyAccept: false });
    await seedProfile({ firstName: 'Alex' });
    const file = await exportThroughScreen(user);

    await resetDatabase();
    await seedProfile({ firstName: 'Moi' });
    renderRoute('/reglages/sauvegarde');
    await user.upload(await screen.findByLabelText('Choisir un fichier de sauvegarde'), file);
    expect(await screen.findByText(/créée le/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Phrase secrète de cette sauvegarde'), 'pas la bonne phrase');
    await user.click(screen.getByRole('button', { name: 'Déchiffrer et vérifier' }));
    expect(await screen.findByText(/Phrase secrète incorrecte/, {}, { timeout: 5000 })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Phrase secrète de cette sauvegarde'));
    await user.type(screen.getByLabelText('Phrase secrète de cette sauvegarde'), PASS);
    await user.click(screen.getByRole('button', { name: 'Déchiffrer et vérifier' }));
    expect(await screen.findByText('Sauvegarde vérifiée ✓', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/profil de Alex/)).toBeInTheDocument();
    const profileRow = screen.getByRole('row', { name: /Profil/ });
    expect(within(profileRow).getAllByText('1')).toHaveLength(2);
    // Rien n'est encore remplacé.
    expect((await profileRepository.get())?.firstName).toBe('Moi');

    await user.click(screen.getByRole('button', { name: 'Remplacer par la sauvegarde' }));
    const dialog = screen.getByRole('alertdialog');
    await user.type(within(dialog).getByRole('textbox'), 'RESTAURER');
    await user.click(within(dialog).getByRole('button', { name: 'Restaurer' }));
    expect(await screen.findByText('Sauvegarde restaurée')).toBeInTheDocument();
    expect((await profileRepository.get())?.firstName).toBe('Alex');
  });

  it('fichier qui n’est pas une sauvegarde : message clair', async () => {
    const user = userEvent.setup({ applyAccept: false });
    await seedProfile();
    renderRoute('/reglages/sauvegarde');
    await user.upload(await screen.findByLabelText('Choisir un fichier de sauvegarde'), new File(['{"a":1}'], 'photo.json'));
    expect(await screen.findByText('Ce fichier n’est pas une sauvegarde VYRO.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Phrase secrète de cette sauvegarde')).not.toBeInTheDocument();
  });

  it('sauvegarde corrompue : refusée après la phrase secrète, données intactes', async () => {
    const user = userEvent.setup({ applyAccept: false });
    await seedProfile({ firstName: 'Alex' });
    const file = await exportThroughScreen(user);
    const bytes = new Uint8Array(await file.arrayBuffer());
    bytes[bytes.length - 50] = (bytes[bytes.length - 50] ?? 0) ^ 0xff;

    renderRoute('/reglages/sauvegarde');
    await user.upload(await screen.findByLabelText('Choisir un fichier de sauvegarde'), new File([bytes], file.name));
    await user.type(await screen.findByLabelText('Phrase secrète de cette sauvegarde'), PASS);
    await user.click(screen.getByRole('button', { name: 'Déchiffrer et vérifier' }));
    expect(await screen.findByText(/abîmée ou a été modifiée/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect((await profileRepository.get())?.firstName).toBe('Alex');
  });
});

describe('réglages, hors ligne et mises à jour', () => {
  it('réglages : lien vers la sauvegarde et notifications expliquées honnêtement', async () => {
    await seedProfile();
    renderRoute('/reglages');
    expect(await screen.findByRole('link', { name: 'Sauvegarder ou restaurer' })).toHaveAttribute('href', '/reglages/sauvegarde');
    expect(screen.getByText('Notifications de l’iPhone : non utilisées')).toBeInTheDocument();
    expect(screen.getByText(/aucune notification n’est promise/)).toBeInTheDocument();
  });

  it('bandeau hors ligne quand la connexion disparaît', async () => {
    await seedProfile();
    renderRoute('/');
    await screen.findByText('BUILD YOUR BEST.');
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(await screen.findByText(/Hors ligne : tout fonctionne/)).toBeInTheDocument();
    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(screen.queryByText(/Hors ligne/)).not.toBeInTheDocument());
  });

  it('mise à jour : proposée, appliquée seulement à la demande', async () => {
    const user = userEvent.setup();
    pwaStub.needRefresh = true;
    pwaStub.updates = [];
    const { unmount } = render(<UpdatePrompt />);
    expect(screen.getByText('Nouvelle version de VYRO disponible')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByText('Nouvelle version de VYRO disponible')).not.toBeInTheDocument();
    expect(pwaStub.updates).toEqual([]);
    unmount();

    render(<UpdatePrompt />);
    await user.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(pwaStub.updates).toEqual([true]);
    pwaStub.needRefresh = false;
  });
});
