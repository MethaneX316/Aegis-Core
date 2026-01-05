import React, { useState, useEffect } from 'react';
import { AnalysisReport, SystemStatus, AuditLog, SecureFile, UserRole, RecoveryKey } from './types';
import { ICONS } from './constants';
import Layout from './components/Layout';
import AnalyticalEngine from './components/AnalyticalEngine';
import LiveCommandCenter from './components/LiveCommandCenter';
import SecureVault from './components/SecureVault';
import SignalMonitor from './components/SignalMonitor';
import SettingsHub from './components/SettingsHub';
import BFileArchitect from './components/BFileArchitect';
import RecoveryHub from './components/RecoveryHub';
import { enclave } from './services/enclave';

export type ThemeType = 'aegis-dark' | 'high-contrast' | 'stealth-onyx' | 'thermal';

export interface VizSettings {
  landmarkDensity: 68 | 128 | 468;
  showMesh: boolean;
  meshType: 'Tri' | 'Quad' | 'Adaptive';
  depthMode: 'Heatmap' | 'Contour' | 'Off';
  vizOpacity: number;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sessionRole, setSessionRole] = useState<UserRole | undefined>();
  const [theme, setTheme] = useState<ThemeType>('aegis-dark');
  const [fontSize, setFontSize] = useState<number>(13);
  const [buttonScale, setButtonScale] = useState<number>(0.95);
  const [panelDensity, setPanelDensity] = useState<number>(1.0);
  const [uiContrast, setUiContrast] = useState<number>(100);
  const [highStressMode, setHighStressMode] = useState(false);
  const [recoveryKeys, setRecoveryKeys] = useState<RecoveryKey[]>([]);
  const [activeBiometricReport, setActiveBiometricReport] = useState<AnalysisReport | null>(null);

  const [vizSettings, setVizSettings] = useState<VizSettings>({
    landmarkDensity: 128,
    showMesh: true,
    meshType: 'Adaptive',
    depthMode: 'Heatmap',
    vizOpacity: 0.6
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    enclaveStatus: 'UNINITIALIZED',
    threatLevel: 'STABLE',
    activeSignals: 0,
    cpuLoad: 12,
    uptime: '00:00:00',
    isEnrolled: false,
    networkIntegrity: 100,
    recoveryEnabled: false
  });
  
  const [lastReport, setLastReport] = useState<AnalysisReport | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pendingChallenge, setPendingChallenge] = useState<SecureFile | null>(null);
  const [unlockedFileIds, setUnlockedFileIds] = useState<Set<string>>(new Set());
  const [vaultFiles, setVaultFiles] = useState<SecureFile[]>([]);
  const [relockTimers, setRelockTimers] = useState<Record<string, number>>({});

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--base-font', `${fontSize}px`);
    root.style.setProperty('--ui-scale', `${buttonScale}`);
    root.style.setProperty('--ui-contrast', `${uiContrast}%`);
    root.style.setProperty('--density-gap', `${panelDensity}rem`);
    document.body.className = `scanline-container ${theme} ${highStressMode ? 'high-stress' : ''}`;
  }, [fontSize, buttonScale, uiContrast, panelDensity, theme, highStressMode]);

  useEffect(() => {
    if (!systemStatus.isEnrolled) {
      setActiveTab('analytics');
      addLog('SYSTEM_BOOT: Awaiting Admin Enrollment. Presentation of primary biometric required.', 'WARN');
    }
    
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        cpuLoad: Math.floor(Math.random() * 20) + 5,
        activeSignals: prev.isEnrolled ? 2 : 0
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [systemStatus.isEnrolled]);

  const handleAnalysisComplete = async (report: AnalysisReport) => {
    setLastReport(report);
    setActiveBiometricReport(report);
    
    if (report.decision === 'VERIFIED') {
      if (!systemStatus.isEnrolled) {
        setSessionRole('Admin');
        setSystemStatus(prev => ({ 
          ...prev, 
          isEnrolled: true, 
          sessionRole: 'Admin', 
          enclaveStatus: 'SECURE' 
        }));
        addLog('ADMIN BOOTSTRAP SUCCESSFUL: Hardware Authority established.', 'INFO');
        setActiveTab('dashboard');
      }

      if (pendingChallenge) {
        const result = await enclave.verifyPolicy(pendingChallenge, report);
        if (result.success) {
          setUnlockedFileIds(prev => new Set(prev).add(pendingChallenge.id));
          addLog(`SECURE ACCESS GRANTED: ${pendingChallenge.metadata.originalFilename}`, 'INFO');
          setPendingChallenge(null);
          setActiveTab('vault');
        } else {
          addLog(`POLICY DENIAL: ${result.reason}`, 'CRITICAL');
        }
      }
    } else {
      addLog(`ACCESS DENIED: ${report.reasoning}`, 'CRITICAL');
    }
  };

  const addLog = (event: string, severity: 'INFO' | 'WARN' | 'CRITICAL' = 'INFO') => {
    setLogs(prev => [{ id: `L-${Date.now()}`, timestamp: Date.now(), event, severity }, ...prev].slice(0, 30));
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      systemStatus={systemStatus}
      isVoiceActive={isVoiceActive}
      theme={theme}
      role={sessionRole}
    >
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeTab === 'settings' && (
          <SettingsHub 
            theme={theme} setTheme={setTheme}
            fontSize={fontSize} setFontSize={setFontSize}
            buttonScale={buttonScale} setButtonScale={setButtonScale}
            uiContrast={uiContrast} setUiContrast={setUiContrast}
            panelDensity={panelDensity} setPanelDensity={setPanelDensity}
            role={sessionRole || 'End-User'} setRole={(r) => setSessionRole(r as UserRole)}
            highStressMode={highStressMode} setHighStressMode={setHighStressMode}
            vizSettings={vizSettings} setVizSettings={setVizSettings}
            onClose={() => setActiveTab('dashboard')}
          />
        )}

        <div className={`flex-1 overflow-hidden p-2 sm:p-4 tactical-grid transition-opacity duration-300 ${activeTab === 'settings' ? 'opacity-0' : 'opacity-100'}`}>
           <div className={`flex-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-3xl flex flex-col h-full shadow-2xl relative ${highStressMode ? 'border-red-500/50' : ''}`}>
              <header className="px-4 py-2 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                    <ICONS.Cpu />
                    <span className="text-[10px] font-bold tracking-[0.4em] text-cyan-400 uppercase hidden xs:inline">{activeTab}</span>
                 </div>
                 <div className="flex gap-4 items-center">
                    {!systemStatus.isEnrolled && (
                      <div className="flex gap-2 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-[9px] mono font-bold text-red-500 animate-pulse">
                         [ ! ] BOOTSTRAP_REQUIRED
                      </div>
                    )}
                    {sessionRole && (
                      <div className="flex gap-2 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[9px] mono font-bold text-cyan-400">
                         <span className="opacity-50 tracking-tighter">ROLE:</span>
                         <span className="uppercase">{sessionRole}</span>
                      </div>
                    )}
                    <LiveCommandCenter 
                      isActive={isVoiceActive} 
                      onToggle={() => setIsVoiceActive(!isVoiceActive)} 
                      onCommand={(c) => addLog(`COMMS_IN: ${c}`)} 
                    />
                 </div>
              </header>
              
              <div className="flex-1 overflow-hidden relative flex flex-col min-h-0" style={{ gap: 'var(--density-gap)' }}>
                 {activeTab === 'dashboard' && (
                   <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full">
                     <SignalMonitor lastReport={lastReport} isEnrolled={systemStatus.isEnrolled} />
                   </div>
                 )}
                 {activeTab === 'analytics' && (
                   <AnalyticalEngine 
                      onReportGenerated={handleAnalysisComplete} 
                      isEnrolled={systemStatus.isEnrolled}
                      challengeContext={pendingChallenge?.metadata.originalFilename}
                      vizSettings={vizSettings}
                      operatorRole={sessionRole}
                   />
                 )}
                 {activeTab === 'architect' && (
                   <BFileArchitect 
                      activeBiometric={activeBiometricReport}
                      onSealed={(newFile) => {
                        setVaultFiles(prev => [...prev, newFile]);
                        setActiveBiometricReport(null);
                        setActiveTab('vault');
                        addLog(`B-File Sealed: ${newFile.metadata.originalFilename}`, 'INFO');
                      }}
                      onBiometricRequest={() => setActiveTab('analytics')}
                   />
                 )}
                 {activeTab === 'recovery' && (
                   <RecoveryHub
                      keys={recoveryKeys}
                      onGenerate={(k) => setRecoveryKeys(prev => [...prev, k])}
                      role={sessionRole}
                   />
                 )}
                 {activeTab === 'vault' && (
                   <SecureVault 
                      activeFiles={vaultFiles}
                      onUnlockRequest={(f) => { setPendingChallenge(f); setActiveTab('analytics'); }} 
                      unlockedIds={unlockedFileIds}
                      relockTimers={relockTimers}
                      onRegisterAsset={(f) => setVaultFiles(p => [...p, f])}
                      userRole={sessionRole}
                   />
                 )}
                 {(activeTab === 'logs' || activeTab === 'clustering') && (
                   <div className="p-4 font-mono text-[10px] text-slate-400 overflow-y-auto h-full">
                     {activeTab === 'logs' ? (
                       <div className="space-y-1.5">
                         {logs.map(log => (
                           <div key={log.id} className="border-b border-slate-800/50 pb-1.5 flex gap-2">
                             <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                             <span className={`shrink-0 ${log.severity === 'CRITICAL' ? 'text-red-500' : log.severity === 'WARN' ? 'text-yellow-500' : 'text-cyan-500'}`}>
                               {log.severity}
                             </span>
                             <span className="text-slate-300">{log.event}</span>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="flex flex-col items-center justify-center h-64 opacity-20">
                         <ICONS.Activity />
                         <p className="mt-4 uppercase tracking-[0.4em]">Clustering Engine Offline</p>
                       </div>
                     )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;