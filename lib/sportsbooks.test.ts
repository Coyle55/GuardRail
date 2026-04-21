import { isSportsbookTransaction, normalizeMerchantName } from './sportsbooks'

describe('isSportsbookTransaction', () => {
  it('matches DraftKings (uppercase)', () => {
    expect(isSportsbookTransaction('DRAFTKINGS')).toBe(true)
  })
  it('matches FanDuel with extra text', () => {
    expect(isSportsbookTransaction('FanDuel Sportsbook LLC')).toBe(true)
  })
  it('matches BetMGM', () => {
    expect(isSportsbookTransaction('BETMGM LLC')).toBe(true)
  })
  it('does not match unrelated merchants', () => {
    expect(isSportsbookTransaction('Starbucks')).toBe(false)
  })
  it('does not match empty string', () => {
    expect(isSportsbookTransaction('')).toBe(false)
  })
})

describe('normalizeMerchantName', () => {
  it('returns "Draftkings" for DRAFTKINGS', () => {
    expect(normalizeMerchantName('DRAFTKINGS')).toBe('Draftkings')
  })
  it('returns "Fanduel" for FanDuel Sportsbook', () => {
    expect(normalizeMerchantName('FanDuel Sportsbook')).toBe('Fanduel')
  })
  it('returns original name for unknown merchant', () => {
    expect(normalizeMerchantName('Starbucks')).toBe('Starbucks')
  })
})
