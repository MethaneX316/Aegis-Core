export type Platform = 'ANDROID' | 'IOS'

export interface AttestationPayload {
  platform: Platform
  integrityToken: string
  nonce?: string
}

export interface TrustResult {
  role: 'ADMIN' | 'ANALYST' | 'USER'
  integrity: boolean
  biometric: boolean
}
