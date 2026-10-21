import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { generateProgram } from '../../domain/training/program';
import type { Weekday } from '../../domain/training/types';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';

type User = ReturnType<typeof userEvent.setup>;

let profile: Awaited<ReturnType<typeof seedProfile>>;

beforeEach(async () => {
  await resetDatabase();
  profile = await seedProfile();
});

async function seedProgram() {
  const { program } = generateProgram({ id: 'prog-1', now: '2026-10-01T00:00:00.000Z', profile });
  await trainingRepository.activateNewProgram(program);
  return program;
}

async function seedRoutine(gymDays: Weekday[] = [0, 1, 2, 3, 4, 5, 6]) {
  await calendarRepository.savePlanning({
    id: 'me',
    gymSlots: gymDays.map((weekday) => ({ weekday, from: null, to: null })),
    includeOptionalThird: false,
    updatedAt: '2026-10-01T00:00:00.000Z',
  });
}

async function startSession(user: User, feeling: 'Bien' | 'Fatigué' = 'Bien') {
  await user.click(await screen.findByRole('button', { name: 'Commencer' }));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByLabelText(feeling));
  const startButton =
    feeling === 'Fatigué'
      ? within(dialog).getByRole('button', { name: 'Commencer la version allégée' })
      : within(dialog).getByRole('button', { name: 'Commencer' });
  await user.click(startButton);
  await screen.findByRole('heading', { level: 1, name: 'Séance A — corps complet' });
  expect(screen.getByText(feeling === 'Fatigué' ? 'Version allégée' : 'Séance en cours')).toBeInTheDocument();
}

async function logFirstSet(user: User, reps = '10', kg = '60', rir = '2') {
  await user.type(screen.getByLabelText('Répétitions — Presse à cuisses, série 1'), reps);
  await user.type(screen.getByLabelText('Charge en kg — Presse à cuisses, série 1'), kg);
  await user.selectOptions(screen.getByLabelText('Répétitions en réserve — Presse à cuisses, série 1'), rir);
  await user.click(screen.getByRole('button', { name: 'Valider Presse à cuisses, série 1' }));
}

describe('mise en place', () => {
  it('demande les disponibilités puis génère un programme sans développé couché libre', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/entrainement');

    await user.click(await screen.findByRole('button', { name: 'Indiquer mes disponibilités' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/calendrier/habituel'));
    await user.click(await screen.findByRole('checkbox', { name: 'Lundi' }));
    await user.click(screen.getByRole('checkbox', { name: 'Mercredi' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les disponibilités' }));
    expect(await screen.findByText(/Disponibilités enregistrées/)).toBeInTheDocument();
    expect((await calendarRepository.load()).planning?.gymSlots.map((slot) => slot.weekday)).toEqual([0, 2]);

    await user.click(within(screen.getByRole('navigation', { name: 'Navigation principale' })).getByRole('link', { name: 'Séances' }));

    await user.click(await screen.findByRole('button', { name: 'Générer mon programme' }));
    expect(await screen.findByText('Prochaine séance')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Planning de la semaine' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Mon programme' }));
    expect(await screen.findByText('Séance A — corps complet')).toBeInTheDocument();
    expect(screen.queryByText('Développé couché à la barre libre')).not.toBeInTheDocument();
    expect(screen.getAllByText(/départ : charge à déterminer/).length).toBeGreaterThan(0);
  });

  it('ne planifie rien sans jour de salle déclaré', async () => {
    await seedProgram();
    await seedRoutine([]);
    renderRoute('/entrainement');
    expect(await screen.findByText(/ne planifie rien sans les connaître/)).toBeInTheDocument();
  });
});

describe('séance', () => {
  beforeEach(async () => {
    await seedProgram();
    await seedRoutine();
  });

  it('enregistre une séance complète et la retrouve dans l’historique', async () => {
    const user = userEvent.setup();
    renderRoute('/entrainement');
    await startSession(user);

    expect(screen.getAllByText(/Première fois : charge à déterminer/).length).toBeGreaterThan(0);
    await logFirstSet(user);
    expect(await screen.findByRole('timer')).toBeInTheDocument();
    expect(screen.getByText('10 rép. × 60 kg · 2 en réserve')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    const dialog = await screen.findByRole('dialog', { name: 'Terminer la séance' });
    await user.click(within(dialog).getByRole('button', { name: '7' }));
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer la séance' }));

    expect(await screen.findByText('Séance terminée')).toBeInTheDocument();
    const [saved] = await trainingRepository.listWorkouts();
    expect(saved).toMatchObject({ status: 'completed', sessionRpe: 7, templateKey: 'A' });
    expect(saved?.exercises[0]?.sets[0]).toEqual({ reps: 10, loadKg: 60, rir: 2, done: true });
  });

  it('refuse une série sans charge pour un exercice chargé', async () => {
    const user = userEvent.setup();
    renderRoute('/entrainement');
    await startSession(user);
    await user.type(screen.getByLabelText('Répétitions — Presse à cuisses, série 1'), '10');
    await user.click(screen.getByRole('button', { name: 'Valider Presse à cuisses, série 1' }));
    expect(await screen.findByText('Indique la charge utilisée (en kg).')).toBeInTheDocument();
  });

  it('propose la version allégée en cas de fatigue', async () => {
    const user = userEvent.setup();
    renderRoute('/entrainement');
    await startSession(user, 'Fatigué');
    const [workout] = await trainingRepository.listWorkouts();
    expect(workout?.light).toBe(true);
    expect(workout?.exercises[0]?.sets).toHaveLength(2);
  });

  it('conseille le repos en cas de douleur, sans rien imposer', async () => {
    const user = userEvent.setup();
    renderRoute('/entrainement');
    await user.click(await screen.findByRole('button', { name: 'Commencer' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('Douleur'));
    expect(within(dialog).getByText('Repos conseillé')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Je me repose aujourd’hui' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await trainingRepository.listWorkouts()).toEqual([]);
  });

  it('une douleur signalée empêche toute hausse de charge à la séance suivante', async () => {
    const user = userEvent.setup();
    renderRoute('/entrainement');
    await startSession(user);
    await logFirstSet(user, '10', '60', '3');
    const card = screen.getByRole('heading', { name: 'Presse à cuisses' }).closest('div') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Douleur' }));
    expect(await screen.findByText('Douleur signalée')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    await user.click(await screen.findByRole('button', { name: 'Enregistrer la séance' }));
    expect(await screen.findByText(/pas de hausse de charge la prochaine fois/)).toBeInTheDocument();
  });

  it('garde la séance en cours après fermeture de l’app', async () => {
    const user = userEvent.setup();
    const first = renderRoute('/entrainement');
    await startSession(user);
    await logFirstSet(user);
    await waitFor(async () => expect((await trainingRepository.listWorkouts())[0]?.exercises[0]?.sets[0]?.done).toBe(true));
    first.unmount();

    renderRoute('/entrainement');
    await user.click(await screen.findByRole('button', { name: 'Reprendre la séance' }));
    expect(await screen.findByText('10 rép. × 60 kg · 2 en réserve')).toBeInTheDocument();
  });

  it('abandonne une séance sans l’utiliser pour la progression', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/entrainement');
    await startSession(user);
    await user.click(screen.getByRole('button', { name: 'Abandonner la séance' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Abandonner' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrainement'));
    expect((await trainingRepository.listWorkouts())[0]?.status).toBe('abandoned');
  });

  it('permet de remplacer un exercice avant de commencer ses séries', async () => {
    const user = userEvent.setup();
    renderRoute('/entrainement');
    await startSession(user);
    const card = screen.getByRole('heading', { name: 'Presse à cuisses' }).closest('div') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Remplacer' }));
    await user.click(within(screen.getByRole('list', { name: 'Remplacer Presse à cuisses' })).getByRole('button', { name: 'Squat gobelet' }));
    expect(await screen.findByRole('heading', { name: 'Squat gobelet' })).toBeInTheDocument();
    await waitFor(async () => expect((await trainingRepository.listWorkouts())[0]?.exercises[0]?.exerciseId).toBe('goblet-squat'));
  });
});

describe('modification manuelle du programme', () => {
  it('modifie séries et charge de départ, et refuse des valeurs incohérentes', async () => {
    const program = await seedProgram();
    const user = userEvent.setup();
    const { router } = renderRoute('/entrainement/programme/A/0');

    const repMax = await screen.findByLabelText('Rép. max');
    await user.clear(repMax);
    await user.type(repMax, '5');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Doit être supérieur ou égal au minimum.')).toBeInTheDocument();

    await user.clear(repMax);
    await user.type(repMax, '12');
    const sets = screen.getByLabelText('Séries');
    await user.clear(sets);
    await user.type(sets, '4');
    await user.type(screen.getByLabelText('Charge de départ'), '80');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrainement/programme'));
    const updated = await trainingRepository.getActiveProgram();
    expect(updated?.templates[0]?.slots[0]).toMatchObject({ sets: 4, repMax: 12, startLoadKg: 80 });
    expect(updated?.id).toBe(program.id);
  });
});
