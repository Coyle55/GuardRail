export function calculateGuardrailAmount(betAmount: number, percentage: number): number {
  return Math.round(betAmount * (percentage / 100) * 100) / 100
}
