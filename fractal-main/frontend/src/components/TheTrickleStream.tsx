import { useEffect, useState } from 'react';

interface LogHit {
    row_index: number;
    temporal_delta: number;
    variables: string[];
    template: string; 
}

interface SearchResultSet {
    rule_id: number;
    template: string;
    total_hits: number;
    hits: LogHit[];
}

export default function TheTrickleStream({ wasmBuffer, searchResult }: { wasmBuffer: Uint8Array, searchResult: SearchResultSet | null }) {
    if (!searchResult) {
        return (
            <div className="w-full h-full p-4 bg-void text-efficiency font-mono text-[10px] opacity-50 flex flex-col items-center justify-center">
                <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Awaiting Query...</span>
            </div>
        );
    }

    return (
        // THE FIX: Added `overflow-hidden` here to enforce the height boundary
        <div className="w-full h-full bg-void flex flex-col font-mono relative overflow-hidden">
            
            {/* The Header (Stays Fixed) */}
            <div className="bg-intelligence/10 border-b border-intelligence/30 p-3 flex justify-between items-center z-10 shrink-0">
                <div>
                    <div className="text-[9px] text-intelligence/60 tracking-widest uppercase mb-1">Target Schema Extracted</div>
                    <div className="text-xs text-intelligence font-bold">
                        {searchResult.rule_id === 0 ? searchResult.template.toUpperCase() : `RULE_${searchResult.rule_id.toString().padStart(3, '0')}`}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-intelligence/60 tracking-widest uppercase mb-1">Occurrences Found</div>
                    <div className="text-xs text-intelligence font-bold">{searchResult.total_hits} MATCHES</div>
                </div>
            </div>

            {/* The Scrollable Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-2">
                {searchResult.hits.map((hit, i) => (
                    <div key={i} className="bg-void border border-waste/30 p-2 hover:border-waste transition-colors group">
                        <div className="flex justify-between items-center mb-2 border-b border-waste/10 pb-1">
                            <span className="text-[9px] text-waste/60 tracking-widest">ROW_IDX: {hit.row_index}</span>
                            <span className="text-[9px] bg-waste/10 text-waste px-2 py-0.5 border border-waste/20">
                                +{hit.temporal_delta}ms DELTA
                            </span>
                        </div>
                        <div className="text-[11px] text-gray-300 leading-relaxed break-all">
                             {hit.template.split('<*>').map((part, index, array) => (
                                <span key={index}>
                                    {part}
                                    {index !== array.length - 1 && (
                                        <span className="text-intelligence font-bold bg-intelligence/10 border border-intelligence/30 px-1 mx-1">
                                            {hit.variables && hit.variables[index] ? hit.variables[index] : '[VAR_OMITTED]'}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
                
                {searchResult.total_hits >= 100 && (
                    <div className="text-center p-2 text-[9px] text-waste/50 uppercase tracking-widest border border-dashed border-waste/30">
                        Results truncated at 100 to maintain UI performance.
                    </div>
                )}
                
                {/* Safe spacing at the bottom of the scroll */}
                <div className="h-6 w-full shrink-0"></div>
            </div>
        </div>
    );
}