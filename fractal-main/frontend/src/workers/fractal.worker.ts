let engine: any;
let isBooted = false;
let metrics = { original: 0, finalLz4: 0 };
let chunkCounter = 0;

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        try {
            const wasm = await import('core-engine');
            await wasm.default();
            
            engine = new wasm.FractalEngine(payload?.expectedSize || 0);
            isBooted = true;
            self.postMessage({ type: 'INIT_COMPLETE' });
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: 'Failed to initialize WASM engine' });
        }
    } 
    
    else if (type === 'PROCESS_CHUNK' && isBooted) {
        const { chunk, isFinal, chunkLength } = payload;
        chunkCounter++;

        const validBytes = chunk.slice(0, chunkLength);
        const topoUpdate = engine.ingest_chunk(validBytes);
        metrics.original += chunkLength;

        const shouldUpdateUI = chunkCounter % 50 === 0 || isFinal || (topoUpdate && topoUpdate.is_duplicate);

        if (shouldUpdateUI) {
            const inducedRules = engine.get_discovered_templates();
            self.postMessage({
                type: 'PROGRESS_UPDATE',
                payload: {
                    topology: topoUpdate,
                    templates: inducedRules,
                    metrics: { ...metrics }
                }
            });
        } else {
            self.postMessage({
                type: 'PROGRESS_UPDATE',
                payload: {
                    metrics: { ...metrics }
                }
            });
        }

        if (isFinal) {
            const uiStream = engine.export_ui_stream();
            metrics.finalLz4 = engine.get_final_archive_size();
            
            self.postMessage({ 
                type: 'PROCESS_COMPLETE', 
                payload: { 
                    finalMetrics: { ...metrics }, 
                    finalStream: uiStream 
                } 
            });
            
            metrics = { original: 0, finalLz4: 0 }; 
            chunkCounter = 0; 
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
         try {
             console.log(`🔍 [WASM BRIDGE] Executing search for: "${payload}"`);
             const result = engine.search_compressed_domain(payload);
             console.log(`🎯 [WASM BRIDGE] Found ${result.total_hits} hits!`, result);
             self.postMessage({ type: 'SEARCH_RESULT', payload: result });
         } catch (err) {
             console.error("❌ WASM Search Panic:", err);
         }
    } 
    
    else if (type === 'EXPORT' && isBooted) {
         try {
             const archive = engine.export_compressed_archive();
             
             // The bulletproof copy: sever the link to WASM memory
             const safeBuffer = new Uint8Array(archive.length);
             safeBuffer.set(archive);
             
             self.postMessage({ type: 'EXPORT_COMPLETE', payload: safeBuffer });
         } catch (err) {
             console.error("❌ WASM Export Panic (Likely OOM):", err);
         }
    }
};