import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { nowIso, todayIso } from '../../app/clock';
import { db } from '../../data/db';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { coachRepository } from '../../data/repositories/coachRepository';
import { recoveryRepository } from '../../data/repositories/recoveryRepository';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { addDays } from '../../domain/calendar/time';
import type { CheckIn } from '../../domain/recovery/types';
import { generateProgram } from '../../domain/training/program';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';

const today = todayIso();

const checkIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  date: today,
  sleepHours: 8,
  energy: 7,
  motivation: 7,
  soreness: 'none',
  pain: false,
  painZones: [],
  painIntensity: null,
  availableMinutes: null,
  notes: '',
  createdAt: nowIso(),
  updatedAt: nowIso(),
  ...overrides,
});

async function seedTrainingUser() {
  const profile = await seedProfile({ firstName: 'Alex' });
  await trainingRepository.activateNewProgram(generateProgram({ id: 'p', now: nowIso(), profile }).program);
  await calendarRepository.savePlanning({
    id: 'me',
    gymSlots: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday: weekday as 0, from: null, to: null })),
    includeOptionalThird: false,
    updatedAt: nowIso(),
  });
}

beforeEach(async () => {
  await resetDatabase();
});

describe('écran du coach', () => {
  it('accueil personnalisé et réponses aux questions proposées', async () => {
    const user = userEvent.setup();
    await seedTrainingUser();
    renderRoute('/coach');
    expect(await screen.findByText('Salut Alex !')).toBeInTheDocument();
    expect(screen.getByText(/avant ton objectif/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Que dois-je faire aujourd’hui ?' }));
    const answer = await screen.findByRole('article', { name: 'Réponse : Que dois-je faire aujourd’hui ?' });
    expect(within(answer).getByText('Ta journée')).toBeInTheDocument();
    expect(within(answer).getByText(/Données utilisées/)).toBeInTheDocument();
  });

  it('question libre non prise en charge : le coach le dit clairement, sans inventer', async () => {
    const user = userEvent.setup();
    await seedTrainingUser();
    renderRoute('/coach');
    await user.type(await screen.findByLabelText('Ta question'), 'Quel temps fera-t-il demain ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer la question' }));
    const answer = await screen.findByRole('article', { name: 'Réponse : Quel temps fera-t-il demain ?' });
    expect(within(answer).getByText('Je ne sais pas répondre à cette question')).toBeInTheDocument();
    expect(within(answer).getByText(/pas avec une intelligence artificielle/)).toBeInTheDocument();
    expect(screen.getByText(/Aucune IA connectée/)).toBeInTheDocument();
  });

  it('question libre reconnue par mots-clés', async () => {
    const user = userEvent.setup();
    await seedTrainingUser();
    renderRoute('/coach');
    await user.type(await screen.findByLabelText('Ta question'), 'je peux faire de la muscu après le match ?{Enter}');
    const answer = await screen.findByRole('article', { name: /Réponse : je peux faire/ });
    expect(within(answer).getByText('Muscu et matchs')).toBeInTheDocument();
    expect(within(answer).getByText('Aucun match hier ni aujourd’hui dans ton calendrier.')).toBeInTheDocument();
  });

  it('un message masqué disparaît et le reste', async () => {
    const user = userEvent.setup();
    await seedTrainingUser();
    renderRoute('/coach');
    const [hide] = await screen.findAllByRole('button', { name: /^Masquer : / });
    if (!hide) throw new Error('aucun message');
    const before = screen.getAllByRole('button', { name: /^Masquer : / }).length;
    const title = hide.getAttribute('aria-label')?.replace('Masquer : ', '') ?? '';
    await user.click(hide);
    await waitFor(() => expect(screen.queryByRole('article', { name: title })).not.toBeInTheDocument());
    expect(screen.queryAllByRole('button', { name: /^Masquer : / })).toHaveLength(before - 1);
    expect((await settingsRepository.get()).coach.dismissed).toHaveLength(1);
  });

  it('sans programme ni données : pas d’objectif de séances inventé, pas de progression inventée', async () => {
    const user = userEvent.setup();
    await seedProfile();
    renderRoute('/coach');
    await screen.findByText('Objectifs de la semaine');
    expect(screen.queryByText('Séances de musculation')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Comment ai-je progressé ?' }));
    expect(await screen.findByText(/Pas encore assez de données pour parler de progression/)).toBeInTheDocument();
  });

  it('repos conseillé par le check-in : aucun message ne pousse à s’entraîner', async () => {
    await seedTrainingUser();
    await recoveryRepository.save(checkIn({ pain: true, painZones: ['knees'], painIntensity: 8 }));
    renderRoute('/coach');
    expect(await screen.findByRole('article', { name: 'Repos aujourd’hui' })).toBeInTheDocument();
    const titles = within(screen.getByRole('region', { name: 'Messages du coach' }))
      .getAllByRole('article')
      .map((article) => article.getAttribute('aria-label'));
    expect(titles.filter((title) => /C’est parti|Séance allégée|On repart|^Séance .* aujourd’hui$/.test(title ?? ''))).toEqual([]);
  });
});

describe('journal de motivation', () => {
  it('ajoute une note, puis le coach la cite un jour de motivation basse', async () => {
    const user = userEvent.setup();
    await seedTrainingUser();
    const first = renderRoute('/coach/motivation');
    await user.click(await screen.findByRole('button', { name: 'Ajouter au journal' }));
    expect(await screen.findByText('Écris quelques mots.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Ta note'), 'Être prêt pour la saison');
    await user.click(screen.getByRole('button', { name: 'Motivation du moment (facultatif) : 9' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));
    expect(await screen.findByText('Être prêt pour la saison')).toBeInTheDocument();
    expect((await coachRepository.listMotivation())[0]).toMatchObject({ motivation: 9 });
    first.unmount();

    await recoveryRepository.save(checkIn({ motivation: 2 }));
    renderRoute('/coach');
    const message = await screen.findByRole('article', { name: 'Motivation en baisse : normal, ça arrive' });
    expect(within(message).getByText(/« Être prêt pour la saison »/)).toBeInTheDocument();
  });
});

describe('bilans', () => {
  it('bilan disponible après 14 jours, signalé jusqu’à sa consultation', async () => {
    await seedTrainingUser();
    await db.profile.update('me', { createdAt: `${addDays(today, -20)}T08:00:00.000Z` });
    const first = renderRoute('/coach');
    expect(await screen.findByRole('article', { name: 'Ton bilan est prêt' })).toBeInTheDocument();
    first.unmount();

    const reviews = renderRoute('/coach/bilans');
    expect(await screen.findByText(/Période calme dans tes données/)).toBeInTheDocument();
    expect(screen.getByText('moins de 2 pesées')).toBeInTheDocument();
    await waitFor(async () => expect((await settingsRepository.get()).coach.reviewSeenUntil).toBe(addDays(today, -7)));
    reviews.unmount();

    renderRoute('/coach');
    await screen.findByText('Objectifs de la semaine');
    expect(screen.queryByRole('article', { name: 'Ton bilan est prêt' })).not.toBeInTheDocument();
  });

  it('premier bilan pas encore disponible', async () => {
    await seedTrainingUser();
    await db.profile.update('me', { createdAt: nowIso() });
    renderRoute('/coach/bilans');
    expect(await screen.findByText('Ton premier bilan arrivera après tes 14 premiers jours avec VYRO.')).toBeInTheDocument();
  });
});

describe('accueil', () => {
  it('affiche le coach à la place du module en construction', async () => {
    await seedTrainingUser();
    renderRoute('/');
    expect(await screen.findByRole('link', { name: /Parler au coach/ })).toBeInTheDocument();
  });
});
