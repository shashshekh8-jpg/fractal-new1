import init, { FractalEngine, get_wasm_memory } from '../wasm/sentinel_protocol_core.js';

let engine: any = null;
let isBooted = false;
let metrics = { original: 0, finalLz4: 0 };

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'BOOT') {
        try {
            await init('/wasm/sentinel_protocol_core_bg.wasm');
            engine = new FractalEngine();
            isBooted = true;
            self.postMessage({ type: 'BOOT_COMPLETE' });
        } catch (err) {
            console.error("WASM Boot Failure:", err);
            self.postMessage({ type: 'ERROR', payload: err });
        }
    } 
    
    else if (type === 'PROCESS_CHUNK' && isBooted) {
        const { chunk, isFinal, chunkLength } = payload;
        
        const ptr = engine.alloc_buffer(chunkLength);
        const memoryView = new Uint8Array(get_wasm_memory().buffer, ptr, chunkLength);
        memoryView.set(chunk.slice(0, chunkLength));

        const topoUpdate = engine.process_shared_buffer(chunkLength, isFinal);
        const inducedRules = engine.get_discovered_templates();
        const uiStream = engine.export_ui_stream();
        
        metrics.original += chunkLength;
        metrics.finalLz4 = engine.get_final_archive_size();

        self.postMessage({
            type: 'CHUNK_PROCESSED',
            payload: {
                topology: topoUpdate,
                templates: inducedRules,
                hexStream: uiStream,
                metrics: { ...metrics }
            }
        });

        if (isFinal) {
            self.postMessage({ type: 'PROCESS_COMPLETE', payload: { finalMetrics: { ...metrics }, finalStream: uiStream } });
            metrics = { original: 0, finalLz4: 0 }; 
        }
    } 
    
    else if (type === 'IMPORT_ARCHIVE' && isBooted) {
        try {
            engine.import_compressed_archive(payload);
            const inducedRules = engine.get_discovered_templates();
            const uiStream = engine.export_ui_stream();
            
            self.postMessage({
                type: 'IMPORT_COMPLETE',
                payload: {
                    templates: inducedRules,
                    hexStream: uiStream,
                    metrics: { original: payload.length * 85, finalLz4: payload.length } 
                }
            });
        } catch (err) {
            self.postMessage({ type: 'ERROR', payload: 'Invalid .fractal archive' });
        }
    }
    
    else if (type === 'SEARCH' && isBooted) {
         const result = engine.search_compressed_domain(payload);
         self.postMessage({ type: 'SEARCH_RESULT', payload: result });
    } 
    
    else if (type === 'EXPORT' && isBooted) {
         const archive = engine.export_compressed_archive();
         self.postMessage({ type: 'EXPORT_RESULT', payload: archive });
    }
};
