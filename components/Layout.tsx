
import React, { useState } from 'react';
import { SystemStatus, UserRole } from '../types';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  systemStatus: SystemStatus;
  isVoiceActive: boolean;
  theme: string;
  role?: UserRole;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, systemStatus, isVoiceActive, theme, role }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const allTabs = [
    { id: 'dashboard', label: 'C2_DASH', icon: <ICONS.Activity />, roles: ['Admin', 'Analyst', 'End-User'] },
    { id: 'analytics', label: 'SIGNALS', icon: <ICONS.Cpu />, roles: ['Admin', 'Analyst', 'End-User'] },
    { id: 'architect', label: 'ARCHITECT', icon: <ICONS.Lock />, roles: ['Admin'] },
    { id: 'vault', label: 'VAULT', icon: <ICONS.Shield />, roles: ['Admin', 'End-User'] },
    { id: 'recovery', label: 'RECOVERY', icon: <ICONS.Shield />, roles: ['Admin'] },
    { id: 'clustering', label: 'CLUSTER', icon: <ICONS.Users />, roles: ['Admin', 'Analyst'] },
    { id: 'logs', label: 'AUDIT', icon: <ICONS.Activity />, roles: ['Admin', 'Auditor'] },
  ];

  const visibleTabs = allTabs.filter(tab => !role || tab.roles.includes(role));

  return (
    <div className={`flex h-screen overflow-hidden font-sans relative ${theme} bg-black`}>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 border-r border-slate-800/80 flex flex-col bg-[#05070a]/95 backdrop-blur-2xl transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) z-[70] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 flex items-center justify-between border-b border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ICONS.Shield />
            </div>
            <h1 className="font-bold tracking-tighter text-md text-slate-100 uppercase">AEGIS_CORE</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-800/40 rounded-lg text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 mt-4 space-y-1 px-3 overflow-y-auto custom-scrollbar">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative ${
                activeTab === tab.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'hover:bg-slate-800/40 text-slate-500'
              }`}
            >
              <div className="shrink-0">{tab.icon}</div>
              <span className="font-bold tracking-[0.1em] text-[10px] uppercase truncate">{tab.label}</span>
              {activeTab === tab.id && <div className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-500 rounded-r-full" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/40">
          <button onClick={() => { onTabChange('settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'hover:bg-slate-800/40 text-slate-500'}`}>
            <ICONS.Menu />
            <span className="font-bold tracking-[0.1em] text-[10px] uppercase">SETTINGS</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-14 border-b border-slate-800/80 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-md z-50">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800/60 rounded-lg text-slate-400 border border-slate-800/80">
            <ICONS.Menu />
          </button>
          <div className="text-center">
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mono leading-none">AEGIS_CORE</p>
            <p className="text-[10px] text-cyan-500 font-bold uppercase mt-1 tracking-tighter">{activeTab}</p>
          </div>
          <div className="w-10" />
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
