use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

mod drain;
mod grammar;
mod clp;

// New struct for the UI that contains the specific template for each row
#[derive(Serialize)]
pub struct UILogHit {
    pub row_index: usize,
    pub temporal_delta: i64,
    pub variables: Vec<String>,
    pub template: String, 
}

#[derive(Serialize)]
pub struct SearchResultSet {
    pub rule_id: u32,
    pub template: String,
    pub total_hits: usize,
    pub hits: Vec<UILogHit>,
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

#[derive(Serialize)]
pub struct FractalEngineStateRef<'a> {
    drain_tree: &'a drain::DrainTree,
    schema_registry: &'a grammar::SchemaRegistry,
    columnar_batch: &'a clp::ColumnarBatch,
    last_timestamp: i64,
}

fn calculate_entropy(s: &str) -> f64 {
    if s.is_empty() { return 0.0; }
    let mut seen = [false; 256];
    let mut unique_count = 0;
    for b in s.bytes() {
        if !seen[b as usize] {
            seen[b as usize] = true;
            unique_count += 1;
        }
    }
    unique_count as f64 / s.len() as f64
}

#[wasm_bindgen]
pub struct FractalEngine {
    residual_buffer: Vec<u8>,
    drain_tree: drain::DrainTree,
    schema_registry: grammar::SchemaRegistry,
    columnar_batch: clp::ColumnarBatch,
    last_timestamp: i64,
}

impl FractalEngine {
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
    pub fn new(expected_size: usize) -> Self {
        console_error_panic_hook::set_once();
        let capacity_heuristic = expected_size / 120;

        Self {
            residual_buffer: Vec::with_capacity(1024 * 1024),
            drain_tree: drain::DrainTree::new(0.4),
            schema_registry: grammar::SchemaRegistry::new(),
            columnar_batch: clp::ColumnarBatch::with_capacity(capacity_heuristic),
            last_timestamp: 0,
        }
    }

    #[wasm_bindgen]
    pub fn ingest_chunk(&mut self, chunk: &[u8]) -> JsValue {
        let mut current_buffer = std::mem::take(&mut self.residual_buffer);
        current_buffer.extend_from_slice(chunk);

        let mut last_newline_idx = current_buffer.len();
        for i in (0..current_buffer.len()).rev() {
            if current_buffer[i] == b'\n' {
                last_newline_idx = i;
                break;
            }
        }

        let safe_slice = if last_newline_idx == current_buffer.len() {
            &current_buffer[..]
        } else {
            let slice = &current_buffer[..last_newline_idx];
            self.residual_buffer = current_buffer[last_newline_idx + 1..].to_vec();
            slice
        };

        let safe_str = String::from_utf8_lossy(safe_slice);
        let mut latest_rule = 0;
        let mut is_dup = false;

        for line in safe_str.lines() {
            let line = line.trim();
            if line.is_empty() { continue; }

            let current_time = if line.as_bytes().get(0).map_or(false, |&b| b.is_ascii_digit()) {
                Self::extract_iso_timestamp(line).unwrap_or(self.last_timestamp + 12)
            } else {
                self.last_timestamp + 12
            };

            let delta = current_time.saturating_sub(self.last_timestamp);
            self.last_timestamp = current_time;

            let (template_id, variables) = self.drain_tree.parse_and_extract(line);
            
            let mut has_high_entropy = false;
            for var in &variables {
                if calculate_entropy(var) > 0.75 { 
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
        
        let (raw_hits, global_template) = if target_rule_id != 0 {
            (
                self.columnar_batch.retrieve_records(target_rule_id),
                self.drain_tree.get_template_by_id(target_rule_id)
            )
        } else {
            let value_hits = self.columnar_batch.retrieve_records_by_value(query);
            
            if value_hits.is_empty() {
                let empty_res = SearchResultSet {
                    rule_id: 0,
                    template: String::from("No matches found"),
                    total_hits: 0,
                    hits: vec![],
                };
                return serde_wasm_bindgen::to_value(&empty_res).unwrap();
            }
            (value_hits, format!("Value Scan Match: {}", query))
        };

        // THE UI FIX: Map the raw hits to UILogHits by attaching the specific template to each row
        let ui_hits: Vec<UILogHit> = raw_hits.into_iter().map(|h| {
            UILogHit {
                row_index: h.row_index,
                temporal_delta: h.temporal_delta,
                variables: h.variables,
                template: self.drain_tree.get_template_by_id(h.rule_id),
            }
        }).collect();

        let result = SearchResultSet {
            rule_id: target_rule_id,
            template: global_template,
            total_hits: ui_hits.len(),
            hits: ui_hits
        };

        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    #[wasm_bindgen]
    pub fn export_compressed_archive(&self) -> Vec<u8> {
        let state = FractalEngineStateRef {
            drain_tree: &self.drain_tree,
            schema_registry: &self.schema_registry,
            columnar_batch: &self.columnar_batch,
            last_timestamp: self.last_timestamp,
        };
        
        // STREAMING FIX: Uses by-value streaming to eliminate the massive 500MB buffer spike
        let compressed = Vec::with_capacity(50 * 1024 * 1024); 
        let mut encoder = lz4_flex::frame::FrameEncoder::new(compressed);
        bincode::serialize_into(&mut encoder, &state).unwrap();
        
        // finish() correctly returns the underlying compressed Vec<u8>
        encoder.finish().unwrap()
    }

    #[wasm_bindgen]
    pub fn import_compressed_archive(&mut self, data: &[u8]) -> Result<(), JsValue> {
        let mut decoder = lz4_flex::frame::FrameDecoder::new(data);
        let state: FractalEngineState = bincode::deserialize_from(&mut decoder)
            .map_err(|_| JsValue::from_str("Deserialization failed. Artifact corrupted."))?;
        
        self.drain_tree = state.drain_tree;
        self.schema_registry = state.schema_registry;
        self.columnar_batch = state.columnar_batch;
        self.last_timestamp = state.last_timestamp;
        Ok(())
    }
}