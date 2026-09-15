import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { enrichSave } from '@/lib/enrichSave';

// GET /api/enrich-sweep  — the reliability backstop.
//
// A Firestore onCreate trigger would need Cloud Functions (Blaze). Instead the
// client fires enrichment directly; anything it misses (offline, closed tab,
// transient error) is caught here. Runs on a Vercel Cron schedule, finds saves
// still `pending`, and enriches a bounded batch.
//
// Protected by CRON_SECRET so only the scheduler can invoke it. Vercel Cron
// sends it automatically as `Authorization: Bearer <CRON_SECRET>`.

export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH = 20;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get('authorization') ?? '';
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Collection-group query across every user's saves (Admin SDK bypasses rules).
  // Retry both never-enriched (`pending`) and transiently-failed (`error`) saves.
  const snap = await adminDb()
    .collectionGroup('saves')
    .where('enrichStatus', 'in', ['pending', 'error'])
    .limit(BATCH)
    .get();

  let done = 0;
  let failed = 0;
  for (const docSnap of snap.docs) {
    const userId = docSnap.ref.parent.parent?.id;
    if (!userId) continue;
    try {
      await enrichSave(userId, docSnap.id);
      done++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, scanned: snap.size, done, failed });
}
