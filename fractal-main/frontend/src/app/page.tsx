import dynamic from 'next/dynamic';

const ClientCommandDeck = dynamic(() => import('../components/CommandDeck'), { 
    ssr: false, 
    loading: () => (
        <div className="h-full w-full flex flex-col items-center justify-center bg-void text-intelligence font-mono">
            <span className="animate-pulse tracking-widest text-xl">BOOTING FRACTAL WASM CORE...</span>
            <span className="text-[10px] text-efficiency mt-4 opacity-50 tracking-[0.5em]">SIES GST // B.TECH AIML '27</span>
        </div>
    )
});

export default function Page() {
  return (
    <main className="grid grid-rows-[60px_1fr_140px] w-full h-screen overflow-hidden bg-void">
        <header className="border-b border-waste/30 px-6 flex justify-between items-center bg-void text-intelligence font-mono z-50">
            <div className="flex items-center space-x-6">
                <h1 className="tracking-[0.2em] font-black text-xl">FR<span className="text-waste">▲</span>CTAL</h1>
                <div className="flex items-center space-x-2 border border-intelligence/30 px-3 py-1 bg-intelligence/5 cursor-help" title="Running on Local Client (Edge Mode)">
                    <div className="w-2 h-2 rounded-full bg-efficiency animate-pulse"></div>
                    <span className="text-[10px] tracking-widest text-intelligence uppercase">[ WASM CORE ONLINE ]</span>
                </div>
            </div>
        </header>

        <section className="relative w-full h-full overflow-hidden">
            <ClientCommandDeck />
        </section>
    </main>
  );
}
