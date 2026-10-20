import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { bodyWeightRepository } from '../../data/repositories/bodyWeightRepository';
import { profileRepository } from '../../data/repositories/profileRepository';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { createLockVerifier } from '../../security/lockCode';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';

type User = ReturnType<typeof userEvent.setup>;

beforeEach(async () => {
  await resetDatabase();
  await seedProfile();
});

async function enableLock(user: User, code: string) {
  await user.click(await screen.findByRole('button', { name: 'Activer le verrouillage' }));
  await user.type(screen.getByLabelText('Code'), code);
  await user.type(screen.getByLabelText('Confirme le code'), code);
  await user.click(screen.getByRole('button', { name: 'Activer' }));
  await screen.findByText('Verrouillage activé.');
}

describe('confidentialité', () => {
  it('enregistre le réglage de masquage en arrière-plan', async () => {
    const user = userEvent.setup();
    renderRoute('/reglages');
    const toggle = await screen.findByRole('switch', { name: 'Masquer l’écran en arrière-plan' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    await waitFor(async () => expect((await settingsRepository.get()).privacy.hideWhenInactive).toBe(false));
  });

  it('masque le contenu quand VYRO passe en arrière-plan', async () => {
    renderRoute('/reglages');
    await screen.findByRole('heading', { name: 'Réglages' });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(document.querySelector('.z-\\[100\\]')).not.toBeNull());
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(document.querySelector('.z-\\[100\\]')).toBeNull());
  });
});

describe('verrouillage', () => {
  it('refuse deux codes différents', async () => {
    const user = userEvent.setup();
    renderRoute('/reglages');
    await user.click(await screen.findByRole('button', { name: 'Activer le verrouillage' }));
    await user.type(screen.getByLabelText('Code'), 'basket27');
    await user.type(screen.getByLabelText('Confirme le code'), 'basket28');
    await user.click(screen.getByRole('button', { name: 'Activer' }));
    expect(await screen.findByText('Les deux codes ne correspondent pas.')).toBeInTheDocument();
    expect((await settingsRepository.get()).lock.verifier).toBeNull();
  });

  it('active le verrouillage sans jamais stocker le code en clair', async () => {
    const user = userEvent.setup();
    renderRoute('/reglages');
    await enableLock(user, 'basket27');

    const settings = await settingsRepository.get();
    expect(settings.lock.verifier?.algorithm).toBe('PBKDF2-SHA256');
    const everything = JSON.stringify(await db.settings.toArray());
    expect(everything).not.toContain('basket27');
  });

  it('verrouille, refuse un mauvais code puis déverrouille avec le bon', async () => {
    const user = userEvent.setup();
    renderRoute('/reglages');
    await enableLock(user, 'basket27');
    await user.click(screen.getByRole('button', { name: 'Verrouiller' }));

    expect(await screen.findByRole('heading', { name: 'VYRO est verrouillé' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Code de verrouillage'), 'mauvais1');
    await user.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    expect(await screen.findByText('Code incorrect.')).toBeInTheDocument();
    expect((await settingsRepository.get()).lock.failedAttempts).toBe(1);

    await user.type(screen.getByLabelText('Code de verrouillage'), 'basket27');
    await user.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    expect(await screen.findByRole('heading', { name: 'Réglages' })).toBeInTheDocument();
    expect((await settingsRepository.get()).lock.failedAttempts).toBe(0);
  });

  it('impose un délai après plusieurs essais ratés', async () => {
    const verifier = await createLockVerifier('basket27', 1_000);
    await settingsRepository.update((s) => ({ ...s, lock: { ...s.lock, verifier, failedAttempts: 4 } }));
    const user = userEvent.setup();
    renderRoute('/', { locked: true });

    await user.type(await screen.findByLabelText('Code de verrouillage'), 'mauvais1');
    await user.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    expect(await screen.findByText(/Prochain essai possible dans 30 s/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Code de verrouillage'), 'basket27');
    await user.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    expect(await screen.findByText(/Trop d’essais/)).toBeInTheDocument();
  });

  it('démarre verrouillé quand un code est configuré : aucun contenu n’est affiché', async () => {
    const verifier = await createLockVerifier('basket27', 1_000);
    await settingsRepository.update((s) => ({ ...s, lock: { ...s.lock, verifier } }));
    renderRoute('/profil', { locked: true });
    expect(await screen.findByRole('heading', { name: 'VYRO est verrouillé' })).toBeInTheDocument();
    expect(screen.queryByText('172 cm')).not.toBeInTheDocument();
  });

  it('exige le code actuel pour désactiver le verrouillage', async () => {
    const user = userEvent.setup();
    renderRoute('/reglages');
    await enableLock(user, 'basket27');

    await user.click(screen.getByRole('button', { name: 'Désactiver le verrouillage' }));
    await user.type(screen.getByLabelText('Code actuel'), 'faux-code');
    await user.click(screen.getByRole('button', { name: 'Désactiver' }));
    expect(await screen.findByText('Code actuel incorrect.')).toBeInTheDocument();
    expect((await settingsRepository.get()).lock.verifier).not.toBeNull();

    await user.clear(screen.getByLabelText('Code actuel'));
    await user.type(screen.getByLabelText('Code actuel'), 'basket27');
    await user.click(screen.getByRole('button', { name: 'Désactiver' }));
    expect(await screen.findByText('Verrouillage désactivé.')).toBeInTheDocument();
    expect((await settingsRepository.get()).lock.verifier).toBeNull();
  });
});

describe('effacement des données', () => {
  it('exige une confirmation écrite puis efface tout et revient à l’accueil', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/reglages');
    await user.click(await screen.findByRole('button', { name: 'Effacer toutes mes données' }));

    const dialog = await screen.findByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', { name: 'Tout effacer' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox'), 'effacer');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(router.state.location.pathname).toBe('/bienvenue'));
    expect(await profileRepository.get()).toBeNull();
    expect(await bodyWeightRepository.list()).toEqual([]);
  });
});
