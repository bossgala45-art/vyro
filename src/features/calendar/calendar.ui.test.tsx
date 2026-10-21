import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nowIso, todayIso } from '../../app/clock';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { trainingRepository } from '../../data/repositories/trainingRepository';
import { addDays } from '../../domain/calendar/time';
import type { Activity } from '../../domain/calendar/types';
import { generateProgram } from '../../domain/training/program';
import { WEEKDAY_LABELS, weekStart, weekdayOf } from '../../domain/training/schedule';
import type { Weekday } from '../../domain/training/types';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';
import { formatShortDate } from '../training/format';

const today = todayIso();
const tomorrow = addDays(today, 1);

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function oneOff(id: string, kind: Activity['kind'], date: string, startTime: string | null = '18:00', durationMinutes: number | null = 90): Activity {
  return {
    id,
    kind,
    title: kind === 'match' ? 'Match' : kind === 'practice' ? 'Entraînement de basket' : 'Autre',
    startTime,
    durationMinutes,
    date,
    recurrence: null,
    notes: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function weekly(id: string, kind: Activity['kind'], weekday: Weekday, startTime = '18:00'): Activity {
  return { ...oneOff(id, kind, today, startTime), date: null, recurrence: { weekday, from: addDays(today, -60), until: null } };
}

async function seedPlanning(weekdays: Weekday[] = [0, 1, 2, 3, 4, 5, 6]) {
  await calendarRepository.savePlanning({
    id: 'me',
    gymSlots: weekdays.map((weekday) => ({ weekday, from: null, to: null })),
    includeOptionalThird: false,
    updatedAt: nowIso(),
  });
}

describe('activités', () => {
  beforeEach(async () => {
    await seedProfile();
  });

  it('crée une activité habituelle et l’affiche dans la semaine et le planning habituel', async () => {
    const user = userEvent.setup();
    renderRoute(`/calendrier/activite/nouvelle?date=${today}`);
    await user.click(await screen.findByRole('switch', { name: 'Chaque semaine' }));
    await user.type(screen.getByLabelText('Heure (facultatif)'), '18:30');
    await user.type(screen.getByLabelText('Durée (min)'), '90');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(async () => expect((await calendarRepository.load()).activities).toHaveLength(1));
    const [saved] = (await calendarRepository.load()).activities;
    expect(saved).toMatchObject({ kind: 'practice', startTime: '18:30', durationMinutes: 90, recurrence: { weekday: weekdayOf(today) } });

    renderRoute('/calendrier/habituel');
    expect(await screen.findByText(`${WEEKDAY_LABELS[weekdayOf(today)]} — Entraînement de basket`)).toBeInTheDocument();
  });

  it('prévient d’un conflit horaire et permet d’enregistrer quand même', async () => {
    await calendarRepository.saveActivity(oneOff('kine', 'other', tomorrow, '18:00', 60));
    const user = userEvent.setup();
    renderRoute(`/calendrier/activite/nouvelle?date=${tomorrow}`);
    await user.type(await screen.findByLabelText('Heure (facultatif)'), '18:30');
    await user.type(screen.getByLabelText('Durée (min)'), '90');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Conflit horaire')).toBeInTheDocument();
    expect((await calendarRepository.load()).activities).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Enregistrer quand même' }));
    await waitFor(async () => expect((await calendarRepository.load()).activities).toHaveLength(2));
  });

  it('refuse une activité sans nom ou à l’heure invalide', async () => {
    const user = userEvent.setup();
    renderRoute(`/calendrier/activite/nouvelle?date=${today}`);
    await user.clear(await screen.findByLabelText('Nom'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Donne un nom à l’activité.')).toBeInTheDocument();
    expect((await calendarRepository.load()).activities).toEqual([]);
  });

  it('annule une seule occurrence puis la rétablit', async () => {
    await calendarRepository.saveActivity(weekly('practice', 'practice', weekdayOf(tomorrow)));
    const user = userEvent.setup();
    renderRoute(`/calendrier/jour/${tomorrow}`);
    await user.click(await screen.findByRole('button', { name: 'Annuler cette fois' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Annuler cette fois' }));

    expect(await screen.findByText('Entraînement de basket (annulé)')).toBeInTheDocument();
    const data = await calendarRepository.load();
    expect(data.exceptions).toHaveLength(1);
    expect(data.activities).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Rétablir' }));
    await waitFor(async () => expect((await calendarRepository.load()).exceptions).toEqual([]));
  });

  it('reporte une occurrence à une autre date', async () => {
    await calendarRepository.saveActivity(weekly('practice', 'practice', weekdayOf(tomorrow)));
    const user = userEvent.setup();
    renderRoute(`/calendrier/jour/${tomorrow}`);
    await user.click(await screen.findByRole('button', { name: 'Reporter' }));
    const target = addDays(tomorrow, 2);
    const dateInput = screen.getByLabelText('Nouvelle date');
    await user.clear(dateInput);
    await user.type(dateInput, target);
    await user.click(screen.getAllByRole('button', { name: 'Reporter' }).at(-1) as HTMLElement);

    await waitFor(async () => expect((await calendarRepository.load()).exceptions[0]).toMatchObject({ action: 'move', newDate: target }));
    renderRoute(`/calendrier/jour/${target}`);
    expect(await screen.findByText(/Reporté du/)).toBeInTheDocument();
  });

  it('enregistre les réglages de la journée', async () => {
    const user = userEvent.setup();
    renderRoute(`/calendrier/jour/${tomorrow}`);
    await user.click(await screen.findByRole('switch', { name: 'Jour de repos' }));
    await waitFor(async () => expect((await calendarRepository.load()).overrides[0]).toMatchObject({ date: tomorrow, rest: true }));
    await user.click(screen.getByRole('switch', { name: 'Jour de repos' }));
    await waitFor(async () => expect((await calendarRepository.load()).overrides).toEqual([]));
  });
});

describe('vacances', () => {
  it('demande confirmation, résume l’impact et suspend le basket', async () => {
    await seedProfile();
    await calendarRepository.saveActivity(weekly('practice', 'practice', weekdayOf(tomorrow)));
    const user = userEvent.setup();
    renderRoute('/calendrier/vacances');
    const start = await screen.findByLabelText('Du');
    await user.clear(start);
    await user.type(start, tomorrow);
    const end = screen.getByLabelText('Au (inclus)');
    await user.clear(end);
    await user.type(end, addDays(tomorrow, 6));
    await user.click(screen.getByRole('button', { name: 'Activer le mode vacances…' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Confirmer les vacances ?' });
    expect(within(dialog).getByText(/1 entraînement et 0 match suspendu/)).toBeInTheDocument();
    expect((await calendarRepository.load()).vacations).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }));
    await waitFor(async () => expect((await calendarRepository.load()).vacations).toHaveLength(1));

    renderRoute(`/calendrier/jour/${tomorrow}`);
    expect(await screen.findByText('Suspendu pendant les vacances')).toBeInTheDocument();
  });

  it('refuse des dates incohérentes', async () => {
    await seedProfile();
    const user = userEvent.setup();
    renderRoute('/calendrier/vacances');
    const end = await screen.findByLabelText('Au (inclus)');
    await user.clear(end);
    await user.type(end, addDays(today, -3));
    await user.click(screen.getByRole('button', { name: 'Activer le mode vacances…' }));
    expect(await screen.findByText('La fin doit être après le début.')).toBeInTheDocument();
  });
});

describe('suivi du basket', () => {
  it('saisit un match et calcule les moyennes sur les valeurs notées', async () => {
    await seedProfile();
    await calendarRepository.saveActivity(oneOff('match', 'match', today, '15:00', 120));
    const user = userEvent.setup();
    renderRoute(`/calendrier/jour/${today}`);
    await user.click(await screen.findByRole('link', { name: 'Saisir le match' }));
    await user.click(await screen.findByRole('button', { name: '8' }));
    await user.type(screen.getByLabelText('Minutes jouées'), '24');
    await user.type(screen.getByLabelText('Points'), '12');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(async () => expect((await calendarRepository.load()).logs[0]).toMatchObject({ intensity: 8, minutesPlayed: 24, points: 12, rebounds: null }));

    renderRoute('/calendrier/basket');
    expect(await screen.findByText('8/10')).toBeInTheDocument();
    expect(screen.getByText(/intensité 8\/10 · 24 min · 12 pts/)).toBeInTheDocument();
  });

  it('refuse une valeur invalide', async () => {
    await seedProfile();
    await calendarRepository.saveActivity(oneOff('match', 'match', today));
    const user = userEvent.setup();
    renderRoute(`/calendrier/suivi/match?date=${today}`);
    await user.type(await screen.findByLabelText('Minutes jouées'), '500');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Entre 0 et 120 minutes.')).toBeInTheDocument();
    expect((await calendarRepository.load()).logs).toEqual([]);
  });
});

describe('moteur d’adaptation dans l’interface', () => {
  it('signale et explique un changement de planning après un ajout de dernière minute', async () => {
    const profile = await seedProfile();
    await seedPlanning();
    // Programme créé aujourd'hui : au moins une séance est toujours planifiée à partir d'aujourd'hui.
    const { program } = generateProgram({ id: 'p', now: nowIso(), profile });
    await trainingRepository.activateNewProgram(program);

    const first = renderRoute('/calendrier');
    await screen.findByRole('list', { name: 'Jours de la semaine' });
    await waitFor(async () => expect(await calendarRepository.getSnapshot(weekStart(today))).not.toBeNull());
    const snapshot = await calendarRepository.getSnapshot(weekStart(today));
    first.unmount();

    // Un match est ajouté le jour de la prochaine séance prévue.
    const nextSession = snapshot?.sessions[0];
    if (!nextSession) throw new Error('Aucune séance planifiée');
    await calendarRepository.saveActivity(oneOff('surprise', 'match', nextSession.date, '20:00', 120));

    renderRoute('/calendrier');
    expect(await screen.findByText('Ton planning a changé')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Séance ${nextSession.templateKey}.*(déplacée|retirée)`))).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'J’ai compris' }));
    await waitFor(() => expect(screen.queryByText('Ton planning a changé')).not.toBeInTheDocument());
  });

  it('n’affiche aucune séance sans disponibilités', async () => {
    const profile = await seedProfile();
    await trainingRepository.activateNewProgram(generateProgram({ id: 'p', now: nowIso(), profile }).program);
    renderRoute('/calendrier');
    expect(await screen.findByText('Disponibilités inconnues')).toBeInTheDocument();
    expect(screen.queryByText(/Séance A/)).not.toBeInTheDocument();
  });

  it('bascule en vue mois', async () => {
    await seedProfile();
    const user = userEvent.setup();
    renderRoute('/calendrier');
    await user.click(await screen.findByRole('tab', { name: 'mois' }));
    expect(await screen.findByRole('link', { name: new RegExp(`^${formatShortDate(today)}`) })).toBeInTheDocument();
  });
});

describe('export vers le Calendrier iPhone', () => {
  it('prépare un fichier ICS et le télécharge quand le partage n’est pas disponible', async () => {
    const profile = await seedProfile();
    await seedPlanning();
    await trainingRepository.activateNewProgram(generateProgram({ id: 'p', now: `${addDays(today, -14)}T08:00:00.000Z`, profile }).program);
    await calendarRepository.saveActivity(oneOff('match', 'match', tomorrow, '15:00', 120));
    const createObjectURL = vi.fn(() => 'blob:vyro');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderRoute('/calendrier/export');
    await user.click(await screen.findByLabelText('4 semaines'));
    expect(await screen.findByText('🏀 Match')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exporter vers le Calendrier' }));

    expect(await screen.findByText(/Fichier téléchargé/)).toBeInTheDocument();
    expect(click).toHaveBeenCalled();
    const file = (createObjectURL.mock.calls[0] as unknown as [File])[0];
    const text = await file.text();
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('SUMMARY:🏀 Match');
    expect(text).toContain('TRIGGER:-PT30M');
  });
});
