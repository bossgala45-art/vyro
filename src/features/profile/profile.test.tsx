import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import { bodyWeightRepository } from '../../data/repositories/bodyWeightRepository';
import { profileRepository } from '../../data/repositories/profileRepository';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';

beforeEach(async () => {
  await resetDatabase();
  await seedProfile({ firstName: 'Test', foodsLiked: ['Pâtes'] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('écran Profil', () => {
  it('affiche les informations enregistrées et le dernier poids', async () => {
    renderRoute('/profil');
    expect(await screen.findByText('172 cm')).toBeInTheDocument();
    expect(screen.getAllByText('58 kg').length).toBeGreaterThan(0);
    expect(screen.getByText('Pâtes')).toBeInTheDocument();
    expect(screen.getByText('3 à 6 mois')).toBeInTheDocument();
  });

  it('modifie une section et enregistre la modification', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/profil');

    await user.click(await screen.findByRole('link', { name: 'Modifier : Toi' }));
    const height = await screen.findByLabelText('Taille');
    expect(height).toHaveValue('172');
    expect(screen.queryByLabelText('Poids actuel')).not.toBeInTheDocument();

    await user.clear(height);
    await user.type(height, '173,5');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/profil'));
    expect((await profileRepository.get())?.heightCm).toBe(173.5);
    expect(await screen.findByText('173,5 cm')).toBeInTheDocument();
  });

  it('refuse une valeur invalide sans rien enregistrer', async () => {
    const user = userEvent.setup();
    renderRoute('/profil/modifier/identity');
    const height = await screen.findByLabelText('Taille');
    await user.clear(height);
    await user.type(height, '400');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText(/Taille attendue entre 120 et 230 cm/)).toBeInTheDocument();
    expect((await profileRepository.get())?.heightCm).toBe(172);
  });

  it('prévient avant de quitter avec des modifications non enregistrées', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/profil/modifier/foods');
    await user.type(await screen.findByLabelText('Aliments que tu aimes'), 'Riz{Enter}');

    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    await user.click(within(nav).getByRole('link', { name: 'Calendrier' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Quitter sans enregistrer ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(router.state.location.pathname).toBe('/profil/modifier/foods');
    expect(screen.getByText('Riz')).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'Calendrier' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Quitter' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/calendrier'));
    expect((await profileRepository.get())?.foods.liked).toEqual(['Pâtes']);
  });

  it('conserve la saisie et affiche l’erreur si l’enregistrement échoue', async () => {
    const user = userEvent.setup();
    renderRoute('/profil/modifier/identity');
    const height = await screen.findByLabelText('Taille');
    await user.clear(height);
    await user.type(height, '175');

    vi.spyOn(db.profile, 'put').mockRejectedValueOnce(new DOMException('plein', 'QuotaExceededError') as never);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Modifications non enregistrées')).toBeInTheDocument();
    expect(screen.getByLabelText('Taille')).toHaveValue('175');
    expect((await profileRepository.get())?.heightCm).toBe(172);
  });
});

describe('pesées', () => {
  it('ajoute une pesée et l’affiche comme dernier poids', async () => {
    const user = userEvent.setup();
    renderRoute('/profil');
    await user.click(await screen.findByRole('button', { name: 'Nouvelle pesée' }));
    await user.type(screen.getByLabelText('Poids'), '59,2');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect((await screen.findAllByText('59,2 kg')).length).toBeGreaterThan(0);
    expect(await bodyWeightRepository.list()).toHaveLength(2);
  });

  it('refuse une pesée datée dans le futur', async () => {
    const user = userEvent.setup();
    renderRoute('/profil');
    await user.click(await screen.findByRole('button', { name: 'Nouvelle pesée' }));
    await user.type(screen.getByLabelText('Poids'), '59');
    const date = screen.getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2099-01-01');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText(/ne peut pas être dans le futur/)).toBeInTheDocument();
    expect(await bodyWeightRepository.list()).toHaveLength(1);
  });

  it('supprime une pesée après confirmation', async () => {
    const user = userEvent.setup();
    renderRoute('/profil');
    await user.click(await screen.findByText('Historique (1)'));
    await user.click(screen.getByRole('button', { name: /Supprimer la pesée/ }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));

    await waitFor(async () => expect(await bodyWeightRepository.list()).toEqual([]));
    expect(await screen.findByText('Aucune pesée enregistrée.')).toBeInTheDocument();
  });
});
