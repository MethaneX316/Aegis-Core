import React, { useEffect, useState, useMemo } from 'react';
import { AnalysisReport, SignalType } from '../types';

interface SignalMonitorProps {
  lastReport: AnalysisReport | null;
  isEnrolled: boolean;
}

const SignalMonitor: React.FC<SignalMonitorProps> = ({ lastReport, isEnrolled }) => {
  const [pulse, setPulse] = useState(72);
  const [noiseFloor, setNoiseFloor] = useState(12);
  const [ppgData, setPpgData] = useState<number[]>(new Array(40).fill(50));

  useEffect(() => {
    const interval = setInterval(() => {
      // Physiological simulation (rPPG)
      setPulse(p => {
        const delta = (Math.random() - 0.5) * 2;
        return Math.min(110, Math.max(55, p + delta));
      });
      
      // Noise floor simulation (Adversarial monitoring)
      setNoiseFloor(n => {
        const delta = (Math.random() - 0.5) * 3;
        return Math.min(45, Math.max(5, n + delta));
      });

      // Update PPG wave
      setPpgData(prev => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1];
        const angle = Date.now() / 100;
        const wave = 50 + Math.sin(angle) * 20 + (Math.random() - 0.5) * 5;
        return [...next, wave];
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const signalAssurance = useMemo(() => {
    if (!lastReport) return 0;
    return lastReport.overallConfidence * 100;
  }, [lastReport]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Liveness & Physiological Hub */}
      <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h4 className="text-[10px] mono font-bold text-cyan-500 uppercase tracking-widest">LIVENESS_PHYSIOLOGICAL_TRACE</h4>
            <p className="text-[8px] text-slate-500 mono uppercase">Simulated Remote Photoplethysmography (rPPG)</p>
          </div>
          <div className="text-right">
            <span className="text-[14px] font-bold text-cyan-400 mono">{Math.round(pulse)}</span>
            <span className="text-[8px] text-slate-600 mono ml-1">BPM</span>
          </div>
        </div>

        <div className="h-24 w-full bg-black/40 rounded-xl border border-slate-800 flex items-end gap-1 p-2 overflow-hidden">
          {ppgData.map((v, i) => (
            <div 
              key={i} 
              className="flex-1 bg-cyan-500/40 rounded-t-sm transition-all duration-150" 
              style={{ height: `${v}%`, opacity: 0.2 + (i/ppgData.length) * 0.8 }}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <p className="text-[7px] text-slate-600 mono uppercase mb-1">Environmental_Noise_Floor</p>
            <div className="flex items-end gap-3">
              <span className="text-[12px] font-bold mono text-slate-400">{noiseFloor.toFixed(1)}dB</span>
              <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${noiseFloor > 30 ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} 
                  style={{ width: `${(noiseFloor/50)*100}%` }} 
                />
              </div>
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <p className="text-[7px] text-slate-600 mono uppercase mb-1">Signal_Assurance_Index</p>
            <div className="flex items-end gap-3">
              <span className="text-[12px] font-bold mono text-cyan-500">{signalAssurance.toFixed(1)}%</span>
              <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 shadow-[0_0_8px_cyan] transition-all duration-500" 
                  style={{ width: `${signalAssurance}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fusion Assurance Hub */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
        <header className="space-y-1">
          <h4 className="text-[10px] mono font-bold text-cyan-500 uppercase tracking-widest">FUSION_ASSURANCE_HUB</h4>
          <p className="text-[8px] text-slate-500 mono uppercase">Cryptographic binding status</p>
        </header>

        <div className="flex-1 space-y-4">
          {[
            { label: 'OPTICAL_DEPTH', active: !!lastReport && (lastReport.signals[0].type === SignalType.FACE || lastReport.signals[0].type === SignalType.IRIS) },
            { label: 'VOCAL_SPECTRUM', active: !!lastReport && lastReport.signals[0].type === SignalType.VOICE },
            { label: 'LIVENESS_HEURISTIC', active: isEnrolled },
            { label: 'ENCLAVE_ATTESTATION', active: isEnrolled }
          ].map((node, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${node.active ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-950 border-slate-800/60 opacity-40'}`}>
              <span className={`text-[9px] mono font-bold ${node.active ? 'text-cyan-400' : 'text-slate-600'}`}>{node.label}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${node.active ? 'bg-cyan-500 shadow-[0_0_5px_cyan]' : 'bg-slate-800'}`} />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-800">
          <p className="text-[7px] text-slate-600 mono uppercase mb-2">Posture_Integrity</p>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
             <span className="text-[8px] mono text-slate-500">TRUST_LEVEL:</span>
             <span className="text-[10px] mono font-bold text-green-500 uppercase">{isEnrolled ? 'HIGH_ASSURANCE' : 'UNVERIFIED'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalMonitor;