
import React from 'react';
import { SubjectCluster } from '../types';

interface ClusterViewProps {
  clusters: SubjectCluster[];
}

const ClusterView: React.FC<ClusterViewProps> = ({ clusters }) => {
  if (clusters.length === 0) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-6">
        <div className="p-8 bg-slate-900 rounded-full border border-slate-800 opacity-20">
           <svg xmlns="http://www.w3.org/2000/00/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <p className="text-slate-500 mono text-sm uppercase tracking-widest">No clustered subjects detected. Run analysis in Clustering Mode.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusters.map((cluster) => (
          <div key={cluster.subjectId} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/50 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3">
               <span className="bg-cyan-500 text-slate-950 px-2 py-0.5 rounded text-[8px] font-bold mono uppercase">Freq: {cluster.appearanceCount}</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold mono text-cyan-400">{cluster.subjectId}</h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Confidence: {Math.round(cluster.avgConfidence * 100)}%</p>
              </div>
            </div>

            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-2 text-[10px] mono">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800/50">
                     <p className="text-slate-600 uppercase text-[8px] mb-1">Age Est.</p>
                     <p className="text-slate-300">{cluster.metadata.estimatedAge || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800/50">
                     <p className="text-slate-600 uppercase text-[8px] mb-1">Dominant Emotion</p>
                     <p className="text-slate-300">{cluster.metadata.emotion || 'NEUTRAL'}</p>
                  </div>
               </div>

               <div>
                  <p className="text-[8px] text-slate-600 uppercase mono mb-2 tracking-widest">Active Modalities</p>
                  <div className="flex flex-wrap gap-1">
                     {cluster.dominantSignals?.map(sig => (
                       <span key={sig} className="px-2 py-0.5 bg-slate-800 rounded text-[8px] text-slate-400 border border-slate-700">{sig}</span>
                     ))}
                  </div>
               </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
               <div className="text-[8px] mono text-slate-500">
                  REF_TS: {cluster.firstSeen}
               </div>
               <button className="text-[9px] text-cyan-500 hover:text-cyan-400 font-bold uppercase tracking-widest">View Samples</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClusterView;
