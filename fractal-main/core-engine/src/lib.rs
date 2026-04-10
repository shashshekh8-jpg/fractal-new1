
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

mod drain;
mod grammar;
mod clp;

#[derive(Serialize)]
pub struct SearchResultSet {
    pub rule_id: u32,
    pub template: String,
    pub total_hits: usize,
    pub hits: Vec<clp::LogHit>,
}

#[derive(Serialize)]
pub struct TopologyUpdate {
    pub is_duplicate: bool,
    pub target_rule_id: u32,
}

#[derive(Serialize, Deserialize)]
pub struct FractalEngineState {
    drain_tree: drain::DrainTree,
    schema_registry: grammar::SchemaRegistry,
    columnar_batch: clp::ColumnarBatch,
    last_timestamp: i64,
}

#[wasm_bindgen]
pub struct FractalEngine {
    ingestion_buffer: Vec<u8>,
    residual_buffer: Vec<u8>,
    drain_tree: drain::DrainTree,
    schema_registry: grammar::SchemaRegistry,
    columnar_batch: clp::ColumnarBatch,
    last_timestamp: i64,
}

#[wasm_bindgen]
pub fn get_wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}

impl FractalEngine {
    fn calculate_entropy(s: &str) -> f64 {
        if s.is_empty() { return 0.0; }
        let mut chars: Vec<char> = s.chars().collect();
        chars.sort_unstable();
        chars.dedup();
        chars.len() as f64 / s.len() as f64
    }

    fn extract_iso_timestamp(line: &str) -> Option<i64> {
        let tokens: Vec<&str> = line.split_whitespace().collect();
        for token in tokens {
            if token.contains('T') && token.contains('Z') {
                let digits: String = token.chars().filter(|c| c.is_ascii_digit()).collect();
                return digits.parse::<i64>().ok();
            }
            if let Ok(num) = token.parse::<i64>() {
                return Some(num);
            }
        }
        None
    }
}

#[wasm_bindgen]
impl FractalEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        Self {
            ingestion_buffer: Vec::new(),
            residual_buffer: Vec::new(),
            drain_tree: drain::DrainTree::new(0.4),
            schema_registry: grammar::SchemaRegistry::new(),
            columnar_batch: clp::ColumnarBatch::new(),
            last_timestamp: 0,
        }
    }

    #[wasm_bindgen]
    pub fn alloc_buffer(&mut self, size: usize) -> *mut u8 {
        self.ingestion_buffer.resize(size, 0);
        self.ingestion_buffer.as_mut_ptr()
    }

    #[wasm_bindgen]
    pub fn process_shared_buffer(&mut self, size: usize, is_final_chunk: bool) -> JsValue {
        let mut chunk = std::mem::take(&mut self.residual_buffer);
        chunk.extend_from_slice(&self.ingestion_buffer[..size]);

        let mut last_newline_idx = chunk.len();
        for i in (0..chunk.len()).rev() {
            if chunk[i] == b'n' {
                last_newline_idx = i;
                break;
            }
        }

        let safe_slice = if is_final_chunk || last_newline_idx == chunk.len() {
            self.residual_buffer.clear();
            &chunk[..]
        } else {
            let slice = &chunk[..last_newline_idx];
            self.residual_buffer = chunk[last_newline_idx + 1..].to_vec();
            slice
        };

        let safe_str = String::from_utf8_lossy(safe_slice);
        let mut latest_rule = 0;
        let mut is_dup = false;

        for line in safe_str.lines() {
            if line.trim().is_empty() { continue; }

            let current_time = Self::extract_iso_timestamp(line).unwrap_or(self.last_timestamp + 12);
            let delta = current_time.saturating_sub(self.last_timestamp);
            self.last_timestamp = current_time;

            let (template_id, variables) = self.drain_tree.parse_and_extract(line);
            
            let mut has_high_entropy = false;
            for var in &variables {
                if Self::calculate_entropy(var) > 0.75 { 
                    has_high_entropy = true;
                    break;
                }
            }

            let (fslp_rule_id, duplicate) = if has_high_entropy {
                (template_id, false) 
            } else {
                self.schema_registry.induce_fslp(template_id, !variables.is_empty())
            };

            self.columnar_batch.insert_encoded_log(fslp_rule_id, variables, delta);
            latest_rule = fslp_rule_id;
            if duplicate { is_dup = true; }
        }

        let topo = TopologyUpdate { is_duplicate: is_dup, target_rule_id: latest_rule };
        serde_wasm_bindgen::to_value(&topo).unwrap()
    }

    #[wasm_bindgen]
    pub fn get_discovered_templates(&self) -> JsValue {
        let templates = self.drain_tree.get_all_templates();
        serde_wasm_bindgen::to_value(&templates).unwrap()
    }

    #[wasm_bindgen]
    pub fn export_ui_stream(&self) -> Vec<u8> {
        self.columnar_batch.get_raw_columns()
    }

    #[wasm_bindgen]
    pub fn get_final_archive_size(&self) -> usize {
        self.columnar_batch.compress_columns().len()
    }

    #[wasm_bindgen]
    pub fn search_compressed_domain(&self, query: &str) -> JsValue {
        let target_rule_id = self.drain_tree.find_template_by_query(query);
        
        if target_rule_id == 0 {
            return JsValue::NULL;
        }

        let hits = self.columnar_batch.retrieve_records(target_rule_id);
        let template = self.drain_tree.get_template_by_id(target_rule_id);

        let result = SearchResultSet {
            rule_id: target_rule_id,
            template,
            total_hits: hits.len(),
            hits
        };

        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    #[wasm_bindgen]
    pub fn export_compressed_archive(&self) -> Vec<u8> {
        let state = FractalEngineState {
            drain_tree: self.drain_tree.clone(),
            schema_registry: self.schema_registry.clone(),
            columnar_batch: self.columnar_batch.clone(),
            last_timestamp: self.last_timestamp,
        };
        let encoded: Vec<u8> = bincode::serialize(&state).unwrap();
        lz4_flex::compress_prepend_size(&encoded)
    }

    #[wasm_bindgen]
    pub fn import_compressed_archive(&mut self, data: &[u8]) -> Result<(), JsValue> {
        let decompressed = lz4_flex::decompress_size_prepended(data)
            .map_err(|_| JsValue::from_str("Decompression failed. Invalid FRACTAL file."))?;
        
        let state: FractalEngineState = bincode::deserialize(&decompressed)
            .map_err(|_| JsValue::from_str("Deserialization failed. Artifact corrupted."))?;
        
        self.drain_tree = state.drain_tree;
        self.schema_registry = state.schema_registry;
        self.columnar_batch = state.columnar_batch;
        self.last_timestamp = state.last_timestamp;
        
        Ok(())
    }
}
