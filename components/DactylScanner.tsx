import React, { useMemo } from 'react';

interface DactylScannerProps {
  progress: number;
  status: 'IDLE' | 'WAITING_FOR_SENSOR' | 'ACQUIRING' | 'ANALYZING' | 'LIVENESS_VERIFICATION' | 'SUCCESS' | 'ERROR';
  isFingerPresent: boolean;
}

const DactylScanner: React.FC<DactylScannerProps> = ({ progress, status, isFingerPresent }) => {
  const ridges = useMemo(() => {
    const paths = [];
    const count = 22;
    for (let i = 1; i <= count; i++) {
      const rx = i * 2.5;
      const ry = i * 3.5;
      const rot = (Math.sin(i * 0.3) * 12);
      const dash = 180 + Math.random() * 100;
      paths.push({ id: i, rx, ry, rotation: rot, dash });
    }
    return paths;
  }, []);

  const isAcquiring = ['ACQUIRING', 'ANALYZING', 'LIVENESS_VERIFICATION'].includes(status);
  const isMatch = status === 'SUCCESS';

  return (
    <div className={`relative w-64 h-72 flex flex-col items-center justify-center bg-slate-950/40 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden p-6 ${
      isFingerPresent || isMatch ? 'border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.15)]' : 'border-slate-800'
    }`}>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>

      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.1)] overflow-visible relative z-10 scale-95">
        <defs>
          <filter id="ridge-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {ridges.map((ridge) => {
          const threshold = (ridge.id / ridges.length) * 100;
          const isScanned = progress >= threshold;
          return (
            <path
              key={ridge.id}
              d={`M ${50 + ridge.rx} 60 A ${ridge.rx} ${ridge.ry} 0 1 1 ${50 - ridge.rx} 60`}
              fill="none"
              stroke={isMatch ? '#22c55e' : (isScanned && isFingerPresent ? 'var(--primary)' : (isFingerPresent ? '#1e293b' : '#0a0f14'))}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeDasharray={ridge.dash}
              strokeDashoffset={isFingerPresent || isMatch ? 0 : ridge.dash}
              style={{
                transform: `rotate(${ridge.rotation}deg)`,
                transformOrigin: '50px 60px',
                transition: 'stroke 0.4s ease, stroke-dashoffset 0.8s ease-in-out',
                filter: (isScanned && isFingerPresent) || isMatch ? 'url(#ridge-glow)' : 'none',
                opacity: (isScanned && isFingerPresent) || isMatch ? 0.9 : (isFingerPresent ? 0.3 : 0.05)
              }}
            />
          );
        })}

        {(isAcquiring || isMatch) && (
          <line 
            x1="0" y1={isMatch ? 120 : (progress * 1.2)} x2="100" y2={isMatch ? 120 : (progress * 1.2)} 
            stroke={isMatch ? '#22c55e' : 'var(--primary)'} 
            strokeWidth="2.5"
            className="opacity-80 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          />
        )}
      </svg>

      <div className="absolute inset-x-0 bottom-6 flex flex-col items-center z-20">
        <div className={`flex items-center gap-2 bg-slate-950/95 px-3 py-1 rounded-full border shadow-2xl transition-colors ${isMatch ? 'border-green-500/50' : 'border-slate-800'}`}>
          <span className={`text-[14px] font-bold mono tracking-tighter ${isMatch ? 'text-green-500' : isFingerPresent ? 'text-cyan-400' : 'text-slate-700'}`}>
            {Math.round(progress)}%
          </span>
          <div className="w-px h-3 bg-slate-800" />
          <span className="text-[7px] text-slate-500 mono uppercase font-bold tracking-[0.3em]">{isMatch ? 'SIGNAL_VERIFIED' : 'SIGNAL_LOCK'}</span>
        </div>
      </div>

      {isMatch && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 backdrop-blur-[4px] rounded-[2.5rem] animate-in zoom-in-95 duration-500 z-30 border-2 border-green-500/40">
           <div className="text-center bg-slate-950/95 px-5 py-3 rounded-2xl border border-green-500/50 shadow-2xl">
             <p className="text-[10px] text-green-500 font-bold mono tracking-[0.4em] uppercase">V_SYNC_OK</p>
             <p className="text-[7px] text-green-800 mono mt-1">HANDSHAKE_COMPLETE</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default DactylScanner;