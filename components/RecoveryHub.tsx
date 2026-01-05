
import React, { useState } from 'react';
import { RecoveryKey, UserRole } from '../types';
import { ICONS } from '../constants';

interface RecoveryHubProps {
  keys: RecoveryKey[];
  onGenerate: (key: RecoveryKey) => void;
  role?: UserRole;
}

const RecoveryHub: React.FC<RecoveryHubProps> = ({ keys, onGenerate, role }) => {
  const [showKeyGenerator, setShowKeyGenerator] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyType, setKeyType] = useState<'Paper_Key' | 'Hardware_Token' | 'Multi_Admin'>('Paper_Key');

  const isAdmin = role === 'Admin';

  const handleGenerate = () => {
    if (!keyLabel) return;
    const newKey: RecoveryKey = {
      id: `RCV-${Math.random().toString(36).substring(7).toUpperCase()}`,
      label: keyLabel,
      createdAt: new Date().toISOString(),
      keyHash: btoa(Math.random().toString()),
      isUsed: false,
      type: keyType
    };
    onGenerate(newKey);
    setShowKeyGenerator(false);
    setKeyLabel('');
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-10 text-center">
        <div className="max-w-md space-y-6">
           <div className="p-10 bg-red-500/5 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 opacity-30">
              <ICONS.Lock />
           </div>
           <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tighter">ACCESS_RESTRICTED</h3>
           <p className="text-[10px] text-slate-500 mono uppercase tracking-[0.4em]">ADMIN_AUTHORITY_REQUIRED_FOR_RECOVERY_HUB</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 h-full flex flex-col space-y-10 overflow-y-auto custom-scrollbar tactical-grid">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
        <div>
           <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-tighter mb-2">Recovery_Architecture</h2>
           <p className="text-[10px] text-slate-500 mono uppercase tracking-[0.4em] font-bold">Admin Authority: Active</p>
        </div>
        <button onClick={() => setShowKeyGenerator(true)} className="px-8 py-4 bg-cyan-500 text-slate-950 rounded-2xl font-bold uppercase text-[10px] tracking-[0.4em] hover:bg-cyan-400 shadow-2xl glow-cyan">
           GENERATE_RECOVERY_VECTOR
        </button>
      </header>

      {showKeyGenerator && (
        <div className="p-8 bg-slate-900 border border-cyan-500/20 rounded-[2rem] animate-in zoom-in-95 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                 <label className="text-[10px] mono text-slate-500 uppercase font-bold tracking-widest">Vector_Label</label>
                 <input type="text" value={keyLabel} onChange={e => setKeyLabel(e.target.value)} placeholder="e.g. OFFSITE_VAULT_KEY" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-sm text-slate-200 outline-none mono" />
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] mono text-slate-500 uppercase font-bold tracking-widest">Vector_Type</label>
                 <select value={keyType} onChange={e => setKeyType(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-sm text-slate-200 outline-none mono">
                    <option value="Paper_Key">PAPER_OFFLINE</option>
                    <option value="Hardware_Token">HARDWARE_TEE_TOKEN</option>
                    <option value="Multi_Admin">MULTI_ADMIN_M_OF_N</option>
                 </select>
              </div>
           </div>
           <div className="flex justify-end gap-6 pt-4">
              <button onClick={() => setShowKeyGenerator(false)} className="text-[10px] mono text-slate-600 uppercase font-bold tracking-widest">CANCEL</button>
              <button onClick={handleGenerate} className="bg-cyan-500 px-10 py-3 rounded-xl text-slate-950 font-bold uppercase text-[10px] tracking-widest">INITIALIZE</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {keys.map(key => (
          <div key={key.id} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6 group hover:border-cyan-500/40 transition-all">
             <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-cyan-500 border border-slate-800">
                   <ICONS.Shield />
                </div>
                <span className="text-[8px] mono text-cyan-600 font-bold uppercase border border-cyan-500/20 px-2 py-0.5 rounded-lg">{key.type}</span>
             </div>
             <div>
                <p className="text-sm font-bold text-slate-100 uppercase tracking-widest">{key.label}</p>
                <p className="text-[8px] text-slate-500 mono uppercase mt-1">ID: {key.id} | CREATED: {new Date(key.createdAt).toLocaleDateString()}</p>
             </div>
             <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="flex gap-1">
                   {[...Array(8)].map((_, i) => <div key={i} className="w-1 h-1 bg-cyan-500 rounded-full"></div>)}
                </div>
                <button className="text-[9px] font-bold text-cyan-500 uppercase hover:text-cyan-400">VIEW_SECRET</button>
             </div>
          </div>
        ))}
        {keys.length === 0 && (
          <div className="col-span-full py-20 bg-slate-950/40 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center opacity-40">
             <p className="text-[10px] text-slate-600 mono uppercase tracking-[0.4em] font-bold">No recovery vectors provisioned.</p>
             <p className="text-[8px] text-slate-700 uppercase mt-2">Generate a vector for offline hardware recovery.</p>
          </div>
        )}
      </div>

      <div className="mt-auto p-8 bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-10">
         <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-100 uppercase tracking-[0.4em]">Lost_Device_Policy</h4>
            <p className="text-[8px] text-slate-500 mono leading-relaxed uppercase max-w-xl">
              Recovery keys allow for system re-initialization if primary hardware entropy is lost. 
              Paper keys should be stored in high-assurance physical vaults.
            </p>
         </div>
         <button className="px-10 py-4 bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-700">CONFIGURE_THRESHOLD</button>
      </div>
    </div>
  );
};

export default RecoveryHub;
