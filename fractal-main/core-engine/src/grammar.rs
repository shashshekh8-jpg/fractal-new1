use std::collections::HashMap;
use serde::{Serialize, Deserialize};

const MAX_FSLP_RULES: usize = 5000;

#[derive(Serialize, Deserialize, Clone)]
pub struct SchemaRegistry {
    fslp_rules: HashMap<u32, u32>,
    next_rule_id: u32,
}

impl SchemaRegistry {
    pub fn new() -> Self {
        Self {
            fslp_rules: HashMap::new(),
            next_rule_id: 1,
        }
    }

    pub fn induce_fslp(&mut self, template_id: u32, _has_vars: bool) -> (u32, bool) {
        if let Some(&rule_id) = self.fslp_rules.get(&template_id) {
            return (rule_id, true);
        }

        if self.fslp_rules.len() >= MAX_FSLP_RULES {
            self.fslp_rules.clear();
        }
        
        let new_rule = self.next_rule_id;
        self.fslp_rules.insert(template_id, new_rule);
        self.next_rule_id += 1;
        
        (new_rule, false)
    }
}
