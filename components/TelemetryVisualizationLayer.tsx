
import React from 'react';
import { hal } from '../services/hal';
import { TrustTier } from '../types';

interface TelemetryProps {
  type: 'FACE' | 'IRIS' | 'VOICE' | 'DACTYL';
  progress: number;
  health: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLocked: boolean;
  anomaly?: number;
  occlusion?: number;
}

const TelemetryVisualizationLayer: React.FC<TelemetryProps> = ({ 
  type, progress, health, canvasRef, isLocked, anomaly = 0, occlusion = 0 
}) => {
  const sensorMap: Record<string, any> = { 'FACE': 'CAMERA', 'IRIS': 'IRIS_SCANNER', 'VOICE': 'MICROPHONE', 'DACTYL': 'FINGERPRINT' };
  const tier = hal.getAttestationTier(sensorMap[type] || 'CAMERA');

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-mono">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-contain" />
      
      {/* Edge-aligned Telemetry (Native Standard) */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
         <div className="flex flex-col gap-2">
            <div className={`px-2 py-1 rounded border flex items-center gap-2 ${tier === TrustTier.T2_TEE_BACKED ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}>
               <div className="w-1 h-1 rounded-full bg-current animate-pulse" />
               <span className="text-[7px] font-bold uppercase">TIER_{tier.split('_')[0]}</span>
            </div>
            <div className="bg-black/60 px-2 py-1 rounded border border-slate-800">
               <span className="text-[6px] text-slate-500 uppercase font-bold">SIGNAL: {health.toFixed(1)}%</span>
            </div>
         </div>
         
         <div className="flex flex-col items-end gap-2">
            <div className="bg-black/60 px-3 py-1 rounded border border-slate-800 text-right">
               <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">{type}</span>
            </div>
            {anomaly > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 px-2 py-1 rounded">
                <span className="text-[6px] text-red-500 font-bold uppercase">ANOMALY: {anomaly}%</span>
              </div>
            )}
         </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex justify-center">
         <div className="bg-black/80 backdrop-blur-md px-6 py-2 rounded-2xl border border-slate-800/80 shadow-2xl flex items-center gap-6">
            <div className="flex flex-col">
               <span className="text-[6px] text-slate-600 uppercase font-bold">Saturation</span>
               <span className="text-[12px] font-bold text-cyan-500">{Math.round(progress)}%</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex flex-col">
               <span className="text-[6px] text-slate-600 uppercase font-bold">Status</span>
               <span className={`text-[9px] font-bold uppercase ${isLocked ? 'text-green-500' : 'text-cyan-400 animate-pulse'}`}>{isLocked ? 'LOCKED' : 'SAMPLING'}</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TelemetryVisualizationLayer;
