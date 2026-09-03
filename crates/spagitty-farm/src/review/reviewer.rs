// SPDX-License-Identifier: GPL-3.0-or-later

//! Who reviews what.
//!
//! One rule, and the plan is emphatic about it: **the agent that implemented a
//! task may not be the one that approves it.** A model asked to review its own
//! work agrees with itself, at length and persuasively, which is worse than no
//! review because it produces a record saying the change was reviewed.
//!
//! The rule is enforced here rather than trusted to the routing table, because
//! routing can be overridden by the user and this cannot: [`pick`] refuses to
//! return the implementer, and the service refuses a review run whose reviewer
//! is the implementer even if one is somehow requested.

use crate::agent::AgentRegistry;
use crate::error::{Error, Result};
use crate::model::{AgentCapability, AgentDefinition, AgentId};

/// Choose a reviewer for work done by `implementer`.
///
/// `None` means the farm has nobody else, and the task waits for a human. That
/// is the honest outcome on a machine with one agent installed, and it is much
/// better than the alternative of quietly letting the author sign off.
pub fn pick(registry: &AgentRegistry, implementer: &AgentId) -> Option<AgentDefinition> {
    registry.other_than(implementer, AgentCapability::Review)
}

/// Refuse a reviewer who wrote the code.
pub fn check(implementer: &AgentId, reviewer: &AgentId) -> Result<()> {
    if implementer == reviewer {
        return Err(Error::SelfReview(reviewer.clone()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::adapters::{claude::ClaudeAdapter, codex::CodexAdapter};
    use crate::agent::AgentAdapter;
    use crate::model::AgentAvailability;
    use std::path::PathBuf;

    fn registry(names: &[&str]) -> AgentRegistry {
        let mut registry = AgentRegistry::default();
        for name in names {
            let definition = match *name {
                "claude" => ClaudeAdapter.default_definition(PathBuf::from("/usr/bin/claude")),
                _ => CodexAdapter.default_definition(PathBuf::from("/usr/bin/codex")),
            };
            let id = definition.id.clone();
            registry.put(definition);
            registry.set_availability(
                id,
                AgentAvailability::Available {
                    path: PathBuf::from("/usr/bin/x"),
                    version: "1".into(),
                },
            );
        }
        registry
    }

    #[test]
    fn the_reviewer_is_never_the_author() {
        let picked = pick(&registry(&["claude", "codex"]), &AgentId::new("codex")).unwrap();
        assert_eq!(picked.id, AgentId::new("claude"));
    }

    #[test]
    fn one_agent_means_no_automatic_reviewer() {
        assert!(pick(&registry(&["claude"]), &AgentId::new("claude")).is_none());
    }

    #[test]
    fn a_self_review_is_refused_even_if_it_is_asked_for() {
        let error = check(&AgentId::new("claude"), &AgentId::new("claude")).unwrap_err();
        assert_eq!(error.kind(), "selfReview");
        assert!(check(&AgentId::new("claude"), &AgentId::new("codex")).is_ok());
    }
}
