
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { hal, SensorState } from '../services/hal';
import TelemetryVisualizationLayer from './TelemetryVisualizationLayer';
import { ICONS } from '../constants';

interface IrisEngineProps {
  onSuccess: (metadata?: any) => void;
  onAbort: () => void;
  onStateChange?: (state: string) => void;
}

type InternalState = SensorState | 'NEURAL_EXTRACT' | 'VERIFYING';

const IrisAcquisitionEngine: React.FC<IrisEngineProps> = ({ onSuccess, onAbort, onStateChange }) => {
  const [engineState, setEngineState] = useState<InternalState>('IDLE');
  const [progress, setProgress] = useState(0);
  const [health, setHealth] = useState(0);
  const [macroStatus, setMacroStatus] = useState<string>("CALIBRATING_OPTICS");
  
  const progressRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<number | null>(null);
  const analyzerRef = useRef<boolean>(false);

  const updateState = useCallback((s: InternalState) => {
    setEngineState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const runIrisVerification = async (base64: string) => {
    if (analyzerRef.current) return;
    analyzerRef.current = true;
    updateState('NEURAL_EXTRACT');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Analyze the iris patterns in this high-resolution macro capture. Identify unique biometric crypts, verify iris-pupil contrast stability, and perform a liveness check for reflection and moist-surface markers. Return JSON with confidence score (0-100), attestation code, and a brief forensic summary." },
              { inlineData: { mimeType: 'image/jpeg', data: base64 } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confidence: { type: Type.NUMBER },
              isAuthentic: { type: Type.BOOLEAN },
              summary: { type: Type.STRING },
              patternCount: { type: Type.INTEGER }
            },
            required: ["confidence", "isAuthentic", "summary"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.isAuthentic && result.confidence > 90) {
        setProgress(100);
        updateState('VERIFYING');
        setTimeout(() => onSuccess(result), 1200);
      } else {
        updateState('ERROR');
      }
    } catch (err) {
      updateState('ERROR');
    } finally {
      analyzerRef.current = false;
    }
  };

  const drawIrisHUD = useCallback((ctx: CanvasRenderingContext2D, signal: number, frame: number, p: number) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Tactical Reticle
    ctx.strokeStyle = p >= 100 ? '#22c55e' : `rgba(34, 211, 238, ${0.1 + signal/150})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX - 100, centerY, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX + 100, centerY, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Neural Grid Visualization
    if (p > 10 && p < 100) {
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
        for(let i=0; i<360; i+=15) {
            const angle = (i * Math.PI) / 180;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle)*50, centerY + Math.sin(angle)*50);
            ctx.lineTo(centerX + Math.cos(angle)*150, centerY + Math.sin(angle)*150);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }
  }, []);

  const runAcquisition = useCallback(async () => {
    updateState('PERMISSION_REQUESTED');
    const { stream, state } = await hal.requestSensor('CAMERA');
    
    if (state !== 'HAL_ACTIVE' || !stream) {
      updateState(state);
      return;
    }

    updateState('HAL_ACTIVE');
    if (videoRef.current) videoRef.current.srcObject = stream;

    const loop = () => {
      if (!canvasRef.current || !videoRef.current || engineState === 'NEURAL_EXTRACT') return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const pixelData = ctx.getImageData(0, 0, 640, 480).data;
      
      let variance = 0;
      for (let i = 0; i < pixelData.length; i += 256) variance += pixelData[i];
      const signalHealth = Math.min(100, (variance / (pixelData.length / 256)) * 2.5);
      setHealth(signalHealth);

      if (signalHealth > 70) {
        setMacroStatus("MACRO_STABILITY_LOCK");
        progressRef.current = Math.min(98, progressRef.current + 0.4);
        setProgress(progressRef.current);

        if (progressRef.current >= 98 && !analyzerRef.current) {
          const frame = canvasRef.current.toDataURL('image/jpeg', 0.95).split(',')[1];
          runIrisVerification(frame);
          if (loopRef.current) cancelAnimationFrame(loopRef.current);
          return;
        }
      } else {
        setMacroStatus("ADJUST_FOCUS: INSUFFICIENT_DEPTH");
        progressRef.current = Math.max(0, progressRef.current - 0.2);
        setProgress(progressRef.current);
      }

      drawIrisHUD(ctx, signalHealth, Date.now(), progressRef.current);
      loopRef.current = requestAnimationFrame(loop);
    };
    loopRef.current = requestAnimationFrame(loop);
  }, [onSuccess, drawIrisHUD, updateState, engineState]);

  useEffect(() => {
    runAcquisition();
    return () => {
      hal.releaseSensor('CAMERA');
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [runAcquisition]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden font-mono">
       {engineState === 'ERROR' ? (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 scale-150 mb-6"><ICONS.Alert /></div>
          <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">IRIS_REJECTION</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-xs mb-8">Patterns failed crypt-attestation stability check.</p>
          <button onClick={onAbort} className="px-10 py-4 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-bold text-slate-400 uppercase tracking-widest">Abort</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-5 grayscale blur-3xl scale-110" />
          <TelemetryVisualizationLayer type="IRIS" progress={progress} health={health} canvasRef={canvasRef} isLocked={progress >= 100} />
          
          {engineState === 'NEURAL_EXTRACT' && (
            <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-6">
                <div className="w-12 h-12 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.5em] animate-pulse">Neural_Pattern_Extraction</p>
                <div className="flex gap-1 h-4">
                   {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-0.5 bg-cyan-500 animate-bounce" style={{ animationDelay: `${i*0.1}s`, height: `${Math.random()*100}%` }} />
                   ))}
                </div>
            </div>
          )}

          <div className="absolute bottom-10 inset-x-10 p-4 bg-black/60 border border-slate-800 rounded-2xl backdrop-blur-md">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] text-slate-600 uppercase">Macro_Sensor:</span>
                <span className={`text-[8px] font-bold ${health > 70 ? 'text-cyan-400' : 'text-red-500'}`}>{macroStatus}</span>
             </div>
             <div className="h-0.5 w-full bg-slate-900">
                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${health}%` }} />
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default IrisAcquisitionEngine;
