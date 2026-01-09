import type { AegisNativeBridgePlugin } from './definitions'

export class AegisNativeBridgeWeb implements AegisNativeBridgePlugin {

  async startFingerprintScan() {
    return { success: false, error: 'BIOMETRIC_UNSUPPORTED_ON_WEB' }
  }

  async getPlayIntegrityToken() {
    return { success: false, error: 'INTEGRITY_UNSUPPORTED_ON_WEB' }
  }

  async getAppAttest() {
    return { success: false, error: 'INTEGRITY_UNSUPPORTED_ON_WEB' }
  }
}
