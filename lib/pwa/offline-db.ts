import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface PendingMutation {
  id: string;
  table: string;
  type: 'INSERT' | 'DELETE';
  data: Record<string, unknown>;
  filters?: Record<string, unknown>;
  createdAt: number;
}

interface RoutineCache {
  id: string;
  data: unknown;
  cachedAt: number;
}

interface CompletionCache {
  id: string;
  exerciseId: string;
  data: unknown;
  cachedAt: number;
}

interface G10FlowDB extends DBSchema {
  routines: {
    key: string;
    value: RoutineCache;
  };
  completions: {
    key: string;
    value: CompletionCache;
    indexes: { 'by-exercise': string };
  };
  pendingMutations: {
    key: string;
    value: PendingMutation;
    indexes: { 'by-created': number };
  };
}

const DB_NAME = 'g10flow';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<G10FlowDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB<G10FlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('routines')) {
          db.createObjectStore('routines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('completions')) {
          const completionStore = db.createObjectStore('completions', { keyPath: 'id' });
          completionStore.createIndex('by-exercise', 'exerciseId');
        }
        if (!db.objectStoreNames.contains('pendingMutations')) {
          const mutationStore = db.createObjectStore('pendingMutations', { keyPath: 'id' });
          mutationStore.createIndex('by-created', 'createdAt');
        }
      },
    });
  }

  return dbPromise;
}

// --- Routine cache ---

export async function cacheRoutine(id: string, data: unknown) {
  const db = await getDB();
  if (!db) return;
  await db.put('routines', { id, data, cachedAt: Date.now() });
}

export async function getCachedRoutine(id: string) {
  const db = await getDB();
  if (!db) return null;
  const entry = await db.get('routines', id);
  return entry?.data ?? null;
}

// --- Completion cache ---

export async function cacheCompletion(id: string, exerciseId: string, data: unknown) {
  const db = await getDB();
  if (!db) return;
  await db.put('completions', { id, exerciseId, data, cachedAt: Date.now() });
}

export async function deleteCachedCompletion(exerciseId: string) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction('completions', 'readwrite');
  const index = tx.store.index('by-exercise');
  let cursor = await index.openCursor(exerciseId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// --- Pending mutations ---

export async function addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt'>) {
  const db = await getDB();
  if (!db) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await db.put('pendingMutations', { ...mutation, id, createdAt: Date.now() });
  return id;
}

export async function getAllPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('pendingMutations', 'by-created');
}

export async function deletePendingMutation(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete('pendingMutations', id);
}

export type { PendingMutation };
