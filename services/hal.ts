
import { TrustTier } from '../types';

export type SensorType = 'CAMERA' | 'MICROPHONE' | 'FINGERPRINT' | 'IRIS_SCANNER';

export type SensorState = 
  | 'IDLE' 
  | 'PERMISSION_REQUESTED' 
  | 'PERMISSION_DENIED_OS_LEVEL'
  | 'HARDWARE_READY' 
  | 'HARDWARE_UNSUPPORTED' 
  | 'HAL_ACTIVE'
  | 'SIGNAL_DEGRADED'
  | 'HARDWARE_LOCKOUT'
  | 'ERROR';

export interface HALTelemetry {
  lux: number;
  noise: number;
  stability: number;
  pixelDensity: 'LOW' | 'MEDIUM' | 'HIGH';
}

class HardwareAbstractionLayer {
  private static instance: HardwareAbstractionLayer;
  private activeStreams: Map<SensorType, MediaStream> = new Map();
  // Reference to Capacitor for native bridge operations
  private capacitor: any = (window as any).Capacitor;

  private constructor() {}

  static getInstance(): HardwareAbstractionLayer {
    if (!HardwareAbstractionLayer.instance) {
      HardwareAbstractionLayer.instance = new HardwareAbstractionLayer();
    }
    return HardwareAbstractionLayer.instance;
  }

  /**
   * Authority check: Are we running inside a native Capacitor wrapper?
   */
  isNative(): boolean {
    return !!this.capacitor && !!this.capacitor.isNativePlatform();
  }

  /**
   * Hardware Support Attestation
   * Native layer supply checks for sensor availability.
   */
  async checkHardwareSupport(type: SensorType): Promise<boolean> {
    if (this.isNative()) {
      // In a real Capacitor app, this would call:
      // const info = await Capacitor.Plugins.Device.getInfo();
      // For this bridge, we assume native supports the primary sensors.
      if (type === 'FINGERPRINT' || type === 'IRIS_SCANNER') {
        // Here we would call a custom biometric plugin check
        // return await Capacitor.Plugins.BiometricBridge.checkSupport();
        return false; // Defaulting to false unless specific bridge is detected
      }
      return true;
    }

    // Web Sandbox restrictions
    if (type === 'FINGERPRINT' || type === 'IRIS_SCANNER') return false;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Escalate Trust Tier based on environment and sensor type.
   */
  getAttestationTier(type: SensorType): TrustTier {
    if (!this.isNative()) {
      return TrustTier.T0_HEURISTIC; // Sandboxed web
    }

    switch (type) {
      case 'FINGERPRINT':
        return TrustTier.T2_TEE_BACKED;
      case 'IRIS_SCANNER':
        return TrustTier.T3_DEVICE_AUTH;
      default:
        return TrustTier.T1_NATIVE_OS;
    }
  }

  generateAttestationToken(type: SensorType): string {
    const tier = this.getAttestationTier(type);
    const platform = this.isNative() ? 'NATIVE_BRIDGE' : 'WEB_SANDBOX';
    return `ATTEST_${tier}_${platform}_${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  }

  /**
   * Primary Sensor Ingress
   * Handles OS-level permissions via Capacitor or Web MediaDevices.
   */
  async requestSensor(type: SensorType): Promise<{ stream?: MediaStream; state: SensorState; tier: TrustTier }> {
    const tier = this.getAttestationTier(type);
    const isSupported = await this.checkHardwareSupport(type);

    if (!isSupported) {
      return { state: 'HARDWARE_UNSUPPORTED', tier };
    }

    if (this.activeStreams.has(type)) {
      const stream = this.activeStreams.get(type)!;
      if (stream.active) return { stream, state: 'HAL_ACTIVE', tier };
      this.activeStreams.delete(type);
    }

    try {
      // If Native, we would explicitly request permissions through Capacitor plugins first
      if (this.isNative()) {
        // Example: await Capacitor.Plugins.Camera.requestPermissions();
        // The implementation here relies on the browser-interface being elevated by the native container
      }

      const constraints = type === 'CAMERA' 
        ? { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' } }
        : { audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStreams.set(type, stream);
      return { stream, state: 'HAL_ACTIVE', tier };
    } catch (err: any) {
      console.error(`HAL_INGRESS_ERROR [${type}]:`, err.name || err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return { state: 'PERMISSION_DENIED_OS_LEVEL', tier };
      }
      return { state: 'ERROR', tier };
    }
  }

  releaseSensor(type: SensorType) {
    const stream = this.activeStreams.get(type);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.activeStreams.delete(type);
    }
  }

  releaseAll() {
    Array.from(this.activeStreams.keys()).forEach(type => this.releaseSensor(type));
  }
}

export const hal = HardwareAbstractionLayer.getInstance();
