
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { hal, SensorState } from '../services/hal';
import TelemetryVisualizationLayer from './TelemetryVisualizationLayer';
import { ICONS } from '../constants';

interface FaceEngineProps {
  onSuccess: (metadata?: any) => void;
  onAbort: () => void;
  onStateChange?: (state: string) => void;
}

type InternalState = SensorState | 'FORENSIC_ANALYSIS' | 'ATTESTATION_PENDING' | 'STALLED';

const FaceAcquisitionEngine: React.FC<FaceEngineProps> = ({ onSuccess, onAbort, onStateChange }) => {
  const [engineState, setEngineState] = useState<InternalState>('IDLE');
  const [progress, setProgress] = useState(0);
  const [health, setHealth] = useState(0);
  const [luxLevel, setLuxLevel] = useState(0);
  const [forensicReport, setForensicReport] = useState<string>("");
  const [detectedLandmarks, setDetectedLandmarks] = useState<any[]>([]);
  const [stalledReason, setStalledReason] = useState<string | null>(null);
  
  const progressRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<number | null>(null);
  const stallTimerRef = useRef<number | null>(null);
  const analysisLockRef = useRef(false);

  const updateState = useCallback((s: InternalState) => {
    setEngineState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const performForensicVerification = async (base64Image: string) => {
    if (analysisLockRef.current) return;
    analysisLockRef.current = true;
    updateState('FORENSIC_ANALYSIS');
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Perform a forensic liveness and biometric attestation. Detect 68 landmarks. Verify ocular triangle (eyes + nose bridge) is unobstructed. Check for deepfake or spoofing artifacts. Return JSON: confidenceScore (0-100), isLive (bool), report (string), landmarks (array of {x, y, label})." },
              { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confidenceScore: { type: Type.NUMBER },
              isLive: { type: Type.BOOLEAN },
              report: { type: Type.STRING },
              landmarks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    label: { type: Type.STRING }
                  },
                  required: ["x", "y"]
                }
              }
            },
            required: ["confidenceScore", "isLive", "report", "landmarks"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setForensicReport(result.report);
      setDetectedLandmarks(result.landmarks || []);

      const hasOcularTriangle = (result.landmarks || []).some((l: any) => l.label?.includes('eye')) && (result.landmarks || []).some((l: any) => l.label?.includes('nose'));

      if (result.isLive && result.confidenceScore > 85 && hasOcularTriangle) {
        progressRef.current = 100;
        setProgress(100);
        updateState('ATTESTATION_PENDING');
        setTimeout(() => onSuccess(result), 800);
      } else {
        if (!hasOcularTriangle) {
          setStalledReason("Ocular Triangle Obscured - Critical Region Locked");
          updateState('STALLED');
        } else {
          updateState('ERROR');
        }
      }
    } catch (err) {
      updateState('ERROR');
    } finally {
      analysisLockRef.current = false;
    }
  };

  const drawHUD = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    if (landmarks.length > 0) {
      ctx.fillStyle = progressRef.current >= 100 ? '#22c55e' : '#22d3ee';
      landmarks.forEach((lm) => {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connect Ocular Triangle
      const eyes = landmarks.filter(l => l.label?.includes('eye'));
      const nose = landmarks.find(l => l.label?.includes('nose'));
      if (eyes.length >= 2 && nose) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(eyes[0].x * width, eyes[0].y * height);
        ctx.lineTo(eyes[1].x * width, eyes[1].y * height);
        ctx.lineTo(nose.x * width, nose.y * height);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }, []);

  const runAcquisition = useCallback(async () => {
    updateState('PERMISSION_REQUESTED');
    const { stream, state } = await hal.requestSensor('CAMERA');
    
    if (state !== 'HAL_ACTIVE' || !stream) {
      if (state === 'PERMISSION_DENIED_OS_LEVEL') {
        setStalledReason("OS Permission Required - Hardware Access Denied");
        updateState('STALLED');
      } else {
        updateState(state);
      }
      return;
    }

    updateState('HAL_ACTIVE');
    if (videoRef.current) videoRef.current.srcObject = stream;

    const loop = async () => {
      if (!canvasRef.current || !videoRef.current || engineState === 'FORENSIC_ANALYSIS') {
        loopRef.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const pixelData = ctx.getImageData(0, 0, 640, 480).data;
      
      let lum = 0;
      for (let i = 0; i < pixelData.length; i += 256) lum += pixelData[i];
      const avgLum = lum / (pixelData.length / 256);
      setLuxLevel(avgLum);
      setHealth(Math.min(100, Math.max(0, avgLum - 10)));

      // Logic gates for progress
      if (avgLum > 60 && avgLum < 220) {
        // Stall logic if no landmarks detected after 3s
        if (progressRef.current > 40 && detectedLandmarks.length === 0) {
          if (!stallTimerRef.current) stallTimerRef.current = Date.now();
          if (Date.now() - stallTimerRef.current > 3000) {
            setStalledReason("Landmark detection failed: verify subject orientation");
            updateState('STALLED');
          }
        } else {
          stallTimerRef.current = null;
          setStalledReason(null);
          if (engineState === 'STALLED') updateState('HAL_ACTIVE');
        }

        progressRef.current = Math.min(95, progressRef.current + 0.5);
        setProgress(progressRef.current);

        if (progressRef.current >= 95 && !analysisLockRef.current) {
          const frame = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
          performForensicVerification(frame);
        }
      }

      drawHUD(ctx, detectedLandmarks);
      loopRef.current = requestAnimationFrame(loop);
    };
    loopRef.current = requestAnimationFrame(loop);
  }, [onSuccess, drawHUD, updateState, detectedLandmarks, engineState]);

  useEffect(() => {
    runAcquisition();
    return () => {
      hal.releaseSensor('CAMERA');
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [runAcquisition]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden font-mono">
      <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale blur-sm" />
      <TelemetryVisualizationLayer type="FACE" progress={progress} health={health} canvasRef={canvasRef} isLocked={progress >= 100} />

      {stalledReason && (
        <div className="absolute inset-0 z-[100] bg-orange-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95">
           <div className="text-orange-500 scale-150 mb-6 animate-pulse"><ICONS.Alert /></div>
           <h4 className="text-xl font-bold text-orange-400 uppercase tracking-widest">HAL_PROCESS_STALLED</h4>
           <p className="text-[10px] text-orange-400/70 mt-4 uppercase leading-relaxed max-w-xs">{stalledReason}</p>
           <div className="mt-8 flex gap-4">
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-orange-500 text-slate-950 font-bold uppercase text-[9px] rounded-xl tracking-widest">Retry_Sensor</button>
              <button onClick={onAbort} className="px-8 py-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase text-[9px] rounded-xl tracking-widest">Abort</button>
           </div>
        </div>
      )}

      {engineState === 'FORENSIC_ANALYSIS' && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex flex-col items-center justify-center gap-6">
           <div className="w-12 h-12 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin" />
           <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.5em] animate-pulse">Neural_Forensic_Pipeline</p>
        </div>
      )}

      {engineState === 'ERROR' && (
        <div className="absolute inset-0 z-[110] bg-red-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
           <div className="text-red-500 scale-150 mb-8"><ICONS.Alert /></div>
           <h3 className="text-lg font-bold text-red-500 uppercase tracking-widest">SIGNAL_ATTESTATION_DENIED</h3>
           <p className="text-[9px] text-red-400/60 mt-4 uppercase max-w-xs">{forensicReport || "Forensic integrity check failed."}</p>
           <button onClick={onAbort} className="mt-10 px-12 py-4 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terminate_Ingress</button>
        </div>
      )}

      <div className="absolute bottom-10 left-6 right-6 p-4 bg-black/60 border border-slate-800 rounded-2xl backdrop-blur-md flex flex-col gap-2">
         <div className="flex justify-between items-center text-[7px] mono uppercase">
            <span className="text-slate-600">Landmarks:</span>
            <span className="text-cyan-400 font-bold">{detectedLandmarks.length} detected</span>
         </div>
         {forensicReport && <p className="text-[6px] text-slate-500 italic uppercase truncate">{forensicReport}</p>}
      </div>
    </div>
  );
};

export default FaceAcquisitionEngine;
