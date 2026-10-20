import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayIso } from '../../app/clock';
import { db } from '../../data/db';
import { bodyWeightRepository } from '../../data/repositories/bodyWeightRepository';
import { draftRepository } from '../../data/repositories/draftRepository';
import { ONBOARDING_DRAFT_ID, profileRepository } from '../../data/repositories/profileRepository';
import { addYears } from '../../domain/common/dates';
import { renderRoute, resetDatabase } from '../../test/renderRoute';

type User = ReturnType<typeof userEvent.setup>;

const birthYear = String(Number(todayIso().slice(0, 4)) - 18);
const targetDate = addYears(todayIso(), 1);

async function fillIdentity(user: User) {
  await user.type(await screen.findByLabelText('Année de naissance'), birthYear);
  await user.click(screen.getByLabelText('Homme'));
  await user.type(screen.getByLabelText('Taille'), '172');
  await user.type(screen.getByLabelText('Poids actuel'), '58,5');
}

async function fillGoal(user: User) {
  await user.click(await screen.findByLabelText('3 à 6 mois'));
  await user.click(screen.getByLabelText(/Physique athlétique/));
  fireEvent.change(screen.getByLabelText('Date d’objectif'), { target: { value: targetDate } });
}

async function fillTraining(user: User) {
  await user.click(await screen.findByLabelText('Haltères'));
  await user.click(screen.getByLabelText('Barre de traction'));
  await user.type(screen.getByLabelText('Séance min.'), '60');
  await user.type(screen.getByLabelText('Séance max.'), '90');
  await user.click(screen.getByRole('switch', { name: /développé couché libre/ }));
}

const continueButton = () => screen.getByRole('button', { name: 'Continuer' });

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('premier lancement', () => {
  it('redirige vers l’écran de bienvenue tant qu’aucun profil n’existe', async () => {
    const { router } = renderRoute('/calendrier');
    expect(await screen.findByRole('heading', { level: 1, name: 'VYRO' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/bienvenue');
    expect(screen.getByText(/Tout reste sur ton iPhone/)).toBeInTheDocument();
  });

  it('crée le profil et la première pesée au bout des 5 étapes', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/bienvenue');

    await user.click(await screen.findByRole('button', { name: 'Commencer' }));
    await fillIdentity(user);
    await user.click(continueButton());
    await fillGoal(user);
    await user.click(continueButton());
    await fillTraining(user);
    await user.click(continueButton());
    await user.type(await screen.findByLabelText('Aliments que tu aimes'), 'Pâtes{Enter}');
    await user.type(screen.getByLabelText('Aliments que tu refuses'), 'Brocoli{Enter}');
    await user.click(continueButton());

    expect(await screen.findByRole('heading', { name: 'Récapitulatif' })).toBeInTheDocument();
    expect(screen.getByText('172 cm')).toBeInTheDocument();
    expect(screen.getByText('58,5 kg')).toBeInTheDocument();
    expect(screen.getByText('Pâtes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Créer mon profil' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    const profile = await profileRepository.get();
    expect(profile).toMatchObject({
      birthYear: Number(birthYear),
      sex: 'male',
      heightCm: 172,
      experience: '3to6m',
      goal: { type: 'athletic', targetDate },
      training: { equipment: ['dumbbells', 'pullupBar'], sessionMinutes: { min: 60, max: 90 }, noUnassistedFreeBench: true },
      foods: { liked: ['Pâtes'], refused: ['Brocoli'] },
    });
    expect(await bodyWeightRepository.list()).toMatchObject([{ kg: 58.5, date: todayIso() }]);
    expect(await draftRepository.get(ONBOARDING_DRAFT_ID)).toBeUndefined();
  });

  it('bloque l’étape et affiche les erreurs quand des champs obligatoires manquent', async () => {
    const user = userEvent.setup();
    renderRoute('/configuration');

    await user.click(await screen.findByRole('button', { name: 'Continuer' }));

    expect(screen.getByText(/Indique ton année de naissance/)).toBeInTheDocument();
    expect(screen.getByText(/Indique ta taille/)).toBeInTheDocument();
    expect(screen.getByText(/Indique ton poids/)).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Année de naissance')).toHaveAttribute('aria-invalid', 'true');
  });

  it('refuse un aliment à la fois aimé et refusé', async () => {
    const user = userEvent.setup();
    renderRoute('/configuration');
    await fillIdentity(user);
    await user.click(continueButton());
    await fillGoal(user);
    await user.click(continueButton());
    await fillTraining(user);
    await user.click(continueButton());
    await user.type(await screen.findByLabelText('Aliments que tu aimes'), 'Riz{Enter}');
    await user.type(screen.getByLabelText('Aliments que tu refuses'), 'riz{Enter}');
    await user.click(continueButton());

    expect(screen.getByText(/« Riz » est à la fois aimé et refusé/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Récapitulatif' })).not.toBeInTheDocument();
  });

  it('reprend une configuration interrompue (app fermée en cours de saisie)', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/configuration');
    await user.type(await screen.findByLabelText('Taille'), '172');
    await waitFor(async () => {
      const saved = (await draftRepository.get(ONBOARDING_DRAFT_ID)) as { draft: { heightCm: string } } | undefined;
      expect(saved?.draft.heightCm).toBe('172');
    });
    first.unmount();

    renderRoute('/configuration');
    await waitFor(() => expect(screen.getByLabelText('Taille')).toHaveValue('172'));
  });

  it('garde les réponses et explique l’erreur si le stockage est plein', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/configuration');
    await fillIdentity(user);
    await user.click(continueButton());
    await fillGoal(user);
    await user.click(continueButton());
    await fillTraining(user);
    await user.click(continueButton());
    await user.click(await screen.findByRole('button', { name: 'Continuer' }));

    vi.spyOn(db.profile, 'add').mockRejectedValueOnce(new DOMException('plein', 'QuotaExceededError') as never);
    await user.click(await screen.findByRole('button', { name: 'Créer mon profil' }));

    expect(await screen.findByText('Profil non enregistré')).toBeInTheDocument();
    expect(screen.getByText(/Espace de stockage insuffisant/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/configuration');
    expect(await profileRepository.get()).toBeNull();

    // Une fois l'espace libéré, un nouvel essai fonctionne avec les mêmes réponses.
    await user.click(screen.getByRole('button', { name: 'Créer mon profil' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect((await profileRepository.get())?.heightCm).toBe(172);
  });
});
