
import React, { useState, useEffect, useCallback } from 'react';
import { biometricBridge, FingerprintStatus, FingerprintEvent } from '../services/biometricBridge';
import FingerprintSVG from './FingerprintSVG';
import { ICONS } from '../constants';

interface FingerprintScannerProps {
  onSuccess: () => void;
  onAbort: () => void;
}

const FingerprintScanner: React.FC<FingerprintScannerProps> = ({ onSuccess, onAbort }) => {
  const [status, setStatus] = useState<FingerprintStatus>('IDLE');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Hard-lock the fingerprint scanner in the web context
  useEffect(() => {
    setStatus('HARDWARE_UNSUPPORTED');
    setError('HARDWARE_AUTHORITY_REQUIRED');
  }, []);

  const startScan = useCallback(async () => {
    // In web, we refuse to even attempt the scan to maintain system honesty
    setError('HARDWARE_AUTHORITY_REQUIRED: WEB_CONTEXT_BLOCKED');
    setStatus('HARDWARE_UNSUPPORTED');
  }, []);

  const handleWebAuthnFallback = async () => {
    // WebAuthn is only for authentication, not raw biometric acquisition
    setError('INSUFFICIENT_ATTESTATION: RAW_DACTYL_SILICON_REQUIRED');
    setStatus('HARDWARE_UNSUPPORTED');
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-4">
      <div className={`relative w-64 h-80 bg-slate-950/60 rounded-[3rem] border-2 transition-all duration-700 overflow-hidden shadow-2xl ${
        status === 'SUCCESS' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.15)]' : 
        status === 'HARDWARE_UNSUPPORTED' ? 'border-red-900/60' :
        status === 'ACQUIRING' ? 'border-cyan-400' : 'border-slate-800'
      }`}>
        
        {/* Forensic Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none tactical-grid" />

        <FingerprintSVG progress={progress} status={status} isLocked={false} />

        {/* Advanced Native Hardware Lockout Overlay */}
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xl z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
           <div className="text-red-500 scale-150 mb-6 animate-pulse">
              <ICONS.Lock />
           </div>
           <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mono">HARDWARE_AUTHORITY_REQUIRED</p>
           <p className="text-[8px] text-red-800 mono mt-3 uppercase leading-relaxed font-bold">
             Biometric Handshake Failed.<br/>
             SANDBOX_ESCAPE_PROHIBITED.<br/>
             Native TEE / Secure Enclave bridge must be established via authorized hardware only.
           </p>
           <div className="mt-8 pt-4 border-t border-red-900/40 w-full">
             <p className="text-[6px] text-red-900 mono uppercase font-bold tracking-widest">HAL_DOMAIN_LOCKED: DACTYL_INGRESS</p>
           </div>
        </div>

        <div className="absolute bottom-6 inset-x-0 flex flex-col items-center z-20">
          <div className="px-4 py-2 rounded-full border border-red-900/40 bg-red-950/20 shadow-xl flex items-center gap-3">
             <span className="text-[12px] mono font-bold text-red-700">0%</span>
             <div className="w-px h-3 bg-red-900/40"></div>
             <span className="text-[7px] mono font-bold text-red-900 uppercase tracking-widest">LOCKED</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4 px-4 text-center">
        <button 
          onClick={onAbort}
          className="w-full py-4 bg-slate-900 border border-slate-800 text-slate-500 rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:text-white transition-all"
        >
          Exit_Secure_Domain
        </button>

        <div className="space-y-2 mt-2">
           <p className="text-[9px] mono font-bold text-slate-600 uppercase tracking-widest">Trust Tier: T2_TEE_REQUIRED</p>
           <p className="text-[7px] mono text-slate-800 uppercase leading-relaxed font-bold">
             AEGIS Advanced Native Protocol forbids cosmetic fingerprint simulation. 
             Use Optical or Vocal domains for non-TEE environments.
           </p>
        </div>
      </div>
    </div>
  );
};

export default FingerprintScanner;
