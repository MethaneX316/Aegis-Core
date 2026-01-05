
export type FingerprintStatus = 
  | 'IDLE' 
  | 'WAITING_FOR_SENSOR' 
  | 'HARDWARE_UNSUPPORTED' 
  | 'NATIVE_BRIDGE_REQUIRED'
  | 'ACQUIRING' 
  | 'SUCCESS' 
  | 'FAIL' 
  | 'ABORTED';

export interface FingerprintEvent {
  status: FingerprintStatus;
  progress?: number;
  error?: string;
  telemetry?: {
    platform: string;
    attestationLevel: 'NONE' | 'SANDBOX' | 'TEE' | 'HSM';
  };
}

export class BiometricBridge {
  private static instance: BiometricBridge;
  private abortController: AbortController | null = null;

  private constructor() {}

  static getInstance(): BiometricBridge {
    if (!BiometricBridge.instance) {
      BiometricBridge.instance = new BiometricBridge();
    }
    return BiometricBridge.instance;
  }

  async startScan(onEvent: (event: FingerprintEvent) => void): Promise<void> {
    this.abortController = new AbortController();
    
    // Check for Browser Context (The Sandbox Limitation)
    const isBrowser = !((window as any).Capacitor || (window as any).webkit || (window as any).Android);
    
    if (isBrowser) {
      onEvent({ 
        status: 'HARDWARE_UNSUPPORTED', 
        error: 'BROWSER_CONTEXT_ISOLATION',
        telemetry: {
          platform: navigator.userAgent,
          attestationLevel: 'NONE'
        }
      });
      return;
    }

    onEvent({ status: 'WAITING_FOR_SENSOR' });

    // In a Native environment, this would call the custom Capacitor/Native plugin.
    // For this context, it remains in AWAITING_BRIDGE mode.
    onEvent({ status: 'NATIVE_BRIDGE_REQUIRED' });
  }

  // WebAuthn serves as a high-level auth but NOT as a biometric sensor for Aegis
  // Aegis requires Raw Bitstream or Signed TEE Token.
  async attemptWebAuthnAttestation(onEvent: (event: FingerprintEvent) => void): Promise<void> {
    try {
      if (!window.isSecureContext || !navigator.credentials) {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: any = {
        publicKey: {
          challenge,
          rp: { name: "Aegis Core", id: window.location.hostname },
          user: {
            id: Uint8Array.from("USER_ID", c => c.charCodeAt(0)),
            name: "operator@aegis.core",
            displayName: "Operator",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform" },
          timeout: 10000,
        }
      };

      const credential = await navigator.credentials.create(options);
      
      if (credential) {
        // Even if WebAuthn succeeds, Aegis treats it as "Level 2" (Software-Bound)
        // Unless a TEE signature is present, progress is capped at 0.
        onEvent({ 
          status: 'FAIL', 
          error: 'INSUFFICIENT_ATTESTATION_LEVEL: RAW_DACTYL_MISSING' 
        });
      }
    } catch (err: any) {
      onEvent({ 
        status: 'HARDWARE_UNSUPPORTED', 
        error: err.name === 'NotAllowedError' ? 'USER_REFUSED' : 'PLATFORM_NOT_SUPPORTED' 
      });
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const biometricBridge = BiometricBridge.getInstance();
