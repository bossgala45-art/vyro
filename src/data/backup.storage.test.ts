import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { packContainer } from '../backup/container';
import { buildProfile } from '../domain/profile/draft';
import { BackupError, encryptBackup } from '../security/backupCrypto';
import { TEST_NOW, TEST_TODAY, validDraft } from '../test/fixtures';
import { exportBackup, stageRestore, tablesAtVersion } from './backup';
import { VyroDatabase, openDatabase } from './db';
import { createNutritionRepository } from './repositories/nutritionRepository';
import { createProfileRepository } from './repositories/profileRepository';
import { createProgressRepository } from './repositories/progressRepository';
import { createSettingsRepository } from './repositories/settingsRepository';

const PASS = 'quatre mots pour basket';
const names: string[] = [];
const databases: VyroDatabase[] = [];

function database(): VyroDatabase {
  const name = `vyro-backup-${crypto.randomUUID()}`;
  names.push(name);
  const db = new VyroDatabase(name);
  databases.push(db);
  return db;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const db of databases.splice(0)) db.close();
  for (const name of names.splice(0)) await Dexie.delete(name);
  // Bases temporaires de restauration éventuellement restées.
  for (const name of await Dexie.getDatabaseNames()) if (name.startsWith('vyro-restauration-')) await Dexie.delete(name);
});

async function seed(db: VyroDatabase, firstName = 'Alex', photoBytes = 2048) {
  const profile = buildProfile(validDraft({ firstName }), { today: TEST_TODAY, requireWeight: true, now: TEST_NOW });
  await createProfileRepository(db).create(profile, { date: TEST_TODAY, kg: 58, createdAt: TEST_NOW });
  await createProgressRepository(db).addPhoto(
    {
      id: 'p1',
      date: TEST_TODAY,
      pose: 'front',
      width: 1200,
      height: 1600,
      bytes: photoBytes,
      thumbnail: { mimeType: 'image/jpeg', data: new Uint8Array(64).fill(7).buffer, width: 270, height: 360 },
      notes: '',
      createdAt: TEST_NOW,
    },
    { id: 'p1', mimeType: 'image/jpeg', data: new Uint8Array(photoBytes).map((_, i) => i % 251).buffer },
  );
  await createProgressRepository(db).saveMeasurement(
    { date: TEST_TODAY, arm: 31, chest: null, shoulders: null, waist: 72, notes: '', createdAt: TEST_NOW, updatedAt: TEST_NOW },
    TEST_TODAY,
  );
}

describe('export puis restauration', () => {
  beforeEach(() => undefined);

  it('restaure toutes les données, photos comprises, à l’identique', async () => {
    const source = database();
    await seed(source);
    const file = await exportBackup(PASS, { db: source, appVersion: '0.9.0' });

    const target = database();
    await openDatabase(target);
    const staged = await stageRestore(file, PASS, { db: target });
    expect(staged.preview.firstName).toBe('Alex');
    expect(staged.preview.counts.find((count) => count.table === 'progressPhotos')).toEqual({ table: 'progressPhotos', backup: 1, current: 0 });
    expect(staged.preview.photoBytes).toBe(2048);
    // Rien n'est encore modifié.
    expect(await createProfileRepository(target).get()).toBeNull();

    await staged.apply();
    expect((await createProfileRepository(target).get())?.firstName).toBe('Alex');
    const restoredFile = await createProgressRepository(target).getPhotoFile('p1');
    expect([...new Uint8Array(restoredFile?.data ?? new ArrayBuffer(0)).slice(0, 5)]).toEqual([0, 1, 2, 3, 4]);
    expect(restoredFile?.data.byteLength).toBe(2048);
    expect((await createProgressRepository(target).listMeasurements())[0]).toMatchObject({ arm: 31, chest: null });
    expect((await Dexie.getDatabaseNames()).some((name) => name.startsWith('vyro-restauration-'))).toBe(false);
  });

  it('remplace les données existantes mais garde le verrouillage de cet appareil', async () => {
    const source = database();
    await seed(source, 'Alex');
    await createSettingsRepository(source).update((settings) => ({ ...settings, privacy: { hideWhenInactive: false } }));
    const file = await exportBackup(PASS, { db: source });

    const target = database();
    await seed(target, 'Autre');
    const verifier = { algorithm: 'PBKDF2-SHA256' as const, iterations: 600000, salt: 'c2Fs', hash: 'aGFzaA==' };
    await createSettingsRepository(target).update((settings) => ({ ...settings, lock: { ...settings.lock, verifier } }));

    const staged = await stageRestore(file, PASS, { db: target });
    expect(staged.preview.counts.find((count) => count.table === 'profile')).toEqual({ table: 'profile', backup: 1, current: 1 });
    await staged.apply();
    const settings = await createSettingsRepository(target).get();
    expect((await createProfileRepository(target).get())?.firstName).toBe('Alex');
    expect(settings.privacy.hideWhenInactive).toBe(false);
    expect(settings.lock.verifier).toEqual(verifier);
  });

  it('annuler la restauration ne change rien', async () => {
    const source = database();
    await seed(source, 'Alex');
    const target = database();
    await seed(target, 'Moi');
    const staged = await stageRestore(await exportBackup(PASS, { db: source }), PASS, { db: target });
    await staged.discard();
    expect((await createProfileRepository(target).get())?.firstName).toBe('Moi');
    expect((await Dexie.getDatabaseNames()).some((name) => name.startsWith('vyro-restauration-'))).toBe(false);
  });

  it('espace plein pendant la restauration : tout ou rien, les données actuelles restent intactes', async () => {
    const source = database();
    await seed(source, 'Alex');
    const target = database();
    await seed(target, 'Moi');
    const staged = await stageRestore(await exportBackup(PASS, { db: source }), PASS, { db: target });
    // La restauration écrit table par table dans une seule transaction : l'échec de la dernière annule tout.
    const prototype = target.Table.prototype as { bulkPut: (...args: unknown[]) => Promise<unknown> };
    const original = prototype.bulkPut;
    vi.spyOn(prototype, 'bulkPut').mockImplementation(function (this: { name: string }, ...args: unknown[]) {
      if (this.name === 'progressPhotoFiles') return Promise.reject(new DOMException('plein', 'QuotaExceededError'));
      return original.apply(this, args);
    });
    await expect(staged.apply()).rejects.toMatchObject({ kind: 'quota' });
    expect((await createProfileRepository(target).get())?.firstName).toBe('Moi');
    expect(await target.progressPhotoFiles.count()).toBe(1);
  });

  it('données volumineuses : 12 photos de 1 Mo', async () => {
    const source = database();
    await seed(source);
    const progress = createProgressRepository(source);
    for (let index = 0; index < 12; index++) {
      const id = `big-${index}`;
      const data = new Uint8Array(1024 * 1024).fill(index + 1).buffer;
      await progress.addPhoto(
        { id, date: TEST_TODAY, pose: 'side', width: 1200, height: 1600, bytes: data.byteLength, thumbnail: { mimeType: 'image/jpeg', data: new Uint8Array(32).fill(1).buffer, width: 1, height: 1 }, notes: '', createdAt: TEST_NOW },
        { id, mimeType: 'image/jpeg', data },
      );
    }
    const file = await exportBackup(PASS, { db: source });
    expect(file.byteLength).toBeGreaterThan(12 * 1024 * 1024);
    const target = database();
    const staged = await stageRestore(file, PASS, { db: target });
    await staged.apply();
    const restored = await createProgressRepository(target).getPhotoFile('big-11');
    expect(restored?.data.byteLength).toBe(1024 * 1024);
    expect(new Uint8Array(restored?.data ?? new ArrayBuffer(1))[1000]).toBe(12);
  }, 60_000);
});

describe('erreurs', () => {
  it('mauvaise phrase secrète et fichier corrompu : rien n’est modifié', async () => {
    const source = database();
    await seed(source, 'Alex');
    const file = await exportBackup(PASS, { db: source });
    const target = database();
    await seed(target, 'Moi');

    await expect(stageRestore(file, 'une autre phrase secrète', { db: target })).rejects.toMatchObject({ kind: 'wrong-passphrase' });
    const broken = file.slice();
    broken[broken.length - 100] = (broken[broken.length - 100] ?? 0) ^ 1;
    await expect(stageRestore(broken, PASS, { db: target })).rejects.toMatchObject({ kind: 'corrupted' });
    expect((await createProfileRepository(target).get())?.firstName).toBe('Moi');
  });

  it('refuse d’exporter sans profil', async () => {
    const empty = database();
    await openDatabase(empty);
    await expect(exportBackup(PASS, { db: empty })).rejects.toMatchObject({ kind: 'integrity' });
  });

  it('sauvegarde d’une version plus récente de VYRO : refusée', async () => {
    const plaintext = packContainer({ profile: [] }, { schemaVersion: 99, exportedAt: TEST_NOW, appVersion: '9' });
    const file = await encryptBackup(plaintext, PASS, { createdAt: TEST_NOW, appVersion: '9' });
    await expect(stageRestore(file, PASS, { db: database() })).rejects.toMatchObject({ kind: 'too-new' });
  });

  it('contenu incohérent (déchiffrable mais invalide) : refusé et base temporaire supprimée', async () => {
    const make = async (tables: Record<string, unknown[]>, schemaVersion = 7) =>
      encryptBackup(packContainer(tables, { schemaVersion, exportedAt: TEST_NOW, appVersion: '1' }), PASS, { createdAt: TEST_NOW, appVersion: '1' });
    await expect(stageRestore(await make({ profile: [] }), PASS, { db: database() })).rejects.toMatchObject({ kind: 'invalid-content' });
    await expect(stageRestore(await make({ inconnue: [{ a: 1 }] }), PASS, { db: database() })).rejects.toMatchObject({ kind: 'invalid-content' });
    const profile = buildProfile(validDraft(), { today: TEST_TODAY, requireWeight: true, now: TEST_NOW });
    await expect(stageRestore(await make({ profile: [profile], meals: [{ id: 'x', date: 'hier' }] }), PASS, { db: database() })).rejects.toBeInstanceOf(BackupError);
    expect((await Dexie.getDatabaseNames()).some((name) => name.startsWith('vyro-restauration-'))).toBe(false);
  });
});

describe('versions du format de données', () => {
  it('une sauvegarde d’une ancienne version est migrée au schéma actuel', async () => {
    const profile = buildProfile(validDraft({ firstName: 'Ancien' }), { today: TEST_TODAY, requireWeight: true, now: TEST_NOW });
    const routine = { id: 'me', gymDays: [0, 2], practiceDays: [1], matchDays: [5], includeOptionalThird: false, updatedAt: TEST_NOW };
    const plaintext = packContainer({ profile: [profile], routine: [routine] }, { schemaVersion: 2, exportedAt: TEST_NOW, appVersion: '0.3.0' });
    const file = await encryptBackup(plaintext, PASS, { createdAt: TEST_NOW, appVersion: '0.3.0' });
    const target = database();
    const staged = await stageRestore(file, PASS, { db: target });
    expect(staged.preview.schemaVersion).toBe(2);
    await staged.apply();
    expect((await target.activities.toArray()).map((activity) => activity.kind).sort()).toEqual(['match', 'practice']);
    expect(await createNutritionRepository(target).listMeals()).toEqual([]);
  });

  it('connaît les tables de chaque version du schéma', () => {
    expect(tablesAtVersion(2).has('routine')).toBe(true);
    expect(tablesAtVersion(3).has('routine')).toBe(false);
    expect(tablesAtVersion(7).has('motivation')).toBe(true);
  });
});
