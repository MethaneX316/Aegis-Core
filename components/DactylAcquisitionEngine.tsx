
import React from 'react';
import FingerprintScanner from './FingerprintScanner';

interface DactylProps {
  onSuccess: () => void;
  onAbort: () => void;
}

const DactylAcquisitionEngine: React.FC<DactylProps> = ({ onSuccess, onAbort }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none tactical-grid" />
      
      <div className="w-full max-w-md z-10 animate-in fade-in duration-1000">
        <header className="text-center mb-10 space-y-3">
           <div className="inline-flex items-center gap-3 px-3 py-1 bg-red-500/5 border border-red-500/20 rounded-lg mb-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[8px] mono font-bold text-red-500 uppercase tracking-widest">SEC_MODE: HARDWARE_BONDED</span>
           </div>
           <h3 className="text-xl font-bold text-slate-100 uppercase tracking-[0.2em] leading-none">DACTYL_DOMAIN_INGRESS</h3>
           <p className="text-[9px] text-slate-600 mono uppercase tracking-[0.3em]">Governance Module: NIST_FIPS_201_CERTIFIED</p>
        </header>

        <FingerprintScanner 
          onSuccess={onSuccess}
          onAbort={onAbort}
        />
      </div>

      {/* Forensic Metadata Footnote */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-1 opacity-20">
        <p className="text-[7px] mono text-slate-500 uppercase">Context: BROWSER_ISOLATED</p>
        <p className="text-[7px] mono text-slate-500 uppercase">Bridge: DISCONNECTED</p>
        <p className="text-[7px] mono text-slate-500 uppercase">Success_Permit: DENIED</p>
      </div>
    </div>
  );
};

export default DactylAcquisitionEngine;
