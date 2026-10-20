import { db as defaultDb, type VyroDatabase } from '../db';
import { guard } from '../errors';

export function createDraftRepository(db: VyroDatabase) {
  return {
    async get(id: string): Promise<unknown> {
      return (await guard(() => db.drafts.get(id)))?.data;
    },
    async save(id: string, data: unknown, now = new Date()): Promise<void> {
      await guard(() => db.drafts.put({ id, data, updatedAt: now.toISOString() }));
    },
    async remove(id: string): Promise<void> {
      await guard(() => db.drafts.delete(id));
    },
  };
}

export const draftRepository = createDraftRepository(defaultDb);
