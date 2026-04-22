import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { tellerFetch } from '@/lib/teller-client'

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

  // Fetch accounts from Teller server-side (mTLS)
  const accountsRes = await tellerFetch('https://api.teller.io/accounts', {
    headers: { Authorization: `Basic ${basicAuth}` },
  })
  console.log('[teller/link] accounts status:', accountsRes.status)
  if (!accountsRes.ok) {
    const body = await accountsRes.json()
    console.error('[teller/link] accounts error:', body)
    return NextResponse.json({ error: 'Failed to fetch accounts from Teller' }, { status: 502 })
  }
  type TellerAccount = { id: string; type: string; subtype: string }
  const accounts = await accountsRes.json() as TellerAccount[]
  console.log('[teller/link] accounts:', JSON.stringify(accounts))

  // Pick the most appropriate account for the role:
  // betting → depository checking; savings → depository savings (or any depository)
  const pick = (accs: TellerAccount[], forType: 'betting' | 'savings') => {
    if (forType === 'savings') {
      return (
        accs.find((a) => a.type === 'depository' && a.subtype === 'savings') ??
        accs.find((a) => a.type === 'depository') ??
        accs[0]
      )
    }
    return (
      accs.find((a) => a.type === 'depository' && a.subtype === 'checking') ??
      accs.find((a) => a.type === 'depository') ??
      accs[0]
    )
  }

  const account = pick(accounts, type as 'betting' | 'savings')
  const accountId = account?.id
  if (!accountId) {
    return NextResponse.json({ error: 'No accounts found in enrollment' }, { status: 400 })
  }
  console.log('[teller/link] selected account:', accountId, account?.subtype)

  type TellerDetails = { account_number: string; routing_numbers: { ach?: string } }
  let savingsDetails: TellerDetails | null = null
  if (type === 'savings') {
    const detailsRes = await tellerFetch(`https://api.teller.io/accounts/${accountId}/details`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    })
    console.log('[teller/link] details status:', detailsRes.status)
    if (!detailsRes.ok) {
      const body = await detailsRes.json()
      console.error('[teller/link] details error:', body)
      return NextResponse.json({ error: 'Failed to fetch account details from Teller' }, { status: 502 })
    }
    savingsDetails = await detailsRes.json() as TellerDetails
    console.log('[teller/link] savingsDetails:', JSON.stringify(savingsDetails))
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
        savingsRoutingNumber: savingsDetails!.routing_numbers.ach ?? null,
        savingsAccountNumber: savingsDetails!.account_number,
      },
      { merge: true }
    )
    batch.set(userRef, { tellerSavingsAccountId: accountId }, { merge: true })
  }

  await batch.commit()
  return NextResponse.json({ ok: true })
}
