export const SPORTSBOOK_MERCHANTS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'pointsbet',
  'caesars',
  'espn bet',
  'bet365',
  'barstool',
  'betrivers',
  'hard rock bet',
  'fliff',
  'fanatics',
  'underdog',
]

export function isSportsbookTransaction(merchantName: string): boolean {
  if (!merchantName) return false
  const normalized = merchantName.toLowerCase()
  return SPORTSBOOK_MERCHANTS.some((m) => normalized.includes(m))
}

export function normalizeMerchantName(merchantName: string): string {
  const normalized = merchantName.toLowerCase()
  const match = SPORTSBOOK_MERCHANTS.find((m) => normalized.includes(m))
  if (!match) return merchantName
  return match.charAt(0).toUpperCase() + match.slice(1)
}
