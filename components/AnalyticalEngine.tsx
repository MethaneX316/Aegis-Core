
import React, { useState } from 'react';
import { AnalysisReport, SignalType, UserRole, IngressPath, CaptureMode, BiometricSignal, TrustTier } from '../types';
import { ICONS } from '../constants';
import { VizSettings } from '../App';
// Fix: Import SensorType for explicit mapping
import { hal, SensorType } from '../services/hal';
import FaceAcquisitionEngine from './FaceAcquisitionEngine';
import IrisAcquisitionEngine from './IrisAcquisitionEngine';
import VoiceAcquisitionEngine from './VoiceAcquisitionEngine';
import DactylAcquisitionEngine from './DactylAcquisitionEngine';
import ArtifactAcquisitionEngine from './ArtifactAcquisitionEngine';

interface AnalyticalEngineProps {
  onReportGenerated: (report: AnalysisReport) => void;
  isEnrolled: boolean;
  vizSettings: VizSettings;
  operatorRole?: UserRole;
  challengeContext?: string;
}

const AnalyticalEngine: React.FC<AnalyticalEngineProps> = ({ 
  onReportGenerated, isEnrolled, vizSettings, operatorRole = 'End-User', challengeContext
}) => {
  const [activePath, setActivePath] = useState<string | null>(null);

  const handleSuccess = (type: SignalType, metadata?: any) => {
    // If we already have a complex report (from Artifact Engine), pass it through
    if (metadata && metadata.signals) {
      onReportGenerated(metadata as AnalysisReport);
    } else {
      // Fix: Map SignalType to SensorType for HAL compatibility
      const sensorTypeMap: Record<string, SensorType> = {
        [SignalType.FACE]: 'CAMERA',
        [SignalType.VOICE]: 'MICROPHONE',
        [SignalType.IRIS]: 'IRIS_SCANNER',
        [SignalType.FINGERPRINT]: 'FINGERPRINT',
        [SignalType.LIVENESS]: 'CAMERA'
      };
      const sensorType = sensorTypeMap[type] || 'CAMERA';

      const tier = hal.getAttestationTier(sensorType);
      const token = hal.generateAttestationToken(sensorType);

      const report: AnalysisReport = {
        id: `REP-${Date.now()}`,
        timestamp: Date.now(),
        signals: [{ 
          type, 
          confidence: 0.99, 
          status: 'valid', 
          timestamp: Date.now(), 
          dataPoints: metadata || {},
          attainmentTier: tier
        }],
        overallConfidence: 0.99,
        livenessScore: 0.99,
        decision: 'VERIFIED',
        reasoning: `Advanced Native Handshake Fulfilled. Authority Level: ${tier}. Cryptographic attestation token sealed.`,
        operatorRole: operatorRole as UserRole,
        ingressPath: type === SignalType.FACE ? 'OPTICAL_PATH' : type === SignalType.IRIS ? 'OPTICAL_PATH' : type === SignalType.VOICE ? 'VOCAL_PATH' : type === SignalType.LIVENESS ? 'ARTIFACT_PATH' : 'DACTYL_PATH',
        captureMode: 'LIVE',
        featureVectorHash: 'BIO_VEC_' + Math.random().toString(16).slice(2).toUpperCase(),
        trustTier: tier,
        attestationToken: token
      };
      onReportGenerated(report);
    }
    setActivePath(null);
  };

  const domainPaths = [
    { id: 'FACE_DOMAIN', label: 'IDENTITY: FACE', icon: <ICONS.Activity />, type: SignalType.FACE, tier: TrustTier.T1_NATIVE_OS },
    { id: 'IRIS_DOMAIN', label: 'AUTHORITY: IRIS', icon: <ICONS.Activity />, type: SignalType.IRIS, tier: TrustTier.T1_NATIVE_OS },
    { id: 'VOCAL_DOMAIN', label: 'FORENSIC: VOICE', icon: <ICONS.Microphone />, type: SignalType.VOICE, tier: TrustTier.T1_NATIVE_OS },
    { id: 'ARTIFACT_DOMAIN', label: 'ARTIFACT: FILE', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>, type: SignalType.LIVENESS, tier: TrustTier.T0_HEURISTIC },
    { id: 'DACTYL_DOMAIN', label: 'HARDWARE: DACTYL', icon: <ICONS.Fingerprint />, type: SignalType.FINGERPRINT, tier: TrustTier.T2_TEE_BACKED }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 h-full relative overflow-hidden">
      <div className="w-full max-w-2xl bg-[#080b0f]/98 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-full overflow-hidden backdrop-blur-2xl">
        
        <header className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${activePath ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`}></div>
             <div>
                <p className="text-[10px] font-bold text-slate-100 uppercase tracking-widest mono leading-none">AEGIS_GOVERNANCE_NODE</p>
                <p className="text-[8px] text-cyan-600 mono uppercase font-bold tracking-tighter mt-1">
                  MODULE: {activePath || 'AWAITING_DOMAIN_SELECTION'}
                </p>
             </div>
          </div>
          {activePath && (
            <button onClick={() => setActivePath(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </header>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          {!activePath ? (
            <div className="flex flex-col gap-4">
               {/* Advanced Native Directive Status */}
               <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-500 shadow-inner">
                    <ICONS.Shield />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] text-cyan-500 mono font-bold uppercase tracking-[0.2em] mb-1">Advanced_Native_Architecture</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">Master Directive Enabled: Hardware-Locked Authority Model v2.0</p>
                  </div>
               </div>

               {challengeContext && (
                 <div className="mb-2 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                    <p className="text-[8px] text-cyan-600 mono uppercase font-bold tracking-widest mb-1">Challenge_Target</p>
                    <p className="text-[11px] text-slate-300 mono font-bold uppercase truncate">{challengeContext}</p>
                 </div>
               )}
               {domainPaths.map(path => (
                <button key={path.id} className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center justify-between group hover:border-cyan-500/50" onClick={() => setActivePath(path.id)}>
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-cyan-500/30 group-hover:text-cyan-500 transition-all">
                      {path.icon}
                    </div>
                    <div className="text-left">
                      <span className="text-[11px] font-bold text-slate-100 uppercase mono block">{path.label}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[7px] text-slate-600 mono uppercase font-bold tracking-tighter">REQ_LEVEL: {path.tier}</span>
                        <div className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span className={`text-[7px] font-bold uppercase ${path.id === 'DACTYL_DOMAIN' ? 'text-red-900' : 'text-slate-700'}`}>
                          {path.id === 'DACTYL_DOMAIN' ? 'TEE_REQUIRED' : 'OS_ATTESTED'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-700 group-hover:text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
              {activePath === 'FACE_DOMAIN' && <FaceAcquisitionEngine onSuccess={() => handleSuccess(SignalType.FACE)} onAbort={() => setActivePath(null)} />}
              {activePath === 'IRIS_DOMAIN' && <IrisAcquisitionEngine onSuccess={() => handleSuccess(SignalType.IRIS)} onAbort={() => setActivePath(null)} />}
              {activePath === 'VOCAL_DOMAIN' && <VoiceAcquisitionEngine onSuccess={() => handleSuccess(SignalType.VOICE)} onAbort={() => setActivePath(null)} />}
              {activePath === 'ARTIFACT_DOMAIN' && <ArtifactAcquisitionEngine onSuccess={(report) => handleSuccess(SignalType.LIVENESS, report)} onAbort={() => setActivePath(null)} />}
              {activePath === 'DACTYL_DOMAIN' && <DactylAcquisitionEngine onSuccess={() => handleSuccess(SignalType.FINGERPRINT)} onAbort={() => setActivePath(null)} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticalEngine;
