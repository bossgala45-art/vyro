import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { nowIso, todayIso } from '../../app/clock';
import { db } from '../../data/db';
import { StorageError } from '../../data/errors';
import { bodyWeightRepository } from '../../data/repositories/bodyWeightRepository';
import { progressRepository } from '../../data/repositories/progressRepository';
import { addDays } from '../../domain/calendar/time';
import type { PhotoPose, ProgressPhoto, ProgressPhotoFile } from '../../domain/progress/types';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';
import * as photoModule from './photo';

vi.mock('./photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./photo')>();
  return { ...actual, prepareProgressPhoto: vi.fn(actual.prepareProgressPhoto) };
});

type User = ReturnType<typeof userEvent.setup>;
const today = todayIso();

beforeAll(() => {
  // jsdom ne fournit pas d'URL locale pour les images.
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:vyro-test', writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, writable: true });
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDatabase();
  await seedProfile();
});

const prepared = (id: string, date: string, pose: PhotoPose = 'front'): { photo: ProgressPhoto; file: ProgressPhotoFile } => ({
  photo: {
    id,
    date,
    pose,
    width: 1200,
    height: 1600,
    bytes: 300_000,
    thumbnail: { mimeType: 'image/jpeg', data: new Uint8Array(256).fill(1).buffer, width: 270, height: 360 },
    notes: '',
    createdAt: nowIso(),
  },
  file: { id, mimeType: 'image/jpeg', data: new Uint8Array(1024).fill(2).buffer },
});

async function seedPhoto(id: string, date: string, pose: PhotoPose = 'front') {
  const { photo, file } = prepared(id, date, pose);
  await progressRepository.addPhoto(photo, file);
}

async function importPhoto(user: User) {
  await user.upload(await screen.findByLabelText('Choisir une photo de progression'), new File(['x'], 'moi.jpg', { type: 'image/jpeg' }));
}

describe('importation de photos', () => {
  it('importe une photo réduite, l’enregistre avec la pose choisie et l’affiche dans la chronologie', async () => {
    const user = userEvent.setup();
    vi.mocked(photoModule.prepareProgressPhoto).mockImplementationOnce(async (_file, input) => prepared(input.id, input.date, input.pose));
    renderRoute('/progres/photos/nouvelle');
    await user.click(await screen.findByLabelText('Profil'));
    await importPhoto(user);
    expect(await screen.findByText(/Réduite à 1200 × 1600 px · 293 Ko/)).toBeInTheDocument();
    expect(screen.getByText(/position GPS/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Chronologie' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Ouvrir la photo : Profil/ })).toBeInTheDocument();
    const [stored] = await progressRepository.listPhotos();
    expect(stored).toMatchObject({ pose: 'side', date: today });
    expect(await db.progressPhotoFiles.count()).toBe(1);
  });

  it('fichier non image ou illisible : message clair, rien n’est enregistré', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderRoute('/progres/photos/nouvelle');
    await user.upload(await screen.findByLabelText('Choisir une photo de progression'), new File(['x'], 'a.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Ce fichier n’est pas une image.')).toBeInTheDocument();
    await importPhoto(user);
    expect(await screen.findByText(/Image illisible/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer la photo' })).toBeDisabled();
  });

  it('espace plein : message explicite, la photo préparée reste à l’écran pour réessayer', async () => {
    const user = userEvent.setup();
    vi.mocked(photoModule.prepareProgressPhoto).mockImplementationOnce(async (_file, input) => prepared(input.id, input.date, input.pose));
    vi.spyOn(progressRepository, 'addPhoto').mockRejectedValueOnce(new StorageError('quota'));
    renderRoute('/progres/photos/nouvelle');
    await importPhoto(user);
    await user.click(await screen.findByRole('button', { name: 'Enregistrer la photo' }));
    expect(await screen.findByText(/Espace de stockage insuffisant/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Aperçu de la photo' })).toBeInTheDocument();
    expect(await db.progressPhotos.count()).toBe(0);
  });

  it('montre la dernière photo de la même pose comme repère de cadrage', async () => {
    await seedPhoto('old', addDays(today, -30));
    renderRoute('/progres/photos/nouvelle');
    expect(await screen.findByRole('img', { name: 'Dernière photo face' })).toBeInTheDocument();
    expect(screen.getByText(/Même lumière/)).toBeInTheDocument();
  });
});

describe('comparaison', () => {
  it('avant / après côte à côte, avec seulement les mesures proches des dates', async () => {
    const before = addDays(today, -60);
    await seedPhoto('p1', before);
    await seedPhoto('p2', addDays(today, -30));
    await seedPhoto('p3', today);
    await bodyWeightRepository.add({ date: addDays(before, 2), kg: 57 }, new Date(), today);
    await bodyWeightRepository.add({ date: today, kg: 58.4 }, new Date(), today);
    renderRoute('/progres/comparer');

    expect(await screen.findByRole('img', { name: /^Avant/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Après/ })).toBeInTheDocument();
    expect(screen.getByText('60 jours d’écart')).toBeInTheDocument();
    const weightRow = screen.getByRole('row', { name: /Poids/ });
    expect(within(weightRow).getByText('57 kg')).toBeInTheDocument();
    expect(within(weightRow).getByText('58,4 kg')).toBeInTheDocument();
    expect(within(weightRow).getByText('+1,4 kg')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /bras/i })).getAllByText('—')).toHaveLength(3);
    expect(screen.getByText(/Analyse visuelle désactivée/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Avant'), 'p2');
    expect(await screen.findByText('30 jours d’écart')).toBeInTheDocument();
  });

  it('demande au moins deux photos de la pose', async () => {
    await seedPhoto('p1', today, 'back');
    renderRoute('/progres/comparer');
    expect(await screen.findByText(/Il faut au moins deux photos « face »/)).toBeInTheDocument();
  });
});

describe('suppression', () => {
  it('supprime définitivement une photo depuis la visionneuse (avec zoom)', async () => {
    const user = userEvent.setup();
    await seedPhoto('p1', today);
    const { router } = renderRoute('/progres/photos/p1');
    await screen.findByRole('img', { name: /Photo face/ });
    await user.click(screen.getByRole('button', { name: 'Zoomer' }));
    expect(screen.getByText('1,5×')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer cette photo' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/progres/photos'));
    expect(await db.progressPhotos.count()).toBe(0);
    expect(await db.progressPhotoFiles.count()).toBe(0);
  });

  it('supprimer toutes les photos exige une confirmation écrite et garde les mesures', async () => {
    const user = userEvent.setup();
    await seedPhoto('p1', today);
    await seedPhoto('p2', today, 'side');
    renderRoute('/progres/photos');
    expect(await screen.findByText(/2 photos · /)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer toutes mes photos' }));
    const confirm = screen.getByRole('button', { name: 'Tout supprimer' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole('textbox'), 'SUPPRIMER');
    await user.click(confirm);
    await waitFor(async () => expect(await db.progressPhotos.count()).toBe(0));
    expect(await db.progressPhotoFiles.count()).toBe(0);
    expect(await bodyWeightRepository.list()).toHaveLength(1);
  });
});

describe('mensurations et graphiques', () => {
  it('enregistre des mensurations partielles, puis les affiche sans rien estimer', async () => {
    const user = userEvent.setup();
    renderRoute('/progres/mensurations');
    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Renseigne au moins un tour.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Tour de bras'), '31,5');
    await user.type(screen.getByLabelText('Tour de taille'), '300');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Entre 40 et 200 cm.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Tour de taille'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Mensurations enregistrées.')).toBeInTheDocument();
    expect(await screen.findByText('Bras 31,5 cm')).toBeInTheDocument();
    expect((await progressRepository.listMeasurements())[0]).toMatchObject({ arm: 31.5, waist: null, chest: null });
  });

  it('graphique : points réels, valeurs en tableau, évolution mesurée, aucune estimation corporelle', async () => {
    const user = userEvent.setup();
    await bodyWeightRepository.add({ date: addDays(today, -40), kg: 57.2 }, new Date(), today);
    renderRoute('/progres');
    const chart = await screen.findByRole('img', { name: /Poids : 2 mesures, de 57,2 kg/ });
    expect(chart).toBeInTheDocument();
    expect(screen.getByText(/Poids : \+0,8 kg entre le/)).toBeInTheDocument();
    chart.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getAllByText('57,2 kg').length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('Bras'));
    expect(screen.getByText('Aucune mesure sur cette période.')).toBeInTheDocument();
    expect(screen.getByText(/Il faut au moins deux mesures/)).toBeInTheDocument();
    expect(screen.queryByText(/masse grasse|IMC|score/i, { selector: 'p:not(.text-xs)' })).toBeNull();
    expect(screen.getByText(/aucune estimation de masse grasse ou musculaire, aucun score/)).toBeInTheDocument();
  });

  it('rappelle la photo du mois tant qu’elle n’est pas faite', async () => {
    renderRoute('/progres');
    expect(await screen.findByText(/Ta photo du mois n’est pas encore faite/)).toBeInTheDocument();
  });
});
