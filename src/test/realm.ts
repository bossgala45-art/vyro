/*
 * Sous jsdom, `structuredClone` (utilisé par fake-indexeddb) vient de Node et renvoie des
 * ArrayBuffer d'un autre « realm » que celui des tests. Dexie ne les reconnaît alors pas comme
 * données binaires et les copie mal dans ses requêtes réactives. Dans un vrai navigateur il n'y
 * a qu'un seul realm : ce correctif ne concerne que l'environnement de test.
 * Chargé avant fake-indexeddb (voir vitest.config.ts).
 */
const nodeClone = globalThis.structuredClone;

function toLocalRealm(value: unknown, seen = new Map<object, unknown>()): unknown {
  if (typeof value !== 'object' || value === null) return value;
  if (seen.has(value)) return seen.get(value);
  if (Object.prototype.toString.call(value) === '[object ArrayBuffer]' && !(value instanceof ArrayBuffer)) {
    const local = new Uint8Array(new Uint8Array(value as ArrayBuffer)).buffer;
    seen.set(value, local);
    return local;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => (value[index] = toLocalRealm(item, seen)));
  } else if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
    for (const key of Object.keys(value)) (value as Record<string, unknown>)[key] = toLocalRealm((value as Record<string, unknown>)[key], seen);
  }
  seen.set(value, value);
  return value;
}

globalThis.structuredClone = ((value: unknown, options?: StructuredSerializeOptions) =>
  toLocalRealm(nodeClone(value, options))) as typeof structuredClone;
