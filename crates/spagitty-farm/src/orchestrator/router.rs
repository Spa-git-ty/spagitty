// SPDX-License-Identifier: GPL-3.0-or-later

//! Which agent gets which task.
//!
//! Rule-based, and deliberately not clever. The plan is explicit —
//! *"do not attempt smart AI routing in V1"* — and the reason is worth
//! restating: a scoring function that weighs historical success against cost
//! against context fit is untestable until there is history to test it with,
//! and until then it is a random number generator with a good story.
//!
//! So: a task kind maps to a preferred role, the registry finds an agent for
//! that role, and if there is nobody the task goes to whoever can code. The
//! table is the plan's, verbatim.
//!
//! # What comes later
//!
//! [`Scoreboard`] is the beginning of the answer — the observable half of it.
//! It counts what actually happened per agent, which is a fact rather than an
//! opinion, and the interface can show it. Nothing schedules on it yet, and
//! nothing will until the numbers are large enough to mean something.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::agent::AgentRegistry;
use crate::model::{AgentCapability, AgentDefinition, AgentId, AgentRole, TaskKind};

/// The role a kind of work prefers.
pub fn role_for(kind: TaskKind) -> AgentRole {
    match kind {
        TaskKind::Architecture => AgentRole::Architect,
        TaskKind::Backend => AgentRole::Backend,
        TaskKind::Frontend => AgentRole::Frontend,
        TaskKind::Testing => AgentRole::Tester,
        TaskKind::Review => AgentRole::Reviewer,
        TaskKind::Research => AgentRole::Researcher,
        TaskKind::Documentation | TaskKind::Integration | TaskKind::General => AgentRole::General,
    }
}

/// The capability a kind of work needs, for the fallback when no agent holds
/// the role.
pub fn capability_for(kind: TaskKind) -> AgentCapability {
    match kind {
        TaskKind::Architecture => AgentCapability::Planning,
        TaskKind::Frontend => AgentCapability::Frontend,
        TaskKind::Backend => AgentCapability::Backend,
        TaskKind::Testing => AgentCapability::Testing,
        TaskKind::Review => AgentCapability::Review,
        TaskKind::Research => AgentCapability::Research,
        TaskKind::Documentation => AgentCapability::Documentation,
        TaskKind::Integration | TaskKind::General => AgentCapability::Coding,
    }
}

/// Pick an agent for a task of this kind.
pub fn pick(registry: &AgentRegistry, kind: TaskKind) -> Option<AgentDefinition> {
    registry.for_role(role_for(kind), capability_for(kind))
}

/// What each agent has actually done.
///
/// Counts, not scores. Every number here is something that happened and was
/// recorded, so the interface can show it without claiming to have measured
/// anything it did not.
#[derive(Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scoreboard {
    entries: BTreeMap<AgentId, Record>,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    pub completed: u32,
    pub failed: u32,
    /// Reviews of this agent's work that asked for changes.
    pub changes_requested: u32,
    /// Total time spent running, in milliseconds.
    pub duration_ms: u64,
}

impl Record {
    /// Completed as a fraction of everything attempted, or `None` when nothing
    /// has been attempted.
    ///
    /// `None` rather than zero, because "no data" and "always fails" are
    /// different things and a screen showing 0% for a new agent is a lie.
    pub fn success_rate(&self) -> Option<f32> {
        let attempts = self.completed + self.failed;
        (attempts > 0).then(|| self.completed as f32 / attempts as f32)
    }

    pub fn average_ms(&self) -> Option<u64> {
        let attempts = (self.completed + self.failed) as u64;
        (attempts > 0).then(|| self.duration_ms / attempts)
    }
}

impl Scoreboard {
    pub fn completed(&mut self, agent: &AgentId, duration_ms: u64) {
        let entry = self.entry(agent);
        entry.completed += 1;
        entry.duration_ms += duration_ms;
    }

    pub fn failed(&mut self, agent: &AgentId, duration_ms: u64) {
        let entry = self.entry(agent);
        entry.failed += 1;
        entry.duration_ms += duration_ms;
    }

    pub fn changes_requested(&mut self, agent: &AgentId) {
        self.entry(agent).changes_requested += 1;
    }

    pub fn get(&self, agent: &AgentId) -> Record {
        self.entries.get(agent).copied().unwrap_or_default()
    }

    pub fn all(&self) -> Vec<(AgentId, Record)> {
        self.entries
            .iter()
            .map(|(id, record)| (id.clone(), *record))
            .collect()
    }

    fn entry(&mut self, agent: &AgentId) -> &mut Record {
        self.entries.entry(agent.clone()).or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::adapters::{claude::ClaudeAdapter, codex::CodexAdapter, cursor::CursorAdapter};
    use crate::agent::AgentAdapter;
    use crate::model::AgentAvailability;
    use std::path::PathBuf;

    fn registry() -> AgentRegistry {
        let mut registry = AgentRegistry::default();
        for definition in [
            ClaudeAdapter.default_definition(PathBuf::from("/usr/bin/claude")),
            CodexAdapter.default_definition(PathBuf::from("/usr/bin/codex")),
            CursorAdapter.default_definition(PathBuf::from("/usr/bin/cursor-agent")),
        ] {
            let id = definition.id.clone();
            registry.put(definition);
            registry.set_availability(
                id,
                AgentAvailability::Available {
                    path: PathBuf::from("/x"),
                    version: "1".into(),
                },
            );
        }
        registry
    }

    #[test]
    fn the_routing_table_is_the_one_the_plan_writes() {
        let registry = registry();
        assert_eq!(
            pick(&registry, TaskKind::Architecture).unwrap().id,
            AgentId::new("claude")
        );
        assert_eq!(
            pick(&registry, TaskKind::Backend).unwrap().id,
            AgentId::new("codex")
        );
        assert_eq!(
            pick(&registry, TaskKind::Frontend).unwrap().id,
            AgentId::new("cursor")
        );
    }

    #[test]
    fn a_kind_with_nobody_in_its_role_still_gets_an_agent() {
        // Nothing here declares the Tester role; the farm must not stall.
        assert!(pick(&registry(), TaskKind::Testing).is_some());
    }

    #[test]
    fn a_farm_with_no_agents_routes_to_nobody() {
        assert!(pick(&AgentRegistry::default(), TaskKind::Backend).is_none());
    }

    #[test]
    fn every_task_kind_has_a_role_and_a_capability() {
        for kind in TaskKind::ALL {
            // A `match` with a wildcard arm would compile with a new kind
            // silently routed to General; this asserts every one was thought
            // about.
            let _ = role_for(kind);
            let _ = capability_for(kind);
        }
        assert_eq!(role_for(TaskKind::Review), AgentRole::Reviewer);
        assert_eq!(capability_for(TaskKind::General), AgentCapability::Coding);
    }

    #[test]
    fn an_agent_with_no_history_has_no_success_rate() {
        let board = Scoreboard::default();
        assert_eq!(board.get(&AgentId::new("claude")).success_rate(), None);
        assert_eq!(board.get(&AgentId::new("claude")).average_ms(), None);
    }

    #[test]
    fn the_scoreboard_counts_what_happened() {
        let mut board = Scoreboard::default();
        let codex = AgentId::new("codex");
        board.completed(&codex, 1_000);
        board.completed(&codex, 3_000);
        board.failed(&codex, 2_000);
        board.changes_requested(&codex);

        let record = board.get(&codex);
        assert_eq!(record.completed, 2);
        assert_eq!(record.failed, 1);
        assert_eq!(record.changes_requested, 1);
        assert_eq!(record.average_ms(), Some(2_000));
        assert!((record.success_rate().unwrap() - 0.666_666_7).abs() < 0.001);
    }

    #[test]
    fn the_scoreboard_survives_being_saved() {
        let mut board = Scoreboard::default();
        board.completed(&AgentId::new("claude"), 500);
        let json = serde_json::to_string(&board).unwrap();
        let back: Scoreboard = serde_json::from_str(&json).unwrap();
        assert_eq!(back.all().len(), 1);
        assert_eq!(back.get(&AgentId::new("claude")).completed, 1);
    }
}
