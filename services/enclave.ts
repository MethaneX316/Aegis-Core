
import { SecureFile, AnalysisReport, LockPolicy, AccessRules, SignalType, UserRole, IngressPath, CaptureMode, TrustTier } from '../types';
// Fix: Import hal for tier attestation
import { hal, SensorType } from './hal';

class EnclaveService {
  private hardwareEntropy: string = "HWR-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  private async deriveHash(input: string, salt: string = ""): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input + salt + this.hardwareEntropy);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async createBFile(
    filename: string, 
    size: string, 
    policy: LockPolicy, 
    rules: AccessRules, 
    creatorRole: UserRole = 'Admin',
    biometricCtx: { 
      domain: SignalType, 
      path: IngressPath, 
      mode: CaptureMode, 
      liveness: number, 
      antiSpoof: number,
      featureVectorHash: string,
      pathSpecific?: any
    },
    storageProvider: 'LOCAL_ENCLAVE' | 'EXTERNAL_HSM' | 'CLOUD_VAULT' = 'LOCAL_ENCLAVE'
  ): Promise<SecureFile> {
    const bindingHash = await this.deriveHash(biometricCtx.featureVectorHash, filename);
    const auditHash = await this.deriveHash(filename + size + Date.now());
    
    // Fix: Map domain to sensor type for attestation tier determination
    const sTypeMap: Record<string, SensorType> = {
      [SignalType.FACE]: 'CAMERA',
      [SignalType.VOICE]: 'MICROPHONE',
      [SignalType.IRIS]: 'IRIS_SCANNER',
      [SignalType.FINGERPRINT]: 'FINGERPRINT',
      [SignalType.LIVENESS]: 'CAMERA'
    };
    const sensorType = sTypeMap[biometricCtx.domain] || 'CAMERA';
    const attestationTier = hal.getAttestationTier(sensorType);

    return {
      id: 'f-' + Math.random().toString(36).substring(2, 7),
      header: {
        bfile_version: '2.5.1-NIST',
        bfile_uuid: crypto.randomUUID(),
        creation_timestamp: new Date().toISOString(),
        creator_role: creatorRole,
        enrollment_mode: 'first_enroll',
        crypto_suite: 'AES-GCM-256-SHA512',
        key_derivation: 'biometric-bound',
        storage_provider: storageProvider
      },
      biometricMetadata: {
        biometric_domain: biometricCtx.domain as any,
        ingress_path: biometricCtx.path,
        capture_mode: biometricCtx.mode,
        ...biometricCtx.pathSpecific
      },
      security_binding: {
        biometric_binding_hash: bindingHash,
        feature_vector_hash: biometricCtx.featureVectorHash,
        anti_spoof_threshold_used: biometricCtx.antiSpoof,
        verification_policy_id: 'POLICY-AEGIS-STRATOS-v2',
        enclave_attested: true,
        // Fix: Added missing required attestation_tier
        attestation_tier: attestationTier
      },
      metadata: {
        originalFilename: filename,
        mimeType: 'application/octet-stream',
        fileSize: size,
        lockPolicy: policy,
        accessRules: rules,
        audit_hash: auditHash
      },
      isLocked: true
    };
  }

  async verifyPolicy(file: SecureFile, report: AnalysisReport): Promise<{ success: boolean; reason?: string }> {
    const policy = file.metadata.lockPolicy;
    
    // 1. Assurance Checks
    if (report.overallConfidence < policy.minConfidence) {
      return { success: false, reason: 'ASSURANCE_THRESHOLD_UNREACHED' };
    }

    // 2. Cryptographic Binding Integrity (Feature Vector Match)
    if (file.security_binding.feature_vector_hash !== report.featureVectorHash) {
       return { success: false, reason: 'BIOMETRIC_BINDING_VIOLATION' };
    }

    // 3. Multi-modal Fusion Policy logic
    const satisfiedTypes = report.signals.filter(s => s.confidence >= (policy.minConfidence || 0.90)).map(s => s.type);
    
    if (policy.fusion === 'AND') {
      const ok = policy.biometricsRequired.every(req => satisfiedTypes.includes(req));
      if (!ok) return { success: false, reason: 'MULTI_MODAL_AND_POLICY_FAILURE' };
    } else {
      const ok = policy.biometricsRequired.some(req => satisfiedTypes.includes(req));
      if (!ok) return { success: false, reason: 'MULTI_MODAL_OR_POLICY_FAILURE' };
    }

    return { success: true };
  }
}

export const enclave = new EnclaveService();
