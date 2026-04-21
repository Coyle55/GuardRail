import { verifyTellerSignature, buildTransferPayload } from './webhook'
import * as crypto from 'crypto'

describe('verifyTellerSignature', () => {
  const secret = 'test-secret'

  function makeHeader(payload: string): string {
    const timestamp = '1700000000'
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
