export default function SchemaConsole({ templates }: { templates: string[] }) {
    return (
        <div className="h-full w-full bg-void border-x border-waste/20 font-mono p-4 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] text-intelligence mb-4 tracking-[0.3em] uppercase opacity-50 flex justify-between items-center">
                <span>Induced Schema Registry</span>
                <span className="text-efficiency animate-pulse">● Live Induction</span>
            </div>
            
            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-4/5 text-waste/20 text-xs space-y-2 uppercase tracking-widest">
                    <div className="w-8 h-8 border border-waste/20 border-t-waste animate-spin rounded-full"></div>
                    <span>Waiting for Ingest Stream...</span>
                </div>
            ) : (
                <div className="space-y-3">
                    {templates.map((t, i) => (
                        <div key={i} className="group border-b border-intelligence/5 pb-2 animate-in fade-in slide-in-from-left duration-500">
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-[9px] px-1 bg-intelligence/10 text-intelligence border border-intelligence/30">
                                    RULE_{i.toString().padStart(3, '0')}
                                </span>
                                <div className="h-[1px] flex-grow bg-intelligence/10 group-hover:bg-efficiency/30 transition-colors"></div>
                             </div>
                            <div className="text-[11px] text-intelligence/90 break-all leading-relaxed pl-2 border-l border-intelligence/20 group-hover:border-efficiency transition-colors">
                                {t.replace(/<[*]>/g, '███')} 
                            </div>
                        </div>
                    ))}
                    <div className="h-20" />
                </div>
            )}
        </div>
    );
}
