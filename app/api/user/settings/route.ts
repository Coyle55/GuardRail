import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { guardrailPercentage, guardrailActive } = await req.json()
  const update: Record<string, unknown> = {}

  if (typeof guardrailPercentage === 'number') update.guardrailPercentage = guardrailPercentage
  if (typeof guardrailActive === 'boolean') update.guardrailActive = guardrailActive

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await adminDb.doc(`users/${uid}`).update(update)
  return NextResponse.json({ ok: true })
}
