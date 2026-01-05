
import React, { useState, useRef } from 'react';
import { SignalType, LockPolicy, AccessRules, SecureFile, AnalysisReport, BiometricSignal } from '../types';
import { enclave } from '../services/enclave';
import { ICONS } from '../constants';

interface BFileArchitectProps {
  onSealed: (file: SecureFile) => void;
  activeBiometric: AnalysisReport | null;
  onBiometricRequest: () => void;
}

type ArchitectStage = 'ASSET_SELECTION' | 'BINDING_CONFIGURATION' | 'ENCAPSULATION';

const BFileArchitect: React.FC<BFileArchitectProps> = ({ onSealed, activeBiometric, onBiometricRequest }) => {
  const [stage, setStage] = useState<ArchitectStage>('ASSET_SELECTION');
  const [filename, setFilename] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isSealing, setIsSealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [storageProvider, setStorageProvider] = useState<'LOCAL_ENCLAVE' | 'EXTERNAL_HSM' | 'CLOUD_VAULT'>('LOCAL_ENCLAVE');
  const [fusionPolicy, setFusionPolicy] = useState<'AND' | 'OR'>('AND');
  const [assuranceThreshold, setAssuranceThreshold] = useState(0.95);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAssetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilename(file.name);
      setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
      setStage('BINDING_CONFIGURATION');
      setError(null);
    }
  };

  const handleSeal = async () => {
    if (!activeBiometric || !activeBiometric.featureVectorHash) {
      setError("PREREQUISITE_FAILURE: Biometric acquisition contract not fulfilled.");
      return;
    }
    
    setIsSealing(true);
    setStage('ENCAPSULATION');

    setTimeout(async () => {
      const lockPolicy: LockPolicy = {
        biometricsRequired: activeBiometric.signals.map(s => s.type),
        fusion: fusionPolicy,
        minConfidence: assuranceThreshold,
        maxAttempts: 3,
        lockoutPolicy: 'permanent'
      };

      const accessRules: AccessRules = {
        autoRelock: true,
        relockAfterSeconds: 30,
        continuousPresence: false
      };

      const biometricCtx = {
        domain: activeBiometric.signals[0].type, // Primary domain
        path: activeBiometric.ingressPath || 'ARTIFACT_PATH',
        mode: activeBiometric.captureMode || 'FILE',
        liveness: activeBiometric.livenessScore,
        antiSpoof: 0.998,
        featureVectorHash: activeBiometric.featureVectorHash!,
        pathSpecific: activeBiometric.pathMetadata || {}
      };

      try {
        const newFile = await enclave.createBFile(filename, fileSize, lockPolicy, accessRules, 'Admin', biometricCtx, storageProvider);
        onSealed(newFile);
      } catch (err) {
        setError("ENCLAVE_FAILURE: Cryptographic binding rejected.");
        setStage('BINDING_CONFIGURATION');
      } finally {
        setIsSealing(false);
      }
    }, 2500);
  };

  return (
    <div className="h-full flex flex-col items-center justify-start p-2 sm:p-4 tactical-grid overflow-hidden">
      <div className="w-full max-w-4xl bg-[#0d1117]/95 border border-slate-800 rounded-xl shadow-2xl flex flex-col h-full overflow-hidden backdrop-blur-3xl relative">
        
        <div className="flex w-full border-b border-slate-800 bg-slate-900/60 shrink-0">
           {(['ASSET_SELECTION', 'BINDING_CONFIGURATION', 'ENCAPSULATION'] as ArchitectStage[]).map((s, i) => (
             <div key={s} className="flex-1 flex flex-col items-center py-4 relative">
                <span className={`text-[10px] mono font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${stage === s ? 'text-cyan-400' : 'text-slate-600'}`}>
                  {i+1}. {s.replace('_', ' ')}
                </span>
                <div className={`h-0.5 w-full absolute bottom-0 transition-all duration-700 ${stage === s ? 'bg-cyan-500 shadow-[0_0_12px_cyan]' : 'bg-transparent'}`}></div>
             </div>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col">
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-[10px] mono font-bold uppercase animate-pulse flex items-center gap-3">
              <ICONS.Alert />
              <p className="tracking-[0.2em]">{error}</p>
            </div>
          )}

          {stage === 'ASSET_SELECTION' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
               <div className="w-24 h-24 bg-cyan-500/5 border border-dashed border-cyan-500/20 rounded-[2rem] flex items-center justify-center text-cyan-500/20 shadow-inner">
                 <ICONS.Lock />
               </div>
               <div className="text-center max-w-md space-y-3">
                  <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight leading-none">OBJECT_ARCHITECT</h3>
                  <p className="text-[11px] text-slate-500 mono uppercase tracking-widest font-bold">Select target asset for biometric encapsulation</p>
               </div>
               <button onClick={() => fileInputRef.current?.click()} className="px-14 py-4 bg-cyan-500 text-slate-950 rounded-2xl font-bold uppercase text-[12px] tracking-[0.3em] hover:bg-cyan-400 shadow-2xl glow-cyan active:scale-95 transition-all">
                 CHOOSE_ASSET
               </button>
               <input type="file" ref={fileInputRef} className="hidden" onChange={handleAssetSelect} />
            </div>
          )}

          {stage === 'BINDING_CONFIGURATION' && (
            <div className="space-y-10 animate-in slide-in-from-right-2 duration-500 pb-10">
               <header className="flex justify-between items-end border-b border-slate-800 pb-6">
                 <div>
                   <h3 className="text-2xl font-bold text-slate-100 uppercase tracking-tight leading-none">BINDING_PROTOCOL</h3>
                   <p className="text-[10px] text-slate-500 mono uppercase tracking-widest font-bold mt-2">B-File Sealed Context Binding</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] text-slate-600 uppercase mono">Target_Asset</p>
                    <p className="text-sm text-cyan-500 font-bold mono uppercase">{filename}</p>
                 </div>
               </header>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className={`p-8 rounded-[2rem] border-2 flex flex-col items-center gap-6 transition-all shadow-inner ${activeBiometric ? 'border-green-500/40 bg-green-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${activeBiometric ? 'bg-green-500/20 text-green-500 glow-green' : 'bg-slate-950 text-slate-700 border border-slate-800'}`}>
                       {activeBiometric ? <ICONS.Shield /> : <ICONS.Activity />}
                    </div>
                    <div className="text-center space-y-3 w-full">
                       <p className={`text-[12px] font-bold uppercase tracking-widest ${activeBiometric ? 'text-green-500' : 'text-slate-600'}`}>
                          {activeBiometric ? 'BIOMETRIC_REPORT_ATTACHED' : 'AWAITING_INGESTION'}
                       </p>
                       
                       {activeBiometric && (
                         <div className="flex flex-wrap justify-center gap-2 mt-2">
                           {activeBiometric.signals.map(s => (
                             <span key={s.type} className="px-3 py-1 bg-black/60 border border-slate-800 rounded-lg text-[8px] mono text-cyan-400 uppercase font-bold">
                               {s.type}
                             </span>
                           ))}
                         </div>
                       )}

                       <div className="bg-black/40 px-4 py-2 rounded-xl border border-slate-800 mt-4 overflow-hidden">
                          <p className="text-[9px] text-slate-500 mono truncate">{activeBiometric ? activeBiometric.featureVectorHash : 'VECTOR_UNINITIALIZED'}</p>
                       </div>
                    </div>
                    {!activeBiometric && (
                      <button onClick={onBiometricRequest} className="w-full py-3.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl text-[11px] font-bold uppercase hover:bg-cyan-500 hover:text-slate-950 transition-all">
                        INITIATE_FORENSIC_ACQUISITION
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 rounded-[2rem] p-8 space-y-8 shadow-inner">
                     <p className="text-[10px] mono text-slate-500 uppercase font-bold tracking-[0.3em] border-b border-slate-800 pb-4">SEALING_PARAMETERS</p>
                     
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <label className="text-[10px] mono text-slate-600 uppercase font-bold">Storage_Enclave</label>
                           <select value={storageProvider} onChange={e => setStorageProvider(e.target.value as any)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[11px] text-slate-300 mono outline-none focus:border-cyan-500 transition-colors">
                              <option value="LOCAL_ENCLAVE">SECURE_LOCAL_ENCLAVE</option>
                              <option value="EXTERNAL_HSM">HARDWARE_HSM_BRIDGE</option>
                              <option value="CLOUD_VAULT">CRYPTO_CLOUD_VAULT</option>
                           </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <label className="text-[10px] mono text-slate-600 uppercase font-bold">Fusion_Logic</label>
                              <select value={fusionPolicy} onChange={e => setFusionPolicy(e.target.value as any)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[11px] text-slate-300 mono outline-none focus:border-cyan-500">
                                 <option value="AND">STRICT (AND)</option>
                                 <option value="OR">FLEX (OR)</option>
                              </select>
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] mono text-slate-600 uppercase font-bold">Threshold</label>
                              <input type="number" step="0.01" min="0.80" max="0.99" value={assuranceThreshold} onChange={e => setAssuranceThreshold(parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[11px] text-slate-300 mono outline-none focus:border-cyan-500" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {activeBiometric && (
                 <div className="pt-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="bg-slate-900/80 p-6 border border-slate-800 rounded-3xl flex gap-6 items-center shadow-2xl">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_green]"></div>
                      <div className="flex-1">
                         <p className="text-[10px] text-slate-100 mono leading-relaxed uppercase font-bold mb-1">CONTRACT_READY</p>
                         <p className="text-[9px] text-slate-500 mono leading-relaxed uppercase">
                           Binding {activeBiometric.signals.length} signals to {filename}. Security level: <span className="text-cyan-400 font-bold">ATTESTED</span>.
                         </p>
                      </div>
                   </div>
                   <button onClick={handleSeal} className="w-full py-5 bg-cyan-500 text-slate-950 rounded-3xl font-bold uppercase text-[13px] tracking-[0.5em] hover:bg-cyan-400 shadow-2xl glow-cyan transition-all active:scale-95">
                     SEAL_B_FILE_ASSET
                   </button>
                 </div>
               )}
            </div>
          )}

          {stage === 'ENCAPSULATION' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700">
               <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
                  <div className="text-cyan-500 scale-[4] glow-cyan"><ICONS.Lock /></div>
               </div>
               <div className="text-center space-y-6">
                  <h2 className="text-3xl font-bold text-slate-100 uppercase tracking-[0.4em] animate-pulse">SEALING...</h2>
                  <div className="flex flex-col gap-3">
                    <p className="text-[11px] text-cyan-600 mono uppercase tracking-widest font-bold">COMMITTING_MULTI_DOMAIN_PAYLOAD</p>
                    <p className="text-[9px] text-slate-600 mono uppercase tracking-[0.6em]">TEE_WRITE_PROTECTION_ENABLED</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BFileArchitect;
