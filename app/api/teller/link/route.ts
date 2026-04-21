import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let uid: string
  try {
    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { accessToken, type } = await req.json()

  if (!accessToken || !['betting', 'savings'].includes(type)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const basicAuth = Buffer.from(`${accessToken}:`).toString('base64')

  // Fetch accounts from Teller server-side
  const accountsRes = await fetch('https://api.teller.io/accounts', {
    headers: { Authorization: `Basic ${basicAuth}` },
  })
  if (!accountsRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch accounts from Teller' }, { status: 502 })
  }
  const accounts = await accountsRes.json()
  const accountId = accounts[0]?.id
  if (!accountId) {
    return NextResponse.json({ error: 'No accounts found in enrollment' }, { status: 400 })
  }

  let savingsDetails: { routing_number: string; account_number: string } | null = null
  if (type === 'savings') {
    const detailsRes = await fetch(`https://api.teller.io/accounts/${accountId}/details`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    })
    if (!detailsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch account details from Teller' }, { status: 502 })
    }
    savingsDetails = await detailsRes.json()
  }

  const batch = adminDb.batch()
  const privateRef = adminDb.doc(`users/${uid}/private/teller`)
  const userRef = adminDb.doc(`users/${uid}`)

  if (type === 'betting') {
    batch.set(privateRef, { bettingAccessToken: accessToken }, { merge: true })
    batch.set(userRef, { tellerBettingAccountId: accountId }, { merge: true })
  } else {
    batch.set(
      privateRef,
      {
        savingsAccessToken: accessToken,
        savingsRoutingNumber: savingsDetails!.routing_number,
        savingsAccountNumber: savingsDetails!.account_number,
      },
      { merge: true }
    )
    batch.set(userRef, { tellerSavingsAccountId: accountId }, { merge: true })
  }

  await batch.commit()
  return NextResponse.json({ ok: true })
}
