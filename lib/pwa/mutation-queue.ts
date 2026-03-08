import { createClient } from '@/lib/supabase/client';
import { getAllPendingMutations, deletePendingMutation, type PendingMutation } from './offline-db';

export async function queueMutation(mutation: {
  table: string;
  type: 'INSERT' | 'DELETE';
  data: Record<string, unknown>;
  filters?: Record<string, unknown>;
}) {
  const { addPendingMutation } = await import('./offline-db');
  return addPendingMutation(mutation);
}

export async function processPendingMutations(): Promise<{ processed: number; failed: number }> {
  const mutations = await getAllPendingMutations();
  if (mutations.length === 0) return { processed: 0, failed: 0 };

  const supabase = createClient();
  let processed = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      const success = await executeMutation(supabase, mutation);
      if (success) {
        await deletePendingMutation(mutation.id);
        processed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}

async function executeMutation(
  supabase: ReturnType<typeof createClient>,
  mutation: PendingMutation
): Promise<boolean> {
  if (mutation.type === 'INSERT') {
    const { error } = await supabase
      .from(mutation.table)
      .insert(mutation.data);
    return !error;
  }

  if (mutation.type === 'DELETE' && mutation.filters) {
    let query = supabase.from(mutation.table).delete();
    for (const [key, value] of Object.entries(mutation.filters)) {
      query = query.eq(key, value as string);
    }
    const { error } = await query;
    return !error;
  }

  return false;
}
