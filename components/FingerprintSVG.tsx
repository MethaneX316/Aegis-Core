
import React, { useMemo } from 'react';

interface FingerprintSVGProps {
  progress: number;
  isLocked: boolean;
  status: 'IDLE' | 'WAITING' | 'PLACED' | 'ACQUIRING' | 'SUCCESS' | 'FAIL' | 'ABORTED';
}

const FingerprintSVG: React.FC<FingerprintSVGProps> = ({ progress, isLocked, status }) => {
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

  const isSuccess = status === 'SUCCESS';
  const isActive = status === 'ACQUIRING' || status === 'PLACED' || isSuccess;

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.1)] overflow-visible relative z-10 scale-100">
        <defs>
          <filter id="ridge-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {ridges.map((ridge) => {
          const threshold = (ridge.id / ridges.length) * 100;
          const isScanned = progress >= threshold;
          
          let strokeColor = '#0a0f14';
          if (isSuccess) strokeColor = '#22c55e';
          else if (isScanned && isActive) strokeColor = '#22d3ee';
          else if (isActive) strokeColor = '#1e293b';

          return (
            <path
              key={ridge.id}
              d={`M ${50 + ridge.rx} 60 A ${ridge.rx} ${ridge.ry} 0 1 1 ${50 - ridge.rx} 60`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={ridge.dash}
              strokeDashoffset={isActive ? 0 : ridge.dash}
              style={{
                transform: `rotate(${ridge.rotation}deg)`,
                transformOrigin: '50px 60px',
                transition: 'stroke 0.4s ease, stroke-dashoffset 0.8s ease-in-out',
                filter: isScanned && isActive ? 'url(#ridge-glow)' : 'none',
                opacity: isScanned && isActive ? 0.9 : (isActive ? 0.3 : 0.05)
              }}
            />
          );
        })}

        {isActive && !isSuccess && (
          <line 
            x1="0" y1={progress * 1.2} x2="100" y2={progress * 1.2} 
            stroke="#22d3ee" 
            strokeWidth="3"
            className="opacity-70 transition-all duration-300 shadow-[0_0_15px_#22d3ee]"
          />
        )}
      </svg>

      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-32 bg-green-500/10 rounded-full border border-green-500/20 animate-ping opacity-20"></div>
        </div>
      )}
    </div>
  );
};

export default FingerprintSVG;
