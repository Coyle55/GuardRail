import { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  email: string
  displayName: string
  guardrailPercentage: number
  guardrailActive: boolean
  tellerBettingAccountId: string | null
  tellerSavingsAccountId: string | null
  createdAt: Timestamp
}

export interface Transfer {
  id: string
  amount: number
  triggerAmount: number
  merchant: string
  status: 'pending' | 'completed' | 'failed'
  tellerTransactionId: string
  tellerTransferId: string | null
  fee: number | null
  createdAt: Timestamp
}

export interface TellerEnrollment {
  accessToken: string
  user: { id: string }
  enrollment: { id: string; institution: { name: string } }
}

export interface TellerAccount {
  id: string
  name: string
  type: string
  subtype: string
  institution: { name: string }
  last_four: string
}
