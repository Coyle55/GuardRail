import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { processTellerWebhook } from './webhook'

admin.initializeApp()
const db = admin.firestore()

export const tellerWebhook = onRequest(async (req, res) => {
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
