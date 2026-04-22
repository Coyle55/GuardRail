import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'
import { processTellerWebhook } from './webhook'

const tellerSigningSecret = defineSecret('TELLER_SIGNING_SECRET')

admin.initializeApp()
const db = admin.firestore()

export const tellerWebhook = onRequest({ secrets: [tellerSigningSecret] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const rawBody = req.rawBody?.toString('utf8')
  if (!rawBody) {
    res.status(500).send('rawBody unavailable')
    return
  }
  const signatureHeader = (req.headers['teller-signature'] as string) ?? ''

  const result = await processTellerWebhook(req.body, rawBody, signatureHeader, db)
  res.status(result.status).send(result.message)
})
