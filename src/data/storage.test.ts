import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProfile } from '../domain/profile/draft';
import { TEST_NOW, TEST_TODAY, validDraft } from '../test/fixtures';
import { VyroDatabase, openDatabase } from './db';
import { StorageError, toStorageError } from './errors';
import { deleteAllData } from './maintenance';
import { createBodyWeightRepository } from './repositories/bodyWeightRepository';
import { createDraftRepository } from './repositories/draftRepository';
import { ONBOARDING_DRAFT_ID, createProfileRepository } from './repositories/profileRepository';
import { createSettingsRepository } from './repositories/settingsRepository';
import { CURRENT_SCHEMA_VERSION, VYRO_SCHEMA, applySchema, assertValidSchema, type SchemaVersion } from './schema';

let dbName: string;
let db: VyroDatabase;

const profile = () => buildProfile(validDraft(), { today: TEST_TODAY, requireWeight: true, now: TEST_NOW });
const firstWeight = { date: TEST_TODAY, kg: 58, createdAt: TEST_NOW };

beforeEach(() => {
  dbName = `vyro-test-${crypto.randomUUID()}`;
  db = new VyroDatabase(dbName);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe('persistance', () => {
  it('retrouve le profil après fermeture et réouverture de la base', async () => {
    await createProfileRepository(db).create(profile(), firstWeight);
    db.close();

    const reopened = new VyroDatabase(dbName);
    expect(await createProfileRepository(reopened).get()).toEqual(profile());
    expect(await createBodyWeightRepository(reopened).list()).toMatchObject([{ kg: 58, date: TEST_TODAY }]);
    reopened.close();
  });

  it('renvoie null quand aucun profil n’existe', async () => {
    expect(await createProfileRepository(db).get()).toBeNull();
  });

  it('enregistre profil et première pesée ensemble, et supprime le brouillon', async () => {
    await createDraftRepository(db).save(ONBOARDING_DRAFT_ID, { firstName: 'T' });
    await createProfileRepository(db).create(profile(), firstWeight);
    expect(await createDraftRepository(db).get(ONBOARDING_DRAFT_ID)).toBeUndefined();
  });

  it('n’écrase jamais un profil existant lors d’une nouvelle configuration', async () => {
    const repo = createProfileRepository(db);
    await repo.create(profile(), firstWeight);
    const other = { ...profile(), heightCm: 190 };

    await expect(repo.create(other, firstWeight)).rejects.toMatchObject({ kind: 'conflict' });
    expect((await repo.get())?.heightCm).toBe(172);
    // Transaction annulée : la pesée de la tentative ratée n'a pas été ajoutée.
    expect(await createBodyWeightRepository(db).list()).toHaveLength(1);
  });

  it('signale un profil abîmé au lieu de le traiter comme absent', async () => {
    await db.profile.put({ id: 'me', heightCm: 'cent-soixante-douze' } as never);
    await expect(createProfileRepository(db).get()).rejects.toMatchObject({ kind: 'integrity' });
  });

  it('met à jour le profil en conservant sa date de création', async () => {
    const repo = createProfileRepository(db);
    await repo.create(profile(), firstWeight);
    await repo.update({ ...profile(), heightCm: 173, createdAt: 'autre', updatedAt: '2026-11-01T00:00:00.000Z' });
    expect(await repo.get()).toMatchObject({ heightCm: 173, createdAt: TEST_NOW });
  });

  it('refuse de mettre à jour un profil qui n’existe plus', async () => {
    await expect(createProfileRepository(db).update(profile())).rejects.toMatchObject({ kind: 'integrity' });
  });
});

describe('pesées', () => {
  it('trie de la plus récente à la plus ancienne', async () => {
    const repo = createBodyWeightRepository(db);
    await repo.add({ date: '2026-10-01', kg: 57.5 }, new Date(TEST_NOW), TEST_TODAY);
    await repo.add({ date: '2026-10-15', kg: 58 }, new Date(TEST_NOW), TEST_TODAY);
    expect((await repo.list()).map((entry) => entry.date)).toEqual(['2026-10-15', '2026-10-01']);
  });

  it('refuse une date future ou un poids hors limites', async () => {
    const repo = createBodyWeightRepository(db);
    await expect(repo.add({ date: '2026-10-21', kg: 58 }, new Date(TEST_NOW), TEST_TODAY)).rejects.toThrow(RangeError);
    await expect(repo.add({ date: TEST_TODAY, kg: 5 }, new Date(TEST_NOW), TEST_TODAY)).rejects.toThrow(RangeError);
    expect(await repo.list()).toEqual([]);
  });

  it('supprime une pesée', async () => {
    const repo = createBodyWeightRepository(db);
    const id = await repo.add({ date: TEST_TODAY, kg: 58 }, new Date(TEST_NOW), TEST_TODAY);
    await repo.remove(id);
    expect(await repo.list()).toEqual([]);
  });
});

describe('réglages', () => {
  it('fournit des valeurs par défaut et conserve les modifications', async () => {
    const repo = createSettingsRepository(db);
    expect((await repo.get()).lock.verifier).toBeNull();
    await repo.update((current) => ({ ...current, privacy: { hideWhenInactive: false } }));
    expect((await repo.get()).privacy.hideWhenInactive).toBe(false);
  });

  it('complète un ancien enregistrement auquel il manque des réglages', async () => {
    await db.settings.put({ id: 'app', privacy: { hideWhenInactive: false } } as never);
    const settings = await createSettingsRepository(db).get();
    expect(settings.privacy.hideWhenInactive).toBe(false);
    expect(settings.lock).toEqual({ verifier: null, autoLockMinutes: 1, failedAttempts: 0, retryAfter: null });
  });
});

describe('suppression de toutes les données', () => {
  it('efface profil, pesées et réglages, puis laisse une base vide utilisable', async () => {
    await createProfileRepository(db).create(profile(), firstWeight);
    await createSettingsRepository(db).update((s) => ({ ...s, privacy: { hideWhenInactive: false } }));

    await deleteAllData(db);

    expect(await createProfileRepository(db).get()).toBeNull();
    expect(await createBodyWeightRepository(db).list()).toEqual([]);
    expect((await createSettingsRepository(db).get()).privacy.hideWhenInactive).toBe(true);
  });
});

describe('migrations', () => {
  const v1: SchemaVersion = { version: 1, stores: { items: '++id' } };
  const v2: SchemaVersion = {
    version: 2,
    stores: { items: '++id, kind' },
    upgrade: async (tx) => {
      await tx
        .table('items')
        .toCollection()
        .modify((item: { label: string; kind?: string }) => {
          item.kind = item.label.startsWith('match') ? 'match' : 'training';
        });
    },
  };

  async function openWith(name: string, versions: SchemaVersion[]) {
    const database = new Dexie(name);
    applySchema(database, versions);
    await database.open();
    return database;
  }

  it('transforme les données existantes lors d’une montée de version', async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const old = await openWith(name, [v1]);
    await old.table('items').bulkAdd([{ label: 'match samedi' }, { label: 'séance jambes' }]);
    old.close();

    const upgraded = await openWith(name, [v1, v2]);
    expect(upgraded.verno).toBe(2);
    expect(await upgraded.table('items').where('kind').equals('match').count()).toBe(1);
    upgraded.close();
    await Dexie.delete(name);
  });

  it('annule toute la migration si elle échoue : les données d’origine restent intactes', async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const old = await openWith(name, [v1]);
    await old.table('items').add({ label: 'match samedi' });
    old.close();

    const failing: SchemaVersion = {
      ...v2,
      upgrade: async (tx) => {
        await tx.table('items').toCollection().modify({ kind: 'x' });
        throw new Error('migration cassée');
      },
    };
    await expect(openWith(name, [v1, failing])).rejects.toBeTruthy();

    const check = await openWith(name, [v1]);
    expect(check.verno).toBe(1);
    expect(await check.table('items').toArray()).toEqual([{ id: 1, label: 'match samedi' }]);
    check.close();
    await Dexie.delete(name);
  });

  it('signale une base créée par une version plus récente de l’application', async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const newer = new VyroDatabase(name, [...VYRO_SCHEMA, { version: CURRENT_SCHEMA_VERSION + 1, stores: { future: 'id' } }]);
    await openDatabase(newer, CURRENT_SCHEMA_VERSION + 1);
    newer.close();

    const current = new VyroDatabase(name);
    await expect(openDatabase(current)).rejects.toMatchObject({ kind: 'version' });
    expect(current.isOpen()).toBe(false);
    await Dexie.delete(name);
  });

  it('ouvre normalement la base à la version courante', async () => {
    await openDatabase(db);
    expect(db.verno).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('refuse un historique de versions non croissant', () => {
    expect(() => assertValidSchema([v2, v1])).toThrow();
    expect(() => assertValidSchema([{ version: 0, stores: {} }])).toThrow();
  });
});

describe('erreurs de stockage', () => {
  it('reconnaît un quota dépassé, même imbriqué dans une erreur Dexie', () => {
    const quota = new DOMException('plein', 'QuotaExceededError');
    expect(toStorageError(quota).kind).toBe('quota');
    expect(toStorageError({ name: 'AbortError', inner: quota }).kind).toBe('quota');
  });

  it('remonte un quota dépassé lors d’un enregistrement, sans rien écrire', async () => {
    const repo = createProfileRepository(db);
    const spy = vi
      .spyOn(db.profile, 'add')
      .mockRejectedValueOnce(new DOMException('plein', 'QuotaExceededError') as never);

    const error = await repo.create(profile(), firstWeight).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).kind).toBe('quota');
    expect((error as StorageError).message).toContain('Rien n’a été enregistré');
    spy.mockRestore();

    expect(await repo.get()).toBeNull();
    expect(await createBodyWeightRepository(db).list()).toEqual([]);
  });

  it('classe le stockage indisponible (navigation privée, connexion perdue sous iOS)', () => {
    expect(toStorageError({ name: 'MissingAPIError' }).kind).toBe('unavailable');
    expect(toStorageError({ name: 'UnknownError' }).kind).toBe('unavailable');
    expect(toStorageError(new Error('???')).kind).toBe('unknown');
  });
});
