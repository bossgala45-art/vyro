import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { nowIso, todayIso } from '../../app/clock';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { recoveryRepository } from '../../data/repositories/recoveryRepository';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { addDays } from '../../domain/calendar/time';
import type { CheckIn } from '../../domain/recovery/types';
import { generateProgram } from '../../domain/training/program';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';

type User = ReturnType<typeof userEvent.setup>;
const today = todayIso();

beforeEach(async () => {
  await resetDatabase();
  const profile = await seedProfile();
  await trainingRepository.activateNewProgram(generateProgram({ id: 'p', now: nowIso(), profile }).program);
  await calendarRepository.savePlanning({
    id: 'me',
    gymSlots: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday: weekday as 0, from: null, to: null })),
    includeOptionalThird: false,
    updatedAt: nowIso(),
  });
});

async function fillCheckIn(user: User, { sleep = '8', energy = 7, pain = false }: { sleep?: string; energy?: number; pain?: boolean } = {}) {
  await user.type(await screen.findByLabelText('Sommeil cette nuit'), sleep);
  await user.click(screen.getByRole('button', { name: `Énergie : ${energy}` }));
  await user.click(screen.getByLabelText(pain ? 'Oui' : 'Non'));
}

const checkIn = (overrides: Partial<CheckIn>): CheckIn => ({
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

describe('check-in et décision', () => {
  it('séance normale quand tout va bien, puis séance non allégée', async () => {
    const user = userEvent.setup();
    renderRoute('/recuperation/check-in');
    await fillCheckIn(user);
    await user.click(screen.getByRole('button', { name: 'Voir mon conseil du jour' }));

    expect(await screen.findByText('Séance normale')).toBeInTheDocument();
    expect(screen.getByText(/pas un avis médical/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Commencer la séance/ }));
    await waitFor(async () => expect((await trainingRepository.listWorkouts())[0]?.light).toBe(false));
  });

  it('nuit courte et énergie basse → séance adaptée, expliquée signal par signal', async () => {
    const user = userEvent.setup();
    renderRoute('/recuperation/check-in');
    await fillCheckIn(user, { sleep: '6', energy: 4 });
    await user.click(screen.getByRole('button', { name: 'Voir mon conseil du jour' }));

    expect(await screen.findByText('Séance adaptée')).toBeInTheDocument();
    expect(screen.getByText('Nuit courte (6 h)')).toBeInTheDocument();
    expect(screen.getByText('Énergie basse (4/10)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /allégée$/ }));
    await waitFor(async () => expect((await trainingRepository.listWorkouts())[0]?.light).toBe(true));
  });

  it('nuit très courte → activité légère, sans séance imposée', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/recuperation/check-in');
    await fillCheckIn(user, { sleep: '4' });
    await user.click(screen.getByRole('button', { name: 'Voir mon conseil du jour' }));
    expect(await screen.findByText('Activité légère')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'C’est noté : activité légère aujourd’hui' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await trainingRepository.listWorkouts()).toEqual([]);
  });

  it('douleur à l’épaule → exercices de la zone retirés de la séance', async () => {
    const user = userEvent.setup();
    renderRoute('/recuperation/check-in');
    await fillCheckIn(user, { pain: true });
    await user.click(screen.getByLabelText('Épaules'));
    await user.click(screen.getByRole('button', { name: 'Intensité de la douleur : 3' }));
    await user.click(screen.getByRole('button', { name: 'Voir mon conseil du jour' }));

    expect(await screen.findByText('Séance adaptée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Séance normale quand même' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /allégée$/ }));
    await waitFor(async () => expect(await trainingRepository.listWorkouts()).toHaveLength(1));
    const [workout] = await trainingRepository.listWorkouts();
    const skipped = workout?.exercises.filter((exercise) => exercise.skipped).map((exercise) => exercise.exerciseId) ?? [];
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped).not.toContain('leg-press');
  });

  it('demande des précisions quand des réponses manquent', async () => {
    const user = userEvent.setup();
    renderRoute('/recuperation/check-in');
    await user.click(await screen.findByRole('button', { name: 'Voir mon conseil du jour' }));
    expect(await screen.findByText('Précisions nécessaires')).toBeInTheDocument();
    expect(screen.getByText('Combien d’heures as-tu dormi ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compléter le check-in' })).toBeInTheDocument();
  });

  it('pré-remplit le check-in du jour à la réouverture', async () => {
    await recoveryRepository.save(checkIn({ sleepHours: 6.5, energy: 5 }));
    renderRoute('/recuperation/check-in');
    expect(await screen.findByLabelText('Sommeil cette nuit')).toHaveValue('6,5');
    expect(screen.getByRole('button', { name: 'Énergie : 5' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('jour de match → repos conseillé, même sans check-in', async () => {
    await calendarRepository.saveActivity({
      id: 'm',
      kind: 'match',
      title: 'Match',
      startTime: '15:00',
      durationMinutes: 120,
      date: today,
      recurrence: null,
      notes: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    renderRoute('/recuperation/aujourdhui');
    expect(await screen.findByText('Repos conseillé')).toBeInTheDocument();
    expect(screen.getByText('Jour de match')).toBeInTheDocument();
  });
});

describe('lien avec le calendrier', () => {
  it('une activité légère conseillée retire la séance du jour du planning, avec la raison', async () => {
    await recoveryRepository.save(checkIn({ energy: 2 }));
    renderRoute(`/calendrier/jour/${today}`);
    expect(await screen.findByText(/activité légère conseillée par ton check-in/)).toBeInTheDocument();
  });
});

describe('repères et historique', () => {
  it('les repères réglés changent le conseil ; une valeur incohérente est refusée', async () => {
    const user = userEvent.setup();
    renderRoute('/recuperation/reperes');
    const field = await screen.findByLabelText('Nuit très courte');
    await user.clear(field);
    await user.type(field, '9');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les repères' }));
    expect(await screen.findByText('Entre 3 et 8.')).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, '5');
    const short = screen.getByLabelText('Nuit courte');
    await user.clear(short);
    await user.type(short, '8');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les repères' }));
    expect(await screen.findByText(/Repères enregistrés/)).toBeInTheDocument();
    expect((await settingsRepository.get()).recovery.thresholds.shortSleepHours).toBe(8);

    await recoveryRepository.save(checkIn({ sleepHours: 7.5 }));
    renderRoute('/recuperation/aujourdhui');
    expect(await screen.findByText('Nuit courte (7 h 30)')).toBeInTheDocument();
  });

  it('affiche l’historique et des moyennes calculées uniquement sur les jours renseignés', async () => {
    await recoveryRepository.save(checkIn({ date: addDays(today, -1), sleepHours: 6 }));
    await recoveryRepository.save(checkIn({ sleepHours: 8 }));
    renderRoute('/recuperation');
    expect(await screen.findByText('Moyenne 7 j : 7 h (2 jours)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Modifier mon check-in' })).toBeInTheDocument();
  });

  it('l’accueil invite au check-in puis affiche la décision', async () => {
    const first = renderRoute('/');
    expect(await screen.findByRole('link', { name: 'Faire mon check-in' })).toBeInTheDocument();
    first.unmount();
    await recoveryRepository.save(checkIn({ sleepHours: 6 }));
    renderRoute('/');
    expect(await screen.findByText('Séance adaptée')).toBeInTheDocument();
  });
});
