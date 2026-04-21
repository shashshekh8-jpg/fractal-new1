import { useState, useCallback, useRef, useEffect } from 'react';

const CHUNK_SIZE_LIMIT = 10 * 1024 * 1024; // Strict 10MB chunking limit

export const useFractal = () => {
    const workerRef = useRef<Worker | null>(null);
    const totalSizeRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const [isBooted, setIsBooted] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [hexStream, setHexStream] = useState<Uint8Array>(new Uint8Array());
    const [topology, setTopology] = useState({ nodes: [], links: [], pulseTarget: null });
    const [metrics, setMetrics] = useState({ original: 0, finalLz4: 0 });
    const [searchResult, setSearchResult] = useState<any>(null);
    const [templates, setTemplates] = useState<string[]>([]);
    const [progress, setProgress] = useState({ percent: 0, etaSeconds: 0, mbPerSec: 0 });

    useEffect(() => {
        workerRef.current = new Worker(new URL('../workers/fractal.worker.ts', import.meta.url), { type: 'module' });
        
        workerRef.current.onmessage = async (e) => {
            const { type, payload } = e.data;
            
            if (type === 'INIT_COMPLETE') {
                console.log("✅ WORKER BOOTED: WASM engine is ready.");
                setIsBooted(true);
            }
            
            else if (type === 'PROGRESS_UPDATE') {
                // Algorithmic Honesty: Update metrics and topology in real-time
                if (payload.topology?.is_duplicate) {
                    setTopology(prev => ({ ...prev, pulseTarget: payload.topology.target_rule_id }));
                }
                
                // Only update templates if they are sent (respecting the UI throttle)
                if (payload.templates) setTemplates(payload.templates);
                if (payload.hexStream) setHexStream(payload.hexStream); 
                
                setMetrics(payload.metrics);

                const processedBytes = payload.metrics.original;
                const totalBytes = totalSizeRef.current;
                const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
                
                const bytesPerSec = elapsedSeconds > 0 ? processedBytes / elapsedSeconds : 0;
                const remainingBytes = totalBytes - processedBytes;
                const eta = bytesPerSec > 0 ? remainingBytes / bytesPerSec : 0;

                setProgress({
                    percent: totalBytes > 0 ? Math.min(100, (processedBytes / totalBytes) * 100) : 0,
                    etaSeconds: Math.max(0, eta),
                    mbPerSec: bytesPerSec / (1024 * 1024)
                });
            }
            
            else if (type === 'PROCESS_COMPLETE') {
                console.log("🏁 INGESTION COMPLETE.");
                setIsStreaming(false);
                setProgress(prev => ({ ...prev, percent: 100, etaSeconds: 0 }));
                setHexStream(payload.finalStream);
                setMetrics(payload.finalMetrics);
                
                try {
                    const hashBuffer = await crypto.subtle.digest('SHA-256', payload.finalStream);
                    const schemaHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                    
                    await fetch('/api/ingest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            originalSize: payload.finalMetrics.original,
                            compressedSize: payload.finalMetrics.finalLz4,
                            hash: schemaHash
                        })
                    });
                } catch (err) {
                    console.error("❌ Telemetry Sync Failed:", err);
                }
            }

            else if (type === 'IMPORT_COMPLETE') {
                setIsStreaming(false);
                setTemplates(payload.templates);
                setHexStream(payload.hexStream);
                setMetrics(payload.metrics);
                setProgress({ percent: 100, etaSeconds: 0, mbPerSec: 0 });
            }
            
            else if (type === 'SEARCH_RESULT') setSearchResult(payload);
            
            else if (type === 'EXPORT_COMPLETE') {
                const blob = new Blob([payload], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `sentinel_shard_${Date.now()}.fractal`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            else if (type === 'ERROR') {
                console.error("❌ Worker Threw Error:", payload);
            }
        };

        // Basic boot without size hint
        workerRef.current.postMessage({ type: 'INIT' });
        
        return () => workerRef.current?.terminate();
    }, []);

    const executeSearch = useCallback((query: string) => {
        if (query.length >= 2) workerRef.current?.postMessage({ type: 'SEARCH', payload: query });
        else if (query.length === 0) setSearchResult(null);
    }, []);

    const downloadArchive = useCallback(() => {
        workerRef.current?.postMessage({ type: 'EXPORT' });
    }, []);

    const loadFractalArtifact = useCallback(async (file: File) => {
        if (!isBooted) return;
        setIsStreaming(true);
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        workerRef.current?.postMessage({ type: 'IMPORT_ARCHIVE', payload: uint8 });
    }, [isBooted]);

    const processFileStream = useCallback(async (file: File) => {
        if (!isBooted) return;

        // PRE-ALLOCATION OPTIMIZATION: 
        // Re-initialize the engine with the exact file size to prevent memory relocation decay.
        workerRef.current?.postMessage({ 
            type: 'INIT', 
            payload: { expectedSize: file.size } 
        });

        setIsStreaming(true);
        setTemplates([]);
        setMetrics({ original: 0, finalLz4: 0 });
        
        totalSizeRef.current = file.size;
        startTimeRef.current = Date.now();
        setProgress({ percent: 0, etaSeconds: 0, mbPerSec: 0 });

        const reader = file.stream().getReader();
        let accumulator = new Uint8Array(CHUNK_SIZE_LIMIT);
        let accLength = 0;

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                if (accLength > 0) {
                    workerRef.current?.postMessage({
                        type: 'PROCESS_CHUNK',
                        payload: { chunk: accumulator, isFinal: true, chunkLength: accLength }
                    });
                }
                break;
            }

            if (accLength + value.length < CHUNK_SIZE_LIMIT) {
                accumulator.set(value, accLength);
                accLength += value.length;
                continue;
            }

            workerRef.current?.postMessage({
                type: 'PROCESS_CHUNK',
                payload: { chunk: accumulator, isFinal: false, chunkLength: accLength }
            });

            accumulator = new Uint8Array(CHUNK_SIZE_LIMIT);
            accumulator.set(value, 0);
            accLength = value.length;
        }
    }, [isBooted]);

    return { 
        isBooted, isStreaming, processFileStream, executeSearch, 
        hexStream, topology, metrics, searchResult, templates, downloadArchive, progress, loadFractalArtifact
    };
};