import { useState, useEffect } from 'react';
import CountUp from 'react-countup';

interface ReportCardProps {
    metrics: { original: number; finalLz4: number };
    onDownload?: () => void;
}

export default function ReportCardModal({ metrics, onDownload }: ReportCardProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (metrics.original > 0) {
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, [metrics]);

    if (isDismissed || metrics.original === 0) return null;

    const actualRatio = metrics.original / Math.max(1, metrics.finalLz4);

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 100) { 
            return `${(bytes / 1024).toFixed(2)} KB`;
        }
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const bytesSaved = Math.max(0, metrics.original - metrics.finalLz4);
    const gbSaved = bytesSaved / (1024 * 1024 * 1024);
    const enterpriseScale = 100_000_000; 
    const dollarsSaved = gbSaved * 2.50 * enterpriseScale;
    const co2Prevented = (gbSaved * 0.5 * enterpriseScale).toFixed(2);

    return (
        <div className={`absolute inset-0 z-[100] flex items-center justify-center bg-void/90 backdrop-blur-md transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-slate-950 border border-intelligence shadow-[0_0_50px_rgba(0,243,255,0.3)] w-[650px] p-8 font-mono relative transform transition-all duration-700 overflow-hidden">
                
                <div className="flex justify-between items-start border-b border-intelligence/30 pb-4 mb-6 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter text-intelligence uppercase italic">Operation Finalized</h2>
                        <div className="text-[10px] text-efficiency mt-1 tracking-[0.3em] font-bold opacity-70">SENTINEL PROTOCOL // EDGE ANALYTICS CORE</div>
                    </div>
                    
                    <div className="flex space-x-3">
                        {onDownload && (
                            <button 
                                onClick={onDownload}
                                className="bg-efficiency text-void px-4 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,65,0.4)]"
                            >
                                Download Artifact
                            </button>
                        )}
                        <button 
                            onClick={() => setIsDismissed(true)}
                            className="text-waste hover:text-white border border-waste hover:bg-waste/20 px-4 py-1 text-[10px] transition-all uppercase tracking-widest"
                        >
                            [ Terminate ]
                        </button>
                    </div>
                 </div>

                <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
                    <div className="bg-void/50 border-l-2 border-waste p-4">
                        <div className="text-waste/50 text-[9px] uppercase tracking-widest mb-1">Source Payload (Waste)</div>
                        <div className="text-waste font-bold text-2xl">{formatSize(metrics.original)}</div>
                    </div>
                    <div className="bg-void/50 border-l-2 border-efficiency p-4">
                        <div className="text-efficiency/50 text-[9px] uppercase tracking-widest mb-1">Induced Domain (FRACTAL)</div>
                        <div className="text-efficiency font-bold text-2xl">{formatSize(metrics.finalLz4)}</div>
                    </div>
                </div>

                <div className="bg-intelligence/5 border border-intelligence/20 p-6 mb-8 relative z-10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-intelligence">
                            <path d="M10 50 L90 50 M50 10 L50 90" strokeWidth="0.5"/>
                            <circle cx="50" cy="50" r="40" strokeWidth="0.5"/>
                        </svg>
                    </div>
                    
                    <div className="text-intelligence/50 text-[9px] uppercase tracking-[.4em] mb-4 border-b border-intelligence/10 pb-2">Payload Reduction Ratio</div>
                    <div className="flex justify-between items-center">
                        <div className="text-6xl font-black text-intelligence drop-shadow-[0_0_15px_rgba(0,243,255,0.6)]">
                            <CountUp end={actualRatio} decimals={2} duration={2.5} suffix="x" />
                        </div>
                        <div className="text-[11px] text-intelligence/70 text-right leading-relaxed max-w-[200px]">
                            <span className="text-intelligence font-bold">FSLP SUCCESS.</span><br/>
                            Grammar induction completed. High-entropy variables isolated and columnarized.
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 border-t border-intelligence/20 pt-6 relative z-10 gap-4">
                    <div className="flex flex-col">
                         <span className="text-[9px] text-efficiency/50 uppercase tracking-widest">Est. Carbon Offset</span>
                        <div className="text-lg text-white font-bold">{co2Prevented} kg <span className="text-[10px] font-normal text-gray-500">CO2 / Year</span></div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                         <span className="text-[9px] text-intelligence/50 uppercase tracking-widest">SaaS Arbitrage (Saved)</span>
                        <div className="text-lg text-intelligence font-bold">
                            ${Math.floor(dollarsSaved).toLocaleString()}
                            <span className="text-[10px] font-normal text-gray-500 ml-1">USD / Year</span>
                        </div>
                    </div>
                </div>
                
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b from-intelligence/5 to-transparent z-0"></div>
                <div className="absolute top-0 left-0 w-full h-[2px] bg-intelligence/20 animate-scan z-0"></div>
            </div>
        </div>
    );
}
