export interface BiometricResult {
  success: boolean
  status?: 'SUCCESS' | 'FAIL'
  attestationLevel?: 'SANDBOX' | 'STRONG' | 'HARDWARE'
  error?: string
}

export interface IntegrityResult {
  success: boolean
  integrityToken?: string
  nonce?: string
  attestation?: 'PLAY_INTEGRITY' | 'APP_ATTEST'
  error?: string
}

export interface AegisNativeBridgePlugin {
  startFingerprintScan(): Promise<BiometricResult>
  getPlayIntegrityToken(): Promise<IntegrityResult>
  getAppAttest(): Promise<IntegrityResult>
}y



