use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct LogHit {
    pub row_index: usize,
    pub temporal_delta: i64,
    pub variables: Vec<String>,
    pub rule_id: u32, // The rule_id tracking for the UI
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ColumnarBatch {
    pub encoded_rules: Vec<u32>,
    pub variables_packed: Vec<f64>,
    pub string_vars: Vec<String>,     
    pub var_counts: Vec<usize>,      
    pub temporal_deltas: Vec<i64>,
}

impl ColumnarBatch {
    pub fn new() -> Self {
        Self {
            encoded_rules: Vec::new(),
            variables_packed: Vec::new(),
            string_vars: Vec::new(),
            var_counts: Vec::new(),
            temporal_deltas: Vec::new(),
        }
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            encoded_rules: Vec::with_capacity(capacity),
            variables_packed: Vec::with_capacity(capacity * 2),
            string_vars: Vec::with_capacity(capacity * 2),
            var_counts: Vec::with_capacity(capacity),
            temporal_deltas: Vec::with_capacity(capacity),
        }
    }

    pub fn insert_encoded_log(&mut self, rule_id: u32, vars: Vec<String>, delta: i64) {
        self.encoded_rules.push(rule_id);
        self.temporal_deltas.push(delta);
        self.var_counts.push(vars.len());
        
        for var in vars {
            if let Ok(num) = var.parse::<f64>() {
                self.variables_packed.push(num);
            }
            self.string_vars.push(var);
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

        let mut current_var_ptr = 0;
        for (idx, &rule) in self.encoded_rules.iter().enumerate() {
            let count = self.var_counts[idx];
            
            if rule == target_rule_id {
                let delta = *self.temporal_deltas.get(idx).unwrap_or(&0);
                let row_vars = self.string_vars[current_var_ptr .. current_var_ptr + count].to_vec();
                
                hits.push(LogHit {
                    row_index: idx,
                    temporal_delta: delta,
                    variables: row_vars,
                    rule_id: rule, // THE FIX: removed the asterisk
                });
                if hits.len() >= 100 { break; } 
            }
            current_var_ptr += count;
        }
        hits
    }

    pub fn retrieve_records_by_value(&self, value: &str) -> Vec<LogHit> {
        let mut hits = Vec::new();
        let mut current_var_ptr = 0;
        let query = value.to_lowercase(); 

        for (row_idx, &count) in self.var_counts.iter().enumerate() {
            let row_vars = &self.string_vars[current_var_ptr .. current_var_ptr + count];
            
            if row_vars.iter().any(|v| v.to_lowercase().contains(&query)) {
                hits.push(LogHit {
                    row_index: row_idx,
                    temporal_delta: self.temporal_deltas[row_idx],
                    variables: row_vars.to_vec(),
                    rule_id: self.encoded_rules[row_idx],
                });
            }
            
            current_var_ptr += count;
            if hits.len() >= 100 { break; }
        }
        hits
    }
}