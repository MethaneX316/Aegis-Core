
export enum SignalType {
  FACE = 'FACE',
  VOICE = 'VOICE',
  IRIS = 'IRIS',
  FINGERPRINT = 'FINGERPRINT',
  PHYSIOLOGICAL = 'PHYSIOLOGICAL',
  BEHAVIORAL = 'BEHAVIORAL',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  LIVENESS = 'LIVENESS'
}

export enum TrustTier {
  T0_HEURISTIC = 'T0_HEURISTIC',     // Web/Simulated/Artifact analysis (Forensic)
  T1_NATIVE_OS = 'T1_NATIVE_OS',     // OS-level permission confirmed sensors
  T2_TEE_BACKED = 'T2_TEE_BACKED',   // Secure Enclave / Hardware backed
  T3_DEVICE_AUTH = 'T3_DEVICE_AUTH'  // OEM / Military Hardware Attested
}

export type UserRole = 'Admin' | 'Analyst' | 'Auditor' | 'End-User' | 'Emergency';

export type IngressPath = 'OPTICAL_PATH' | 'DACTYL_PATH' | 'VOCAL_PATH' | 'ARTIFACT_PATH';
export type CaptureMode = 'LIVE' | 'FILE' | 'SENSOR_NATIVE';

export interface ForensicTelemetry {
  file: {
    name: string;
    sizeBytes: number;
    hash: string;
    type: string;
    dimensions: { width: number; height: number };
    bitDepth: number;
  };
  processing: {
    parsingProgress: number;
    healthScore: number;
    confidenceScore: number;
    pixelsProcessed: number;
    edgesDetected: number;
    landmarksDetected: number;
    occlusionScore: number;
    frameCount: number;
    processingFPS: number;
    anomalyScore: number;
  };
  metadata: {
    EXIF_verified: boolean;
    corruptionDetected: boolean;
  };
  state: string;
  timestamp: number;
  trustTier: TrustTier;
}

export interface BiometricSignal {
  type: SignalType;
  confidence: number;
  timestamp: number;
  dataPoints: Record<string, any>;
  status: 'valid' | 'warning' | 'spoof_detected';
  heuristics?: string[];
  trackId?: string;
  attainmentTier?: TrustTier;
}

export interface LockPolicy {
  biometricsRequired: SignalType[];
  fusion: 'AND' | 'OR';
  minConfidence: number;
  minLiveness?: number;
  minGeometryStability?: number;
  maxAttempts: number;
  lockoutPolicy: 'temporary' | 'permanent';
}

export interface AccessRules {
  autoRelock: boolean;
  relockAfterSeconds: number;
  continuousPresence: boolean;
}

export interface SecureFile {
  id: string;
  header: {
    bfile_version: string;
    bfile_uuid: string;
    creation_timestamp: string;
    creator_role: UserRole;
    enrollment_mode: 'first_enroll' | 'additional' | 'verification';
    crypto_suite: string;
    key_derivation: 'biometric-bound';
    storage_provider: 'LOCAL_ENCLAVE' | 'EXTERNAL_HSM' | 'CLOUD_VAULT';
  };
  biometricMetadata: {
    biometric_domain: 'FACE' | 'IRIS' | 'FINGERPRINT' | 'VOICE' | 'MULTI_MODAL' | 'LIVENESS';
    ingress_path: IngressPath;
    capture_mode: CaptureMode;
    optical?: {
      face_landmarks_version: string;
      landmark_count: number;
      liveness_method: string;
      anti_spoof_score: number;
      environment_flags: string[];
    };
    dactyl?: {
      sensor_type: string;
      minutiae_count: number;
      quality_score: number;
      liveness_signal: string;
    };
    vocal?: {
      sample_rate: number;
      duration_ms: number;
      liveness_method: string;
      replay_risk_score: number;
      spectral_fingerprint_hash: string;
    };
    artifact?: {
      source_type: string;
      original_format: string;
      hash_sha256: string;
      chain_of_custody_id: string;
    };
  };
  security_binding: {
    biometric_binding_hash: string;
    feature_vector_hash: string;
    anti_spoof_threshold_used: number;
    verification_policy_id: string;
    enclave_attested: boolean;
    attestation_tier: TrustTier;
  };
  metadata: {
    originalFilename: string;
    mimeType: string;
    fileSize: string;
    lockPolicy: LockPolicy;
    accessRules: AccessRules;
    audit_hash: string;
  };
  isLocked: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  event: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

export interface AnalysisReport {
  id: string;
  timestamp: number;
  signals: BiometricSignal[];
  overallConfidence: number;
  livenessScore: number;
  decision: 'VERIFIED' | 'DENIED' | 'INCONCLUSIVE';
  reasoning: string;
  operatorRole?: UserRole;
  ingressPath?: IngressPath;
  captureMode?: CaptureMode;
  featureVectorHash?: string;
  pathMetadata?: any;
  trustTier: TrustTier;
  attestationToken?: string;
}

export interface SystemStatus {
  enclaveStatus: 'SECURE' | 'MAINTENANCE' | 'ALERT' | 'UNINITIALIZED';
  threatLevel: 'STABLE' | 'ELEVATED' | 'CRITICAL';
  activeSignals: number;
  cpuLoad: number;
  uptime: string;
  isEnrolled: boolean;
  networkIntegrity: 100;
  sessionRole?: UserRole;
  recoveryEnabled: boolean;
  globalTrustTier: TrustTier;
}

export interface SubjectCluster {
  subjectId: string;
  appearanceCount: number;
  avgConfidence: number;
  firstSeen: string;
  dominantSignals: string[];
  metadata: {
    estimatedAge?: string;
    emotion?: string;
  };
}

export interface ThreatEvent {
  id: string;
  timestamp: number;
  type: string;
  severity: 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';
  status: 'BLOCKED' | 'DETECTED' | 'MITIGATED';
  description: string;
}

// FIX: Added missing RecoveryKey interface referenced in App.tsx and RecoveryHub.tsx
export interface RecoveryKey {
  id: string;
  label: string;
  createdAt: string;
  keyHash: string;
  isUsed: boolean;
  type: 'Paper_Key' | 'Hardware_Token' | 'Multi_Admin';
}
