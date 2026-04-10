
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct LogHit {
    pub row_index: usize,
    pub temporal_delta: i64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ColumnarBatch {
    pub encoded_rules: Vec<u32>,
    pub variables_packed: Vec<f64>,
    pub temporal_deltas: Vec<i64>,
}

impl ColumnarBatch {
    pub fn new() -> Self {
        Self {
            encoded_rules: Vec::new(),
            variables_packed: Vec::new(),
            temporal_deltas: Vec::new(),
        }
    }

    pub fn insert_encoded_log(&mut self, rule_id: u32, vars: Vec<String>, delta: i64) {
        self.encoded_rules.push(rule_id);
        self.temporal_deltas.push(delta);
        for var in vars {
            if let Ok(num) = var.parse::<f64>() {
                self.variables_packed.push(num);
            }
        }
    }

    pub fn get_raw_columns(&self) -> Vec<u8> {
        let mut buffer = Vec::new();
        for &rule in &self.encoded_rules {
            buffer.extend_from_slice(&rule.to_le_bytes());
        }
        buffer
    }

    pub fn compress_columns(&self) -> Vec<u8> {
        let raw = self.get_raw_columns();
        if raw.is_empty() { return vec![]; }
        lz4_flex::compress_prepend_size(&raw)
    }

    pub fn retrieve_records(&self, target_rule_id: u32) -> Vec<LogHit> {
        let mut hits = Vec::new();
        if target_rule_id == 0 { return hits; }

        for (idx, &rule) in self.encoded_rules.iter().enumerate() {
            if rule == target_rule_id {
                let delta = *self.temporal_deltas.get(idx).unwrap_or(&0);
                hits.push(LogHit {
                    row_index: idx,
                    temporal_delta: delta,
                });
                
                if hits.len() >= 100 { break; } 
            }
        }
        hits
    }
}
