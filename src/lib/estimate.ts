import { listLastConfirmed } from '@/db/queries/instances';

const SAMPLE_SIZE = 3;

export async function estimateForEntry(entryId: string): Promise<number | null> {
  const recent = await listLastConfirmed(entryId, SAMPLE_SIZE);
  if (recent.length < SAMPLE_SIZE) return null;
  const total = recent.reduce((sum, r) => sum + r.amount, 0);
  return total / recent.length;
}
