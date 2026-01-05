
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { ICONS } from '../constants';

interface LiveCommandCenterProps {
  isActive: boolean;
  onToggle: () => void;
  onCommand: (cmd: string) => void;
}

// Access to specific AI Studio environment functions for key management
const aistudio = (window as any).aistudio;

const LiveCommandCenter: React.FC<LiveCommandCenterProps> = ({ isActive, onToggle, onCommand }) => {
  const [transcription, setTranscription] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionState, setPermissionState] = useState<'IDLE' | 'AUTH_REQUIRED' | 'ACTIVE'>('IDLE');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const startSession = async () => {
    setIsConnecting(true);
    setPermissionState('IDLE');

    try {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setPermissionState('AUTH_REQUIRED');
        await aistudio.openSelectKey();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setPermissionState('ACTIVE');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(s => {
                if (s) s.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) await playAudio(audioData);
            
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              setTranscription(prev => prev + text);
            }
            if (msg.serverContent?.turnComplete) {
              setTranscription(prev => {
                if (prev.trim()) onCommand(prev.trim());
                return "";
              });
            }
          },
          onclose: () => {
            onToggle();
            sessionRef.current = null;
          },
          onerror: (e: any) => {
            console.error('Live Error:', e);
            if (e.message?.toLowerCase().includes("permission") || e.message?.toLowerCase().includes("not found")) {
               setPermissionState('AUTH_REQUIRED');
            }
            setIsConnecting(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: `You are AEGIS-CORE VOICE, the neural authority for a multi-tiered Biometric Command Hub. 
          
          MASTER DIRECTIVE:
          1. Operate under Advanced Native Architecture protocols. 
          2. Understand the Trust Tier hierarchy: T0 (Forensic/Web), T1 (Native/OS), T2 (Hardware/TEE), T3 (OEM/Full Attestation).
          3. Dactyl (Fingerprint) domain is LOCKED in web environments (T2 requirement).
          4. Face and Iris domains require telemetry validation before confirming identity.
          5. Never simulate or "fake" success. If a sensor is missing or data is poor, report authority failure.
          
          TONE:
          Tactical, military-grade, and concise. Use forensic terminology. Confirm all commands with high-assurance status indicators.`
        }
      });

      sessionRef.current = await sessionPromise;
      setIsConnecting(false);
    } catch (error: any) {
      console.error('Session failed:', error);
      if (error.message?.toLowerCase().includes("permission")) {
        setPermissionState('AUTH_REQUIRED');
      }
      setIsConnecting(false);
      onToggle();
    }
  };

  const createPcmBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))),
      mimeType: 'audio/pcm;rate=16000'
    };
  };

  const playAudio = async (base64: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    function decode(base64: string) {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    const bytes = decode(base64);
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);
  };

  const handleKeyAuth = async () => {
    await aistudio.openSelectKey();
    startSession();
  };

  useEffect(() => {
    if (isActive && !sessionRef.current) {
      startSession();
    } else if (!isActive && sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  }, [isActive]);

  return (
    <div className={`flex items-center gap-4 transition-all ${isActive ? 'bg-slate-900/80 rounded-2xl p-2 pl-4 pr-3 border border-slate-700/60 backdrop-blur-md' : ''}`}>
       {permissionState === 'AUTH_REQUIRED' && isActive && (
         <button 
           onClick={handleKeyAuth}
           className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg text-[8px] mono font-bold uppercase animate-pulse flex items-center gap-2"
         >
           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           Auth_Required: Select Paid API Key
         </button>
       )}
       <div className="flex flex-col items-end">
          <span className={`text-[8px] mono font-bold tracking-widest ${isActive ? 'text-cyan-400' : 'text-slate-600'}`}>
            {isActive ? (isConnecting ? 'ESTABLISHING_LINK...' : permissionState === 'AUTH_REQUIRED' ? 'AUTH_DENIED' : 'VOICE_GATE_ACTIVE') : 'INTERFACE_CLOSED'}
          </span>
          {isActive && permissionState === 'ACTIVE' && (
            <div className="flex gap-0.5 h-3 items-end mt-1">
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="w-0.5 bg-cyan-400 animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i*0.1}s` }}></div>
               ))}
            </div>
          )}
       </div>
       <button 
          onClick={onToggle}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? (permissionState === 'AUTH_REQUIRED' ? 'bg-red-500 text-white' : 'bg-cyan-500 text-slate-950 glow-cyan') : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
        >
          {permissionState === 'AUTH_REQUIRED' ? <ICONS.Lock /> : <ICONS.Microphone />}
       </button>
    </div>
  );
};

export default LiveCommandCenter;
