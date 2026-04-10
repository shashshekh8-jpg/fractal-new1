use std::collections::HashMap;
use serde::{Serialize, Deserialize};

const MAX_TEMPLATES: usize = 2000;

#[derive(Serialize, Deserialize, Clone)]
pub struct DrainTree {
    similarity_threshold: f64,
    templates: HashMap<u32, String>,
    next_id: u32,
}

impl DrainTree {
    pub fn new(threshold: f64) -> Self {
        Self {
            similarity_threshold: threshold,
            templates: HashMap::new(),
            next_id: 1,
        }
    }

    pub fn parse_and_extract(&mut self, line: &str) -> (u32, Vec<String>) {
        let tokens: Vec<&str> = line.split_whitespace().collect();
        let mut variables = Vec::new();
        
        let mut best_match_id = 0;
        let mut highest_sim = 0.0;

        for (&id, template) in &self.templates {
            let temp_tokens: Vec<&str> = template.split_whitespace().collect();
            if temp_tokens.len() != tokens.len() { continue; }

            let mut match_count = 0;
            for (t1, t2) in tokens.iter().zip(temp_tokens.iter()) {
                if t1 == t2 || *t2 == "<*>" { match_count += 1; }
            }
            
            let sim = match_count as f64 / tokens.len() as f64;
            if sim > highest_sim {
                highest_sim = sim;
                best_match_id = id;
            }
        }

        if highest_sim >= self.similarity_threshold && best_match_id != 0 {
            let temp_tokens: Vec<&str> = self.templates.get(&best_match_id).unwrap().split_whitespace().collect();
            for (t1, t2) in tokens.iter().zip(temp_tokens.iter()) {
                if t1 != t2 { variables.push(t1.to_string()); }
            }
            (best_match_id, variables)
        } else {
            if self.templates.len() >= MAX_TEMPLATES {
                let keys_to_remove: Vec<u32> = self.templates.keys().take(MAX_TEMPLATES / 2).cloned().collect();
                for key in keys_to_remove {
                    self.templates.remove(&key);
                }
            }

            let id = self.next_id;
            self.templates.insert(id, line.to_string());
            self.next_id += 1;
            (id, vec![])
        }
    }

    pub fn get_all_templates(&self) -> Vec<String> {
        self.templates.values().cloned().collect()
    }

    pub fn get_template_by_id(&self, id: u32) -> String {
        self.templates.get(&id).cloned().unwrap_or_else(|| "".to_string())
    }

    pub fn find_template_by_query(&self, query: &str) -> u32 {
        let query_lower = query.to_lowercase();
        for (&id, template) in &self.templates {
            if template.to_lowercase().contains(&query_lower) { 
                return id;
            }
        }
        0
    }
}
