import React, { useState, useRef, useCallback } from 'react';
import { biometricBridge } from '../services/biometricBridge';
import { ICONS } from '../constants';
import { GoogleGenAI, Type } from '@google/genai';
import { ForensicTelemetry, AnalysisReport } from '../types';

interface ArtifactProps {
  onSuccess: (report: AnalysisReport) => void;
  onAbort: () => void;
}

const ArtifactAcquisitionEngine: React.FC<ArtifactProps> = ({ onSuccess, onAbort }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<'IDLE' | 'SCANNING' | 'PROCESSING' | 'SUCCESS' | 'HAL_ERROR'>('IDLE');
  const [alerts, setAlerts] = useState<{ type: string; message: string }[]>([]);
  const [telemetry, setTelemetry] = useState<ForensicTelemetry | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addAlert = (type: string, message: string) => {
    setAlerts(prev => [{ type, message }, ...prev].slice(0, 10));
  };

  const runPipeline = async (artifact: File) => {
    setFile(artifact);
    setPreview(URL.createObjectURL(artifact));
    setState('SCANNING');
    addAlert('INFO', 'Starting native biometric attestation...');

    // Step 1: Native fingerprint scan
    await biometricBridge.startScan(event => {
      if (event.status === 'SUCCESS') {
        addAlert('INFO', 'Native attestation passed.');
        proceedAiAnalysis(artifact);
      } else if (event.status === 'FAIL') {
        setState('HAL_ERROR');
        addAlert('CRITICAL', `Attestation Failed: ${event.error}`);
      } else if (event.status === 'HARDWARE_UNSUPPORTED') {
        addAlert('WARN', 'Device does not support native attestation. Web fallback may be limited.');
      }
    });
  };

  const proceedAiAnalysis = async (artifact: File) => {
    setState('PROCESSING');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await fileToBase64(artifact);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: 'Forensic biometric audit. Detect 68 landmarks. Verify ocular triangle.' },
            { inlineData: { mimeType: artifact.type, data: base64Data } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            landmarks: { type: Type.ARRAY },
            ocularTriangleDetected: { type: Type.BOOLEAN },
            anomalyScore: { type: Type.NUMBER }
          },
          required: ['landmarks', 'ocularTriangleDetected']
        }
      }
    });

    const aiResult = JSON.parse(response.text || '{}');
    updateTelemetry(aiResult);
  };

  const updateTelemetry = (aiResult: any) => {
    setTelemetry(prev => ({
      ...prev,
      processing: {
        ...prev?.processing,
        parsingProgress: 100,
        landmarksDetected: aiResult.landmarks.length,
        anomalyScore: aiResult.anomalyScore
      }
    }));

    if (!aiResult.ocularTriangleDetected || aiResult.anomalyScore > 75) {
      setState('HAL_ERROR');
      addAlert('CRITICAL', 'Scan failed due to missing landmarks or high anomaly.');
    } else {
      setState('SUCCESS');
      addAlert('INFO', 'Artifact successfully attested.');
      onSuccess({} as AnalysisReport);
    }
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = e => reject(e);
    });

  return (
    <div className="flex-1 relative bg-black text-slate-300 overflow-hidden font-mono">
      {state === 'IDLE' && (
        <div className="flex flex-col items-center justify-center h-full">
          <button onClick={() => document.getElementById('fileInput')?.click()} className="bg-cyan-500 px-6 py-3 rounded-xl font-bold">Select Artifact</button>
          <input id="fileInput" type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && runPipeline(e.target.files[0])} />
        </div>
      )}

      {(state === 'SCANNING' || state === 'PROCESSING') && (
        <div className="relative flex-1">
          {preview && <img src={preview} className="absolute inset-0 w-full h-full object-contain opacity-30" />}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>
      )}

      {state === 'HAL_ERROR' && (
        <div className="absolute inset-0 bg-red-950 flex flex-col items-center justify-center gap-4">
          <span className="text-red-500 font-bold uppercase">Scan Failed</span>
          {alerts.map(a => (
            <p key={a.message} className="text-[8px]">{a.message}</p>
          ))}
          <button onClick={() => setState('IDLE')} className="bg-slate-800 px-4 py-2 rounded">Reset</button>
        </div>
      )}
    </div>
  );
};

export default ArtifactAcquisitionEngine;
