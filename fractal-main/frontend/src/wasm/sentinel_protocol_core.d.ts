/* tslint:disable */
/* eslint-disable */

export class FractalEngine {
    free(): void;
    [Symbol.dispose](): void;
    export_compressed_archive(): Uint8Array;
    export_ui_stream(): Uint8Array;
    get_discovered_templates(): any;
    get_final_archive_size(): number;
    import_compressed_archive(data: Uint8Array): void;
    ingest_chunk(chunk: Uint8Array): any;
    constructor(expected_size: number);
    search_compressed_domain(query: string): any;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_fractalengine_free: (a: number, b: number) => void;
    readonly fractalengine_export_compressed_archive: (a: number) => [number, number];
    readonly fractalengine_export_ui_stream: (a: number) => [number, number];
    readonly fractalengine_get_discovered_templates: (a: number) => any;
    readonly fractalengine_get_final_archive_size: (a: number) => number;
    readonly fractalengine_import_compressed_archive: (a: number, b: number, c: number) => [number, number];
    readonly fractalengine_ingest_chunk: (a: number, b: number, c: number) => any;
    readonly fractalengine_new: (a: number) => number;
    readonly fractalengine_search_compressed_domain: (a: number, b: number, c: number) => any;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
