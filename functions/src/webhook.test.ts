import { verifyTellerSignature, buildTransferPayload, processTellerWebhook } from './webhook'
import * as crypto from 'crypto'

describe('verifyTellerSignature', () => {
  const secret = 'test-secret'

  function makeHeader(payload: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(`${timestamp}.${payload}`)
    const sig = hmac.digest('hex')
    return `t=${timestamp},v1=${sig}`
  }

  it('returns true for a valid signature', () => {
    const payload = '{"test":"data"}'
    const header = makeHeader(payload)
    expect(verifyTellerSignature(payload, header, secret)).toBe(true)
  })

  it('returns false for a tampered payload', () => {
    const header = makeHeader('{"test":"data"}')
    expect(verifyTellerSignature('{"test":"tampered"}', header, secret)).toBe(false)
  })

  it('returns false for missing header', () => {
    expect(verifyTellerSignature('payload', '', secret)).toBe(false)
  })
})

describe('buildTransferPayload', () => {
  it('builds a valid transfer payload', () => {
    const result = buildTransferPayload({
      betAmount: 5,
      percentage: 20,
      merchant: 'DRAFTKINGS',
      tellerTransactionId: 'txn_123',
    })
    expect(result.amount).toBe(1)
    expect(result.triggerAmount).toBe(5)
    expect(result.merchant).toBe('Draftkings')
    expect(result.status).toBe('pending')
    expect(result.tellerTransactionId).toBe('txn_123')
    expect(result.tellerTransferId).toBeNull()
    expect(result.fee).toBeNull()
  })
})

// Helper to build a valid Teller webhook body
function makeWebhookBody(merchantName = 'DRAFTKINGS', amount = '5.00', accountId = 'acc_123', txnId = 'txn_abc') {
  return {
    type: 'transaction.created',
    payload: {
      account_id: accountId,
      id: txnId,
      amount: `-${amount}`,
      details: {
        counterparty: { name: merchantName }
      }
    }
  }
}

// Helper to make a valid signature header
function makeSignatureHeader(rawBody: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(`${timestamp}.${rawBody}`)
  const sig = hmac.digest('hex')
  return `t=${timestamp},v1=${sig}`
}

describe('processTellerWebhook', () => {
  const secret = 'test-webhook-secret'

  beforeEach(() => {
    process.env.TELLER_SIGNING_SECRET = secret
  })

  afterEach(() => {
    delete process.env.TELLER_SIGNING_SECRET
    jest.resetAllMocks()
  })

  it('returns 401 for invalid signature', async () => {
    const body = makeWebhookBody()
    const rawBody = JSON.stringify(body)
    const db = {} as any
    const result = await processTellerWebhook(body, rawBody, 't=123,v1=badsig', db)
    expect(result.status).toBe(401)
  })

  it('returns 500 when TELLER_SIGNING_SECRET is not set', async () => {
    delete process.env.TELLER_SIGNING_SECRET
    const body = makeWebhookBody()
    const rawBody = JSON.stringify(body)
    const db = {} as any
    const result = await processTellerWebhook(body, rawBody, 't=123,v1=whatever', db)
    expect(result.status).toBe(500)
  })

  it('returns 200/ignored for non-transaction.created events', async () => {
    const body = { type: 'account.updated' } as any
    const rawBody = JSON.stringify(body)
    const header = makeSignatureHeader(rawBody, secret)
    const db = {} as any
    const result = await processTellerWebhook(body, rawBody, header, db)
    expect(result.status).toBe(200)
    expect(result.message).toBe('ignored')
  })

  it('returns 200/already processed for duplicate transactions', async () => {
    const body = makeWebhookBody()
    const rawBody = JSON.stringify(body)
    const header = makeSignatureHeader(rawBody, secret)

    const db = {
      collectionGroup: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: false }),
      }),
    } as any

    const result = await processTellerWebhook(body, rawBody, header, db)
    expect(result.status).toBe(200)
    expect(result.message).toBe('already processed')
  })

  it('returns 200/guardrail paused when guardrailActive is false', async () => {
    const body = makeWebhookBody()
    const rawBody = JSON.stringify(body)
    const header = makeSignatureHeader(rawBody, secret)

    const db = {
      collectionGroup: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      }),
      collection: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{
            id: 'user_1',
            data: () => ({ guardrailActive: false, guardrailPercentage: 20, tellerBettingAccountId: 'acc_123' }),
          }],
        }),
      }),
    } as any

    const result = await processTellerWebhook(body, rawBody, header, db)
    expect(result.status).toBe(200)
    expect(result.message).toBe('guardrail paused')
  })

  it('returns 200/not a sportsbook transaction for non-sportsbook merchants', async () => {
    const body = makeWebhookBody('Starbucks')
    const rawBody = JSON.stringify(body)
    const header = makeSignatureHeader(rawBody, secret)

    const db = {
      collectionGroup: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      }),
      collection: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{
            id: 'user_1',
            data: () => ({ guardrailActive: true, guardrailPercentage: 20, tellerBettingAccountId: 'acc_123' }),
          }],
        }),
      }),
    } as any

    const result = await processTellerWebhook(body, rawBody, header, db)
    expect(result.status).toBe(200)
    expect(result.message).toBe('not a sportsbook transaction')
  })
})
