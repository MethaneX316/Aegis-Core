
import React, { useState } from 'react';
import { SecureFile, SignalType, UserRole } from '../types';
import { ICONS } from '../constants';
import { enclave } from '../services/enclave';

interface SecureVaultProps {
  onUnlockRequest: (file: SecureFile) => void;
  unlockedIds: Set<string>;
  relockTimers: Record<string, number>;
  onRegisterAsset?: (file: SecureFile) => void;
  activeFiles: SecureFile[];
  buttonClass?: string;
  userRole?: UserRole;
}

const SecureVault: React.FC<SecureVaultProps> = ({ 
  onUnlockRequest, unlockedIds, relockTimers, onRegisterAsset, activeFiles,
  buttonClass = "px-6 py-3.5 text-[11px]", userRole = 'End-User'
}) => {
  const [showRegister, setShowRegister] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [selectedFusion, setSelectedFusion] = useState<'AND' | 'OR'>('AND');

  const canAuth = userRole === 'Admin' || userRole === 'End-User';
  const canRegister = userRole === 'Admin';
  const showContentMetadata = userRole !== 'Auditor';

  const handleFileAction = (file: SecureFile) => {
    if (unlockedIds.has(file.id)) {
      // Export simulation
    } else if (canAuth) {
      onUnlockRequest(file);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilename || !onRegisterAsset) return;
    
    // Fix: cast userRole to UserRole explicitly to satisfy the compiler's strict type checking
    // for the creatorRole parameter in enclave.createBFile.
    const newFile = await enclave.createBFile(
      newFilename, 
      (Math.floor(Math.random() * 500) + 10) + " MB",
      {
        biometricsRequired: [SignalType.FACE],
        fusion: selectedFusion,
        minConfidence: 0.94,
        maxAttempts: 5,
        lockoutPolicy: 'temporary'
      },
      { autoRelock: true, relockAfterSeconds: 30, continuousPresence: false },
      userRole as UserRole,
      {
        domain: SignalType.FACE,
        path: 'OPTICAL_PATH',
        mode: 'LIVE',
        liveness: 0.99,
        antiSpoof: 0.99,
        featureVectorHash: 'MOCK_REG_VECTOR_' + Math.random().toString(16).slice(2)
      }
    );
    
    onRegisterAsset(newFile);
    setShowRegister(false);
    setNewFilename('');
  };

  return (
    <div className="p-4 md:p-10 h-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar tactical-grid">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center glow-cyan shrink-0">
             <ICONS.Shield />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tighter">OBJECT_VAULT</h3>
            <p className="text-[10px] text-slate-500 mono uppercase tracking-[0.4em] font-bold">ROLE: {userRole}</p>
          </div>
        </div>
        {canRegister && (
          <button onClick={() => setShowRegister(true)} className={`${buttonClass} bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 uppercase tracking-widest`}>
            [ SEAL_OBJECT ]
          </button>
        )}
      </div>

      {showRegister && (
        <div className="mb-8 p-8 bg-slate-900 border border-cyan-500/20 rounded-3xl animate-in zoom-in-95">
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] mono text-slate-500 uppercase font-bold tracking-[0.3em]">Filename</label>
                   <input type="text" value={newFilename} onChange={e => setNewFilename(e.target.value)} placeholder="PROJECT_AEGIS.bfile" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none mono" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] mono text-slate-500 uppercase font-bold tracking-[0.3em]">Fusion</label>
                   <select value={selectedFusion} onChange={e => setSelectedFusion(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none mono">
                      <option value="AND">STRICT (AND)</option>
                      <option value="OR">FLEX (OR)</option>
                   </select>
                </div>
             </div>
             <div className="flex justify-end gap-6 pt-4">
                <button type="button" onClick={() => setShowRegister(false)} className="text-[10px] mono text-slate-600 uppercase font-bold tracking-widest">CANCEL</button>
                <button type="submit" className="bg-cyan-500 px-10 py-3 rounded-xl text-slate-950 font-bold uppercase text-[10px] tracking-widest">SEAL_OBJECT</button>
             </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeFiles.map(file => {
          const isUnlocked = unlockedIds.has(file.id);
          const timeLeft = relockTimers[file.id];
          
          return (
            <div key={file.id} className={`bg-slate-900/60 border-2 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${isUnlocked ? 'border-green-500/40' : 'border-slate-800'}`}>
              <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${isUnlocked ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-slate-950 text-slate-700 border-slate-800'}`}>
                  {isUnlocked ? <ICONS.Shield /> : <ICONS.Lock />}
                </div>
                <div className="min-w-0">
                  <p className={`text-base font-bold truncate uppercase ${isUnlocked ? 'text-slate-100' : 'text-slate-500'}`}>
                    {showContentMetadata ? file.metadata.originalFilename : `BFILE_HIDDEN_${file.id.substring(0,4)}`}
                  </p>
                  {showContentMetadata && (
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] mono text-slate-600 uppercase font-bold">{file.metadata.fileSize}</span>
                      {isUnlocked && timeLeft && <span className="text-[9px] mono text-orange-400 font-bold uppercase animate-pulse">{timeLeft}s RELOCK</span>}
                    </div>
                  )}
                </div>
              </div>

              {canAuth && (
                <button onClick={() => handleFileAction(file)} className={`rounded-xl px-6 py-3 font-bold uppercase text-[10px] transition-all shadow-xl active:scale-95 border-2 ${isUnlocked ? 'bg-slate-800 text-cyan-400 border-cyan-400/30' : 'bg-cyan-500 text-slate-950 border-cyan-400/40'}`}>
                  {isUnlocked ? 'EXPORT' : 'AUTHENTICATE'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default SecureVault;
