
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { hal } from '../services/hal';
import TelemetryVisualizationLayer from './TelemetryVisualizationLayer';
import { ICONS } from '../constants';

interface VoiceProps {
  onSuccess: (metadata?: any) => void;
  onAbort: () => void;
  onStateChange?: (state: string) => void;
}

type VoiceMode = 'LIVE' | 'FILE';
type EngineState = 'IDLE' | 'SAMPLING' | 'ANALYSING' | 'VERIFIED' | 'FAILED' | 'ERROR';

const VoiceAcquisitionEngine: React.FC<VoiceProps> = ({ onSuccess, onAbort, onStateChange }) => {
  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [progress, setProgress] = useState(0);
  const [health, setHealth] = useState(0);
  const [engineState, setEngineState] = useState<EngineState>('IDLE');
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const progressInternalRef = useRef(0);
  const audioChunksRef = useRef<Float32Array[]>([]);

  const cleanup = useCallback(() => {
    hal.releaseSensor('MICROPHONE');
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    analyzerRef.current = null;
    progressInternalRef.current = 0;
    audioChunksRef.current = [];
  }, []);

  const runVocalForensics = async () => {
    setEngineState('ANALYSING');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Concatenate recorded chunks
    const totalLength = audioChunksRef.current.reduce((acc, curr) => acc + curr.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for(const chunk of audioChunksRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to PCM 16-bit for base64 (simplified)
    const pcm = new Int16Array(combined.length);
    for(let i=0; i<combined.length; i++) pcm[i] = combined[i] * 32768;
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: "Verify this vocal artifact. Perform spectral fingerprinting, detect acoustic spoofing (replay attacks), and identify unique vocal resonance markers. Return JSON with confidence (0-100), liveness (boolean), and a short forensic report." },
              { inlineData: { mimeType: 'audio/pcm;rate=48000', data: base64 } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confidence: { type: Type.NUMBER },
              isLive: { type: Type.BOOLEAN },
              report: { type: Type.STRING }
            },
            required: ["confidence", "isLive", "report"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.isLive && result.confidence > 80) {
        setProgress(100);
        setEngineState('VERIFIED');
        setTimeout(() => onSuccess(result), 1000);
      } else {
        setError(result.report);
        setEngineState('FAILED');
      }
    } catch (err) {
      setEngineState('ERROR');
    }
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, data: Uint8Array, progress: number) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = progress >= 100 ? '#22c55e' : `rgba(34, 211, 238, ${0.4 + health/100})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();

    if (progress < 100) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
        ctx.fillRect(0, 0, (progress/100)*width, height);
    }
  };

  const startLiveAcquisition = async () => {
    cleanup();
    setMode('LIVE');
    setEngineState('SAMPLING');
    
    const { stream, state } = await hal.requestSensor('MICROPHONE');
    if (state !== 'HAL_ACTIVE' || !stream) {
      setError(`HAL_FAILURE: ${state}`);
      return;
    }

    const audioCtx = new AudioContext({ sampleRate: 48000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 2048;
    source.connect(analyzer);
    analyzerRef.current = analyzer;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    const floatArray = new Float32Array(analyzer.fftSize);

    const loop = () => {
      if (!canvasRef.current || !analyzerRef.current || engineState !== 'SAMPLING') return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      analyzerRef.current.getByteTimeDomainData(dataArray);
      analyzerRef.current.getFloatTimeDomainData(floatArray);

      let sum = 0;
      for (let i = 0; i < floatArray.length; i++) sum += floatArray[i] * floatArray[i];
      const rms = Math.sqrt(sum / floatArray.length);
      const currentHealth = Math.min(100, rms * 1000);
      setHealth(currentHealth);

      if (currentHealth > 15) {
        audioChunksRef.current.push(new Float32Array(floatArray));
        progressInternalRef.current = Math.min(95, progressInternalRef.current + (currentHealth / 300));
        setProgress(progressInternalRef.current);
        
        if (progressInternalRef.current >= 95) {
          runVocalForensics();
          if (loopRef.current) cancelAnimationFrame(loopRef.current);
          return;
        }
      }

      drawWaveform(ctx, dataArray, progressInternalRef.current);
      loopRef.current = requestAnimationFrame(loop);
    };
    loopRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => cleanup, [cleanup]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 gap-6 font-mono overflow-hidden">
      {!mode ? (
        <div className="flex flex-col items-center gap-10 animate-in zoom-in-95">
          <div className="text-cyan-500/20 scale-150"><ICONS.Microphone /></div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-bold text-slate-100 uppercase tracking-widest leading-none">VOCAL_INGRESS</h3>
            <p className="text-[10px] text-slate-500 mono uppercase tracking-[0.4em]">Protocols: AEGIS_FORENSIC_V4</p>
          </div>
          <button onClick={startLiveAcquisition} className="px-14 py-4 bg-cyan-500 text-slate-950 rounded-2xl font-bold uppercase text-[12px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all">
            ACTIVATE_MIC_SENSOR
          </button>
          <button onClick={onAbort} className="text-[10px] text-slate-600 hover:text-slate-400 mono uppercase tracking-widest">Close_Ingress</button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col gap-6 animate-in slide-in-from-bottom-4">
          <div className="flex-1 relative rounded-3xl overflow-hidden border border-slate-800 bg-black shadow-2xl">
            <TelemetryVisualizationLayer type="VOICE" progress={progress} health={health} canvasRef={canvasRef} isLocked={progress >= 100} />
            
            {(engineState === 'ANALYSING' || engineState === 'VERIFIED') && (
               <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex flex-col items-center justify-center gap-6">
                  <div className="w-10 h-10 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.6em] animate-pulse">Spectral_Forensics_Active</p>
                  {engineState === 'VERIFIED' && <p className="text-[8px] text-green-500 font-bold uppercase">Signal_Handshake_Complete</p>}
               </div>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
             <div className="flex justify-between items-center text-[8px] mono">
                <span className="text-slate-500 uppercase">State: {engineState}</span>
                <span className={`font-bold ${health > 30 ? 'text-cyan-400' : 'text-red-500 animate-pulse'}`}>Signal: {health.toFixed(1)}%</span>
             </div>
             <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAcquisitionEngine;
