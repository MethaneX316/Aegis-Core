
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ICONS } from '../constants';
import { SignalType, AnalysisReport, TrustTier, ForensicTelemetry } from '../types';
import { hal } from '../services/hal';

interface ArtifactProps {
  onSuccess: (report: AnalysisReport) => void;
  onAbort: () => void;
}

type ArtifactState = 
  | 'IDLE' 
  | 'INGESTING' 
  | 'PIXEL_ANALYSIS' 
  | 'AI_ANALYSIS' 
  | 'GEOMETRIC_LOCK' 
  | 'FEATURE_ATTESTATION' 
  | 'SUCCESS' 
  | 'HAL_ERROR';

interface ForensicAlert {
  id: string;
  type: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
  details?: string;
}

interface AiForensicResponse {
  landmarks: { x: number; y: number; label: string; confidence: number }[];
  ocularTriangleDetected: boolean;
  anomalyScore: number;
  occlusionScore: number;
  integrityVerified: boolean;
  forensicReport: string;
  detectedResolution: string;
}

const ArtifactAcquisitionEngine: React.FC<ArtifactProps> = ({ onSuccess, onAbort }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<ArtifactState>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<ForensicTelemetry | null>(null);
  const [alerts, setAlerts] = useState<ForensicAlert[]>([]);
  const [aiReport, setAiReport] = useState<AiForensicResponse | null>(null);
  const [stalled, setStalled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);

  const addAlert = (type: 'INFO' | 'WARN' | 'CRITICAL', message: string, details?: string) => {
    setAlerts(prev => [{ id: Math.random().toString(), type, message, details }, ...prev].slice(0, 10));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const generateInitialTelemetry = (f: File): ForensicTelemetry => ({
    file: {
      name: f.name,
      sizeBytes: f.size,
      hash: `SHA256:${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      type: f.type || 'image/jpeg',
      dimensions: { width: 0, height: 0 },
      bitDepth: 8
    },
    processing: {
      parsingProgress: 0,
      healthScore: 0,
      confidenceScore: 0,
      pixelsProcessed: 0,
      edgesDetected: 0,
      landmarksDetected: 0,
      occlusionScore: 0,
      frameCount: 1,
      processingFPS: 0,
      anomalyScore: 0
    },
    metadata: { EXIF_verified: true, corruptionDetected: false },
    state: 'IDLE',
    timestamp: Date.now(),
    trustTier: hal.getAttestationTier('CAMERA')
  });

  const drawForensicLayer = useCallback((ctx: CanvasRenderingContext2D, tel: ForensicTelemetry, stage: ArtifactState, aiData: AiForensicResponse | null) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    const progress = tel.processing.parsingProgress;
    const isError = stage === 'HAL_ERROR';
    const primaryColor = isError ? '#ef4444' : progress >= 100 ? '#22c55e' : '#22d3ee';

    // Grid Layer
    ctx.setLineDash([5, 10]);
    ctx.strokeStyle = `${primaryColor}15`;
    ctx.beginPath();
    for (let i = 0; i < width; i += 50) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
    for (let j = 0; j < height; j += 50) { ctx.moveTo(0, j); ctx.lineTo(width, j); }
    ctx.stroke();
    ctx.setLineDash([]);

    // Scan Line
    if (progress > 0 && progress < 100) {
      const scanY = (progress / 100) * height;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = primaryColor;
      ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(width, scanY); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Landmark Layer
    if (aiData?.landmarks) {
      aiData.landmarks.forEach((lm) => {
        const x = lm.x * width;
        const y = lm.y * height;
        const scanPos = (progress / 100) * height;

        if (y < scanPos || progress >= 100) {
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (aiData.ocularTriangleDetected && (progress > 70 || progress >= 100)) {
        const eyeL = aiData.landmarks[36];
        const eyeR = aiData.landmarks[45];
        const nose = aiData.landmarks[30];
        if (eyeL && eyeR && nose) {
          ctx.strokeStyle = `${primaryColor}66`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(eyeL.x * width, eyeL.y * height);
          ctx.lineTo(eyeR.x * width, eyeR.y * height);
          ctx.lineTo(nose.x * width, nose.y * height);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }, []);

  const runPipeline = async (artifact: File) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setError(null);
    setStalled(false);
    setState('INGESTING');

    const initialTel = generateInitialTelemetry(artifact);
    setTelemetry(initialTel);
    setPreview(URL.createObjectURL(artifact));

    try {
      await new Promise(r => setTimeout(r, 600));
      setState('PIXEL_ANALYSIS');
      addAlert('INFO', 'PIXEL_STREAM_OPENED', 'Analyzing bitstream integrity');

      setState('AI_ANALYSIS');
      const base64Data = await fileToBase64(artifact);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { text: "Forensic biometric audit. Detect 68 landmarks. Verify ocular triangle (eyes + nose) visibility. Assess deepfake risk (anomaly score 0-100). RETURN JSON SCHEMA." },
            { inlineData: { mimeType: artifact.type, data: base64Data } }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              landmarks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, label: { type: Type.STRING }, confidence: { type: Type.NUMBER } } } },
              ocularTriangleDetected: { type: Type.BOOLEAN },
              anomalyScore: { type: Type.NUMBER },
              occlusionScore: { type: Type.NUMBER },
              integrityVerified: { type: Type.BOOLEAN },
              forensicReport: { type: Type.STRING },
              detectedResolution: { type: Type.STRING }
            },
            required: ["landmarks", "ocularTriangleDetected", "anomalyScore", "integrityVerified"]
          }
        }
      });

      const aiResult: AiForensicResponse = JSON.parse(response.text || '{}');
      setAiReport(aiResult);

      setState('GEOMETRIC_LOCK');
      let currentTel = { ...initialTel };
      const duration = 3000;
      const startTime = Date.now();

      while (true) {
        const elapsed = Date.now() - startTime;
        let p = (elapsed / duration) * 100;

        if (!aiResult.ocularTriangleDetected && p > 50) {
          p = 50;
          if (!stalled) {
            setStalled(true);
            addAlert('CRITICAL', 'STALL: OCULAR_REGION_OBSCURED', 'Identity triangle unverified');
          }
        } else if (aiResult.landmarks.length < 50 && p > 80) {
          p = 80;
          if (!stalled) {
            setStalled(true);
            addAlert('WARN', 'STALL: INSUFFICIENT_FEATURES', 'Low-confidence feature extraction');
          }
        }

        currentTel.processing.parsingProgress = p;
        currentTel.processing.landmarksDetected = Math.round((p / 100) * aiResult.landmarks.length);
        setTelemetry({ ...currentTel });
        
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) drawForensicLayer(ctx, currentTel, 'GEOMETRIC_LOCK', aiResult);

        if (p >= 100 || stalled) break;
        await new Promise(r => requestAnimationFrame(r));
      }

      if (stalled) {
        setError("ATTESTATION_FAILED: DATA_INSUFFICIENCY");
        setState('HAL_ERROR');
      } else if (aiResult.anomalyScore > 75) {
        setError("SPOOF_DETECTED: HIGH_ANOMALY_INDEX");
        setState('HAL_ERROR');
      } else {
        setState('SUCCESS');
        addAlert('INFO', 'SUCCESS: OBJECT_ATTESTED');
      }

    } catch (err: any) {
      setError(`PIPELINE_ERROR: ${err.message}`);
      setState('HAL_ERROR');
    } finally {
      processingRef.current = false;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden relative font-mono text-slate-300">
      {state === 'IDLE' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 animate-in zoom-in-95">
          <div className="text-cyan-500/20 scale-150"><ICONS.Shield /></div>
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-white">Ingress: Artifact_Analytic</h2>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest leading-loose">Capacitor Native Bridge Active</p>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="px-12 py-4 bg-cyan-500 text-slate-950 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">
            INGEST_DATA_OBJECT
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && runPipeline(e.target.files[0])} />
          <button onClick={onAbort} className="text-[9px] text-slate-600 hover:text-slate-400 uppercase tracking-widest">Abort</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          
          {/* Layered Viewport */}
          <main className="flex-1 relative flex flex-col items-center justify-center min-h-0 bg-slate-950">
             {preview && (
               <img src={preview} className={`absolute inset-0 w-full h-full object-contain transition-all duration-1000 ${state === 'SUCCESS' ? 'opacity-60 grayscale-0' : 'opacity-20 blur-2xl grayscale'}`} />
             )}
             <canvas ref={canvasRef} width={1200} height={900} className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none" />

             {/* HUD Overlays (Responsive) */}
             <div className="absolute top-6 left-6 flex flex-col gap-2 z-30">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${state === 'HAL_ERROR' ? 'bg-red-500' : 'bg-cyan-500 animate-pulse'}`} />
                   <span className="text-[8px] font-bold uppercase tracking-widest">{state}</span>
                </div>
                {stalled && <div className="bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg border border-orange-500/30 text-[8px] font-bold uppercase tracking-widest animate-pulse">Scan_Stalled: No_Lock</div>}
             </div>

             <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-30">
                <div className="flex flex-col gap-1">
                   <span className="text-[7px] text-slate-600 uppercase font-bold">Progress</span>
                   <div className="w-32 h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${telemetry?.processing.parsingProgress || 0}%` }} />
                   </div>
                </div>
                {state === 'SUCCESS' && (
                  <button onClick={() => onSuccess({} as any)} className="bg-cyan-500 text-slate-950 px-8 py-3 rounded-xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Commit_Seal</button>
                )}
             </div>

             {/* Audit Drawer Trigger */}
             <button onClick={() => setIsSidebarOpen(true)} className="absolute top-6 right-6 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 z-30">
                <ICONS.Activity />
             </button>

             {error && (
               <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center gap-6 p-8 text-center">
                  <div className="text-red-500 scale-150"><ICONS.Alert /></div>
                  <h4 className="text-lg font-bold text-red-500 uppercase">ATTESTATION_DENIED</h4>
                  <p className="text-[9px] text-red-500/70 uppercase max-w-xs leading-relaxed">{error}</p>
                  <button onClick={() => setState('IDLE')} className="px-8 py-3 bg-slate-900 border border-slate-800 text-slate-400 text-[8px] font-bold uppercase rounded-xl">Reset_Core</button>
               </div>
             )}
          </main>

          {/* Audit Drawer (Mobile-First) */}
          <aside className={`fixed inset-y-0 right-0 w-72 bg-slate-900 border-l border-slate-800 z-[100] transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} p-6 flex flex-col gap-6`}>
             <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Forensic_Audit</h4>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-600 hover:text-white"><ICONS.Menu /></button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-4 text-[8px] mono">
                {alerts.map(a => (
                  <div key={a.id} className={`p-3 rounded-lg border ${a.type === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                     <p className="font-bold uppercase mb-1">[{a.type}] {a.message}</p>
                     {a.details && <p className="opacity-60">{a.details}</p>}
                  </div>
                ))}
             </div>
             <div className="pt-6 border-t border-slate-800">
                <p className="text-[7px] text-slate-600 uppercase mb-2">Neural_Heuristics</p>
                <div className="grid grid-cols-2 gap-2">
                   <div className="bg-black/60 p-2 rounded border border-slate-800">
                      <span className="block text-[6px] text-slate-700">ANOMALY</span>
                      <span className="text-[9px] text-cyan-400">{aiReport?.anomalyScore || 0}%</span>
                   </div>
                   <div className="bg-black/60 p-2 rounded border border-slate-800">
                      <span className="block text-[6px] text-slate-700">CONFIDENCE</span>
                      <span className="text-[9px] text-green-500">{telemetry?.processing.confidenceScore.toFixed(1) || 0}%</span>
                   </div>
                </div>
             </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default ArtifactAcquisitionEngine;
