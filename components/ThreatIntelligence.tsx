
import React from 'react';
import { ThreatEvent } from '../types';

interface ThreatIntelligenceProps {
  events: ThreatEvent[];
}

const ThreatIntelligence: React.FC<ThreatIntelligenceProps> = ({ events }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-30 flex-col gap-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <p className="text-[9px] mono uppercase tracking-widest">Aegis Perimeter: Intact</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 group hover:border-red-500/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    event.severity === 'CRITICAL' ? 'bg-red-500 animate-ping' : 
                    event.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-[10px] font-bold text-slate-300 mono">{event.type}</span>
                </div>
                <span className={`text-[8px] mono px-1.5 py-0.5 rounded border ${
                  event.status === 'BLOCKED' ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-cyan-500/30 text-cyan-500'
                }`}>
                  {event.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight mb-2">{event.description}</p>
              <div className="flex justify-between items-center text-[8px] mono text-slate-600">
                <span>SEV: {event.severity}</span>
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ThreatIntelligence;
