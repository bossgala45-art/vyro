import { describe, expect, it } from 'vitest';
import { packContainer, unpackContainer } from '../backup/container';
import { BACKUP_ITERATIONS, BackupError, decryptBackup, encryptBackup, inspectBackup, validatePassphrase } from './backupCrypto';

const PASS = 'quatre mots pour basket';
const meta = { createdAt: '2026-11-02T10:00:00.000Z', appVersion: '0.9.0' };
const bytes = (text: string) => new TextEncoder().encode(text);

async function expectKind(promise: Promise<unknown>, kind: BackupError['kind']) {
  await expect(promise).rejects.toBeInstanceOf(BackupError);
  await expect(promise).rejects.toMatchObject({ kind });
}

describe('phrase secrète', () => {
  it('exige une phrase longue et variée', () => {
    expect(validatePassphrase('court')).toMatch(/Au moins 12/);
    expect(validatePassphrase('aaaaaaaaaaaaaa')).toBeDefined();
    expect(validatePassphrase('121212121212')).toBe('Trop peu de caractères différents.');
    expect(validatePassphrase(PASS)).toBeUndefined();
  });
});

describe('chiffrement', () => {
  it('aller-retour, avec 600 000 itérations et des paramètres aléatoires à chaque export', async () => {
    const first = await encryptBackup(bytes('données'), PASS, meta);
    const second = await encryptBackup(bytes('données'), PASS, meta);
    expect(first).not.toEqual(second);
    const header = JSON.parse(new TextDecoder().decode(first.subarray(12, 12 + new DataView(first.buffer).getUint32(8, true))));
    expect(header.kdf.iterations).toBe(BACKUP_ITERATIONS);
    expect(JSON.stringify(header)).not.toContain('données');
    const { plaintext, info } = await decryptBackup(first, PASS);
    expect(new TextDecoder().decode(plaintext)).toBe('données');
    expect(info).toEqual(meta);
    expect(inspectBackup(first)).toEqual(meta);
  });

  it('le contenu n’apparaît jamais en clair dans le fichier', async () => {
    const file = await encryptBackup(bytes('Pâtes au thon secret'), PASS, meta);
    expect(new TextDecoder('utf-8', { fatal: false }).decode(file)).not.toContain('Pâtes');
  });

  it('mauvaise phrase secrète : erreur claire, distincte d’un fichier abîmé', async () => {
    const file = await encryptBackup(bytes('x'), PASS, meta);
    await expectKind(decryptBackup(file, 'quatre mots pour basket!'), 'wrong-passphrase');
    await expectKind(decryptBackup(file, 'Quatre mots pour basket'), 'wrong-passphrase');
  });

  it('fichier corrompu ou modifié : données chiffrées, en-tête, tronqué', async () => {
    const file = await encryptBackup(bytes('contenu important'), PASS, meta);
    const flipped = file.slice();
    flipped[flipped.length - 3] = (flipped[flipped.length - 3] ?? 0) ^ 0xff;
    await expectKind(decryptBackup(flipped, PASS), 'corrupted');

    // Modifier la date dans l'en-tête (authentifié) est détecté.
    const tampered = file.slice();
    const headerLength = new DataView(file.buffer).getUint32(8, true);
    const header = new TextDecoder().decode(file.subarray(12, 12 + headerLength));
    const position = 12 + new TextEncoder().encode(header.slice(0, header.indexOf('2026-11-02') + 9)).length;
    tampered[position] = '3'.charCodeAt(0);
    expect(inspectBackup(tampered).createdAt).toBe('2026-11-03T10:00:00.000Z');
    await expectKind(decryptBackup(tampered, PASS), 'corrupted');

    await expectKind(decryptBackup(file.slice(0, file.length - 20), PASS), 'corrupted');
    await expectKind(decryptBackup(file.slice(0, 30), PASS), 'corrupted');
  });

  it('autre fichier, version de format inconnue, paramètres piégés', async () => {
    await expectKind(decryptBackup(bytes('{"photo": "pas une sauvegarde"}'), PASS), 'not-backup');
    await expectKind(decryptBackup(new Uint8Array(0), PASS), 'not-backup');
    const forge = (header: object) => {
      const head = bytes(JSON.stringify(header));
      const out = new Uint8Array(12 + head.length + 32);
      out.set(bytes('VYROBAK1'));
      new DataView(out.buffer).setUint32(8, head.length, true);
      out.set(head, 12);
      return out;
    };
    const base = { format: 'vyro-backup', version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: 'AAAAAAAAAAAAAAAAAAAAAA==' }, cipher: { name: 'AES-GCM', iv: 'AAAAAAAAAAAAAAAA' }, check: 'AA==' };
    await expectKind(decryptBackup(forge({ ...base, version: 2 }), PASS), 'unsupported-version');
    await expectKind(decryptBackup(forge({ ...base, kdf: { ...base.kdf, iterations: 1 } }), PASS), 'corrupted');
    await expectKind(decryptBackup(forge({ ...base, cipher: { name: 'XOR', iv: 'x' } }), PASS), 'corrupted');
  });
});

describe('conteneur', () => {
  it('sépare les images du JSON et les restitue à l’octet près', () => {
    const image = new Uint8Array([1, 2, 3, 250]).buffer;
    const packed = packContainer(
      { progressPhotoFiles: [{ id: 'p', data: image }], meals: [{ id: 'm', nested: { list: [1, { thumb: image }] } }] },
      { schemaVersion: 7, exportedAt: 'x', appVersion: '1' },
    );
    const json = new TextDecoder().decode(packed.subarray(4, 4 + new DataView(packed.buffer).getUint32(0, true)));
    expect(json).toContain('$vyroBinary');
    const content = unpackContainer(packed);
    const [file] = content.tables.progressPhotoFiles as { data: ArrayBuffer }[];
    expect([...new Uint8Array(file?.data ?? new ArrayBuffer(0))]).toEqual([1, 2, 3, 250]);
    expect(content.schemaVersion).toBe(7);
  });

  it('refuse un conteneur incohérent', () => {
    expect(() => unpackContainer(new Uint8Array([1, 0, 0]))).toThrow();
    const packed = packContainer({ t: [{ data: new ArrayBuffer(10) }] }, { schemaVersion: 7, exportedAt: 'x', appVersion: '1' });
    expect(() => unpackContainer(packed.slice(0, packed.length - 5))).toThrow(/hors limites/);
  });
});
