import React, { useState } from 'react';
import { ThemeType, VizSettings } from '../App';
import { UserRole } from '../types';
import { ICONS } from '../constants';

interface SettingsHubProps {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  fontSize: number;
  setFontSize: (s: number) => void;
  buttonScale: number;
  setButtonScale: (s: number) => void;
  uiContrast: number;
  setUiContrast: (c: number) => void;
  panelDensity: number;
  setPanelDensity: (d: number) => void;
  role: UserRole;
  setRole: (r: UserRole) => void;
  highStressMode: boolean;
  setHighStressMode: (b: boolean) => void;
  vizSettings: VizSettings;
  setVizSettings: (v: VizSettings) => void;
  onClose: () => void;
}

type SettingDomain = 'Appearance' | 'Security' | 'Calibration';

const SettingsHub: React.FC<SettingsHubProps> = ({ 
  theme, setTheme, fontSize, setFontSize, 
  buttonScale, setButtonScale, uiContrast, setUiContrast,
  panelDensity, setPanelDensity,
  role, setRole, highStressMode, setHighStressMode,
  vizSettings, setVizSettings,
  onClose
}) => {
  const [activeDomain, setActiveDomain] = useState<SettingDomain>('Appearance');

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col lg:flex-row bg-slate-950/98 backdrop-blur-3xl animate-in fade-in duration-300 pointer-events-auto overflow-hidden">
      {/* Navigation Rail */}
      <nav className="w-full lg:w-56 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 overflow-y-auto custom-scrollbar relative">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 backdrop-blur-md">
           <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mono">AEGIS_C2_CONFIG</h3>
           <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-xl text-slate-500 hover:text-red-500 transition-all">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="flex-1 p-4 space-y-3">
          {(['Appearance', 'Calibration', 'Security'] as SettingDomain[]).map((domain) => (
            <button
              key={domain}
              onClick={() => setActiveDomain(domain)}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl transition-all border ${
                activeDomain === domain ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-lg' : 'text-slate-600 border-transparent hover:bg-slate-800/20'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest truncate">{domain}</span>
              {activeDomain === domain && <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_cyan]" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Workspace Area */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-4xl mx-auto space-y-12">
           {activeDomain === 'Appearance' && (
             <div className="space-y-10 animate-in slide-in-from-right-2 duration-500">
                <header>
                  <h4 className="text-[14px] mono font-bold text-cyan-500 uppercase tracking-[0.3em] mb-2">DOMAIN: INTERFACE_TACTICS</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Global scaling and pallet calibration protocols.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-5">
                    <p className="text-[10px] mono text-slate-600 uppercase font-bold tracking-widest border-b border-slate-800 pb-2.5">Theme_Matrix</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'aegis-dark', label: 'AEGIS_DARK', color: 'bg-cyan-500' },
                        { id: 'stealth-onyx', label: 'ONYX_STEALTH', color: 'bg-slate-700' },
                        { id: 'thermal', label: 'THERMAL_SCAN', color: 'bg-red-500' },
                        { id: 'high-contrast', label: 'MONO_ULTRA', color: 'bg-white' }
                      ].map(t => (
                        <button 
                          key={t.id} 
                          onClick={() => setTheme(t.id as ThemeType)} 
                          className={`flex flex-col gap-3 p-4 rounded-xl border-2 transition-all text-left ${theme === t.id ? 'bg-cyan-500/10 border-cyan-500 shadow-xl' : 'bg-slate-900/60 border-slate-800'}`}
                        >
                           <div className={`w-8 h-1 rounded-full ${t.color}`} />
                           <span className={`text-[10px] font-bold uppercase tracking-tighter ${theme === t.id ? 'text-cyan-400' : 'text-slate-600'}`}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-8 shadow-inner">
                     <p className="text-[10px] mono text-slate-600 uppercase font-bold tracking-widest border-b border-slate-800 pb-2.5">UI_Scaling_Factors</p>
                     
                     <div className="space-y-4">
                        <div className="flex justify-between text-[10px] mono font-bold uppercase">
                           <span className="text-slate-500">Master Button Scale</span>
                           <span className="text-cyan-400">{buttonScale.toFixed(2)}x</span>
                        </div>
                        <input type="range" min="0.70" max="1.4" step="0.05" value={buttonScale} onChange={(e) => setButtonScale(parseFloat(e.target.value))} className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" />
                        <p className="text-[8px] text-slate-700 mono uppercase tracking-widest">Adjusts input touch-targets & controls</p>
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between text-[10px] mono font-bold uppercase">
                           <span className="text-slate-500">Text Density (Base)</span>
                           <span className="text-cyan-400">{fontSize}px</span>
                        </div>
                        <input type="range" min="11" max="18" step="1" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" />
                        <p className="text-[8px] text-slate-700 mono uppercase tracking-widest">Calibrates system-wide typography scale</p>
                     </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-800">
                   <button 
                     onClick={() => setHighStressMode(!highStressMode)}
                     className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-[0.4em] text-[11px] transition-all border-2 ${highStressMode ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                   >
                     {highStressMode ? 'STRESS_MODE: ACTIVE_ALERT' : 'INITIATE_STRESS_TOLERANCE_MODE'}
                   </button>
                </div>
             </div>
           )}

           {activeDomain === 'Calibration' && (
             <div className="space-y-10 animate-in slide-in-from-right-2 duration-500">
                <header>
                  <h4 className="text-[14px] mono font-bold text-cyan-500 uppercase tracking-widest mb-2">DOMAIN: HARDWARE_CALIBRATION</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sensor sensitivity and visual fidelity settings.</p>
                </header>

                <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 space-y-10 shadow-2xl">
                    <div className="space-y-5">
                      <div className="flex justify-between text-[10px] mono font-bold uppercase">
                        <span className="text-slate-500">Engine Contrast Boost</span>
                        <span className="text-cyan-400">{uiContrast}%</span>
                      </div>
                      <input type="range" min="70" max="150" step="5" value={uiContrast} onChange={(e) => setUiContrast(parseInt(e.target.value))} className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" />
                    </div>

                    <div className="space-y-5">
                      <div className="flex justify-between text-[10px] mono font-bold uppercase">
                        <span className="text-slate-500">Panel Margin Density</span>
                        <span className="text-cyan-400">{panelDensity.toFixed(2)}rem</span>
                      </div>
                      <input type="range" min="0.4" max="2.0" step="0.1" value={panelDensity} onChange={(e) => setPanelDensity(parseFloat(e.target.value))} className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" />
                    </div>
                </div>
             </div>
           )}

           {activeDomain === 'Security' && (
             <div className="space-y-10 animate-in slide-in-from-right-2 duration-500">
                <header>
                  <h4 className="text-[14px] mono font-bold text-cyan-500 uppercase tracking-widest mb-2">DOMAIN: AUTHORITY_REGISTRY</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Role-based access control and session permissions.</p>
                </header>
                <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-xl">
                  {['Admin', 'Analyst', 'Auditor', 'End-User'].map((r) => (
                    <button 
                      key={r} 
                      onClick={() => setRole(r as UserRole)}
                      className={`flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all ${role === r ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-600'}`}
                    >
                       <span className="text-[12px] font-bold uppercase tracking-widest">{r}</span>
                       {role === r && <ICONS.Shield />}
                    </button>
                  ))}
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default SettingsHub;