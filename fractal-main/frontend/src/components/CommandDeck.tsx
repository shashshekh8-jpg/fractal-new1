'use client';

import CanvasMatrixRain from './CanvasMatrixRain';
import SchemaConsole from './SchemaConsole';
import TheTrickleStream from './TheTrickleStream';
import Scoreboard from './Scoreboard';
import ReportCardModal from './ReportCardModal';
import { useFractal } from '../hooks/useFractal';
import { useState, useEffect, useRef } from 'react';

export default function CommandDeck() {
    const { isStreaming, processFileStream, executeSearch, hexStream, metrics, searchResult, templates, downloadArchive, progress, loadFractalArtifact } = useFractal();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [memoryUnsafe, setMemoryUnsafe] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const memoryMonitor = setInterval(() => {
            if (performance && (performance as any).memory) {
                setMemoryUnsafe((performance as any).memory.usedJSHeapSize > 838860800);
            }
        }, 500);
        return () => clearInterval(memoryMonitor);
    }, []);

    const handleSearch = (query: string) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            executeSearch(query);
        }, 300);
    };

    return (
        <div className="flex flex-col h-full w-full relative">
            {!isStreaming && metrics.original > 0 && <ReportCardModal metrics={metrics} onDownload={downloadArchive} />}

            {isStreaming && (
                <div className="absolute top-12 left-4 right-4 z-50 bg-void/95 border border-waste/50 p-3 shadow-[0_0_20px_rgba(255,69,58,0.2)] backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-end font-mono text-xs mb-2">
                        <div className="flex flex-col">
                            <span className="text-waste/70 tracking-widest uppercase text-[9px]">Ingestion Status</span>
                            <span className="text-waste font-bold tracking-widest">PROCESSING SHARD [{progress.percent.toFixed(1)}%]</span>
                        </div>
                        <div className="flex space-x-6 text-right">
                            <div className="flex flex-col">
                                <span className="text-intelligence/50 tracking-widest uppercase text-[9px]">Ingest Rate</span>
                                <span className="text-intelligence font-bold">{progress.mbPerSec.toFixed(2)} MB/s</span>
                            </div>
                            <div className="flex flex-col w-24">
                                <span className="text-efficiency/50 tracking-widest uppercase text-[9px]">Time Remaining</span>
                                <span className="text-efficiency font-bold">{Math.ceil(progress.etaSeconds)}s</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 overflow-hidden relative">
                        <div 
                            className="absolute top-0 left-0 h-full bg-waste transition-all duration-300 shadow-[0_0_10px_rgba(255,69,58,0.8)]" 
                            style={{ width: `${progress.percent}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="absolute top-2 right-4 z-50 flex space-x-3 items-center">
                <input type="text" placeholder="Search Logic..." onChange={(e) => handleSearch(e.target.value)} className="bg-void border border-intelligence text-efficiency font-mono text-xs p-1 outline-none focus:ring-1 focus:ring-intelligence placeholder-intelligence/50 w-48" />
                
                <label className="text-xs text-efficiency font-mono cursor-pointer border border-efficiency px-3 py-1 hover:bg-efficiency/10 transition-colors uppercase tracking-widest shadow-[0_0_10px_rgba(0,255,65,0.2)]">
                    Load .FRACTAL
                    <input type="file" accept=".fractal" onChange={(e) => { if(e.target.files?.[0]) loadFractalArtifact(e.target.files[0]) }} className="hidden" />
                </label>

                <label className="text-xs text-intelligence font-mono cursor-pointer border border-intelligence px-3 py-1 hover:bg-intelligence/10 transition-colors uppercase tracking-widest">
                    Load Shard
                    <input type="file" onChange={(e) => { if(e.target.files?.[0]) setSelectedFile(e.target.files[0]) }} className="hidden" />
                </label>

                <button
                    onClick={() => selectedFile && processFileStream(selectedFile)}
                    disabled={memoryUnsafe || !selectedFile || isStreaming}
                    className={`text-xs font-mono px-3 py-1 uppercase tracking-widest transition-all ${memoryUnsafe ? 'bg-waste/20 text-waste border-waste cursor-not-allowed' : 'bg-intelligence text-void hover:bg-intelligence/80 shadow-[0_0_10px_rgba(0,243,255,0.5)]'}`}
                >
                    {memoryUnsafe ? 'Memory Lock' : isStreaming ? 'Processing...' : 'Run Simulation'}
                </button>
            </div>

            <div className="grid grid-cols-[1fr_1.5fr_1fr] h-full border-b border-waste/30 w-full overflow-hidden">
                <div className="border-r border-waste/30 relative min-h-0">
                    <div className="absolute top-2 left-2 text-[10px] text-waste/50 font-mono tracking-widest uppercase z-10">/ / The Flood</div>
                    <CanvasMatrixRain isProcessing={isStreaming} />
                </div>

                <div className="relative bg-void/40 overflow-hidden min-h-0">
                    <div className="absolute top-2 left-2 text-[10px] text-intelligence/50 font-mono tracking-widest uppercase z-10">/ / Schema Induction</div>
                    <SchemaConsole templates={templates || []} />
                </div>

                {/* THE FIX IS HERE: CSS Grid locks are implemented below to force scrollbars */}
                <div className="border-l border-waste/30 relative flex flex-col min-h-0">
                    <div className="absolute top-2 left-2 text-[10px] text-efficiency/50 font-mono tracking-widest uppercase z-20">/ / The Trickle</div>
                    
                    <div className="relative flex-grow h-full w-full overflow-hidden">
                        <div className="absolute inset-0 pt-8">
                            <TheTrickleStream wasmBuffer={hexStream} searchResult={searchResult} />
                        </div>
                    </div>
                </div>
            </div>
            
            <Scoreboard metrics={metrics} isStreaming={isStreaming} />
        </div>
    );
}