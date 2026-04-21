import * as crypto from 'crypto'
import * as admin from 'firebase-admin'
import { isSportsbookTransaction, normalizeMerchantName } from './lib/sportsbooks'
import { calculateGuardrailAmount } from './lib/transfer'

export function verifyTellerSignature(payload: string, header: string, secret: string): boolean {
  if (!header) return false
  const parts = header.split(',')
  const timestamp = parts[0]?.split('=')[1]
  const signature = parts[1]?.split('=')[1]
  if (!timestamp || !signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(`${timestamp}.${payload}`)
  const expected = hmac.digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

interface TransferPayloadInput {
  betAmount: number
  percentage: number
  merchant: string
  tellerTransactionId: string
}

export function buildTransferPayload(input: TransferPayloadInput) {
  return {
    amount: calculateGuardrailAmount(input.betAmount, input.percentage),
    triggerAmount: input.betAmount,
    merchant: normalizeMerchantName(input.merchant),
    status: 'pending' as const,
    tellerTransactionId: input.tellerTransactionId,
    tellerTransferId: null,
    fee: null,
  }
}

export async function processTellerWebhook(
  body: Record<string, unknown>,
  rawBody: string,
  signatureHeader: string,
  db: admin.firestore.Firestore
): Promise<{ status: number; message: string }> {
  const secret = process.env.TELLER_SIGNING_SECRET ?? ''

  if (!verifyTellerSignature(rawBody, signatureHeader, secret)) {
    return { status: 401, message: 'Invalid signature' }
  }

  if (body.type !== 'transaction.created') {
    return { status: 200, message: 'ignored' }
  }

  const payload = body.payload as Record<string, unknown>
  const accountId = payload.account_id as string
  const transactionId = payload.id as string
  const amountStr = payload.amount as string
  const details = payload.details as Record<string, unknown>
  const counterparty = details?.counterparty as Record<string, unknown> | undefined
  const merchantName = (counterparty?.name as string) ?? ''
  const betAmount = Math.abs(parseFloat(amountStr))

  // Deduplication
  const existing = await db
    .collectionGroup('transfers')
    .where('tellerTransactionId', '==', transactionId)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { status: 200, message: 'already processed' }
  }

  // Find user by betting account ID
  const userSnap = await db
    .collection('users')
    .where('tellerBettingAccountId', '==', accountId)
    .limit(1)
    .get()

  if (userSnap.empty) {
    return { status: 200, message: 'no user for account' }
  }

  const userDoc = userSnap.docs[0]
  const userId = userDoc.id
  const userData = userDoc.data()

  if (!userData.guardrailActive) {
    return { status: 200, message: 'guardrail paused' }
  }

  if (!isSportsbookTransaction(merchantName)) {
    return { status: 200, message: 'not a sportsbook transaction' }
  }

  // Get private Teller credentials
  const privateSnap = await db.doc(`users/${userId}/private/teller`).get()
  const privateData = privateSnap.data()

  if (!privateData?.bettingAccessToken || !privateData?.savingsRoutingNumber) {
    return { status: 200, message: 'missing teller credentials' }
  }

  // Write pending transfer
  const transferPayload = buildTransferPayload({
    betAmount,
    percentage: userData.guardrailPercentage,
    merchant: merchantName,
    tellerTransactionId: transactionId,
  })

  const transferRef = db.collection(`users/${userId}/transfers`).doc()
  await transferRef.set({
    ...transferPayload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // Initiate ACH transfer via Teller
  try {
    const tellerRes = await fetch(`https://api.teller.io/accounts/${accountId}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateData.bettingAccessToken}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: privateData.savingsAccountNumber,
        routing_number: privateData.savingsRoutingNumber,
        counterparty_name: 'GuardRail Savings',
        amount: transferPayload.amount.toFixed(2),
        memo: 'GuardRail automatic savings',
      }),
    })

    if (tellerRes.ok) {
      const payment = await tellerRes.json()
      await transferRef.update({ status: 'completed', tellerTransferId: payment.id })
    } else {
      await transferRef.update({ status: 'failed' })
    }
  } catch {
    await transferRef.update({ status: 'failed' })
  }

  return { status: 200, message: 'ok' }
}
