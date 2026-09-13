import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { enrichSave } from '@/lib/enrichSave';

// POST /api/enrich  { saveId }  Authorization: Bearer <firebase id token>
//
// Fired fire-and-forget by the client right after a save is created. Verifies
// the caller's ID token, then enriches that user's save with a Gemini-generated
// summary + tags. Idempotent — safe to call more than once for the same save.

export const runtime = 'nodejs';
export const maxDuration = 30;

// The browser extension calls this cross-origin (from chrome-extension://…),
// which triggers a CORS preflight because of the Authorization header. No
// cookies are sent (bearer token only), so a wildcard origin is safe here.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'missing token' }, { status: 401, headers: CORS });
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401, headers: CORS });
  }

  let saveId: string;
  try {
    const body = (await req.json()) as { saveId?: unknown };
    if (typeof body.saveId !== 'string' || !body.saveId) {
      return NextResponse.json({ error: 'saveId required' }, { status: 400, headers: CORS });
    }
    saveId = body.saveId;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400, headers: CORS });
  }

  try {
    const result = await enrichSave(uid, saveId);
    return NextResponse.json({ ok: true, result }, { headers: CORS });
  } catch (err) {
    console.error('[enrich] failed', err);
    return NextResponse.json({ error: 'enrichment failed' }, { status: 500, headers: CORS });
  }
}
