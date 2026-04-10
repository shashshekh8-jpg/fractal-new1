'use client';

import CountUp from 'react-countup';
import { useMemo } from 'react';

interface ScoreboardProps {
    metrics: { original: number; finalLz4: number };
    isStreaming?: boolean;
}

export default function Scoreboard({ metrics, isStreaming = false }: ScoreboardProps) {
    const stats = useMemo(() => {
        const original = metrics.original || 0;
        const final = metrics.finalLz4 || 0;
        
        const ratio = original > 0 ? original / Math.max(1, final) : 0;
       
        const bytesSaved = Math.max(0, original - final);
        const gbSaved = bytesSaved / (1024 * 1024 * 1024);
        const enterpriseScale = 100_000_000; 
        
        const dollarsSaved = gbSaved * 2.50 * enterpriseScale;
        const co2Prevented = gbSaved * 0.5 * enterpriseScale;

        const gzipSimulatedFill = original > 0 ? 100 : 0; 
        const fractalRealFill = original > 0 ? (final / original) * 100 : 0;

        return {
            ratio,
            dollarsSaved,
            co2Prevented,
            gzipSimulatedFill,
            fractalRealFill
        };
    }, [metrics]);

    return (
        <div className="h-[140px] w-full grid grid-cols-3 gap-4 border-t border-intelligence/30 bg-void p-4 font-mono text-xs text-intelligence shadow-[0_-10px_30px_rgba(0,243,255,0.05)]">
            <div className="flex flex-col justify-center space-y-2 border-r border-intelligence/10 pr-4">
                <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Payload Density Comparison</div>
                <div className="relative w-full h-5 bg-slate-900 border border-waste/30 overflow-hidden">
                    <div className="h-full bg-waste/80 transition-all duration-500" style={{ width: `${stats.gzipSimulatedFill}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold tracking-tighter uppercase">Standard GZIP (Inefficient)</span>
                 </div>
                <div className="relative w-full h-5 bg-slate-900 border border-efficiency/30 overflow-hidden">
                    <div className="h-full bg-efficiency/80 transition-all duration-1000" style={{ width: `${stats.fractalRealFill}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-void font-bold text-[9px] tracking-tighter uppercase">FRACTAL FSLP (Induced)</span>
                 </div>
                <div className="text-center text-xl font-black text-intelligence drop-shadow-[0_0_10px_rgba(0,243,255,0.4)]">
                    <CountUp end={stats.ratio} decimals={2} duration={2} suffix="x Efficiency" />
                </div>
            </div>

            <div className="flex flex-col items-center justify-center border-r border-intelligence/10">
                <div className="text-gray-500 text-[10px] tracking-[0.3em] mb-2 uppercase italic">Projected Annual Arbitrage</div>
                <div className={`text-5xl font-black text-intelligence ${isStreaming ? 'animate-pulse' : ''} drop-shadow-[0_0_15px_rgba(0,243,255,0.3)]`}>
                    $<CountUp end={stats.dollarsSaved} decimals={0} duration={2.5} separator="," preserveValue={true} />
                </div>
                <div className="text-[9px] text-intelligence/40 mt-1">EST. COST OFFSET (USD)</div>
            </div>

            <div className="flex flex-col items-center justify-center">
                <div className="text-gray-500 text-[10px] tracking-[0.3em] mb-2 uppercase italic">GreenOps Carbon Offset</div>
                <div className="flex items-center space-x-3 text-4xl font-black text-efficiency drop-shadow-[0_0_15px_rgba(0,255,65,0.3)]">
                    <CountUp end={stats.co2Prevented} decimals={1} duration={2.5} preserveValue={true} />
                    <span className="text-sm font-normal opacity-60">kg/yr</span>
                </div>
                <div className="text-[9px] text-efficiency/40 mt-1 uppercase tracking-widest">Atmospheric Carbon Reduction</div>
            </div>
         </div>
    );
}
