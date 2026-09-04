// SPDX-License-Identifier: GPL-3.0-or-later

//! What should start next.
//!
//! The scheduler is a **pure function**: farm plus leases in, a list of
//! decisions out. It starts nothing, spawns nothing and writes nothing.
//!
//! That is the single most useful decision in this crate. A scheduler that
//! spawns processes can only be tested by spawning processes, which means the
//! interesting cases — four tasks, two agents, one contended path, one failed
//! dependency, autonomy at Assisted — are untestable in practice and therefore
//! untested. As a function they are a table.
//!
//! [`crate::service`] takes the decisions and acts on them, and it is the only
//! thing that does.

use crate::agent::AgentRegistry;
use crate::model::{AgentId, Farm, Task, TaskId};
use crate::orchestrator::dependency::Graph;
use crate::orchestrator::router;
use crate::workspace::Leases;

/// One thing the farm should do next.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Decision {
    /// Give this task to this agent and run it.
    Start { task: TaskId, agent: AgentId },
    /// It cannot proceed, and here is the sentence to show.
    Block { task: TaskId, why: String },
}

impl Decision {
    pub fn task(&self) -> &TaskId {
        match self {
            Decision::Start { task, .. } | Decision::Block { task, .. } => task,
        }
    }
}

/// Everything the farm should do right now.
///
/// Called after every state change rather than on a timer. A farm only moves
/// when something finishes, and a timer would either lag behind that or burn
/// cycles asking a question whose answer has not changed.
pub fn decide(farm: &Farm, registry: &AgentRegistry, leases: &Leases) -> Vec<Decision> {
    let mut decisions = Vec::new();

    // Tasks waiting on something that has failed will never run. Saying so is
    // more useful than leaving them in the queue looking imminent.
    let graph = Graph::new(&farm.tasks);
    for (task, blocker) in graph.stranded() {
        decisions.push(Decision::Block {
            task: task.clone(),
            why: format!("{blocker} did not finish."),
        });
    }

    if !farm.status.is_live() || !farm.autonomy.starts_tasks() {
        return decisions;
    }

    // A copy, because a decision to start a task takes its paths for the
    // purposes of the *next* decision in this same pass. Without that, two
    // tasks touching the same files would both be started by one call.
    let mut leases = leases.clone();
    let mut free = farm.max_parallel.saturating_sub(farm.running());

    for task in graph.ready() {
        if free == 0 {
            break;
        }
        if decisions.iter().any(|decision| decision.task() == &task.id) {
            continue;
        }

        let Some(agent) = agent_for(farm, registry, task) else {
            decisions.push(Decision::Block {
                task: task.id.clone(),
                why: "No agent is available for this kind of work.".into(),
            });
            continue;
        };

        // A contended path is *not* a block. The holder will finish and this
        // task will start on the next pass; blocking it would need a human to
        // unblock something that resolves itself.
        if leases.blocked_by(&task.id, &task.allowed_paths).is_some() {
            continue;
        }

        if task.is_exhausted() {
            decisions.push(Decision::Block {
                task: task.id.clone(),
                why: format!(
                    "This has been attempted {} times. It needs a person.",
                    task.attempts
                ),
            });
            continue;
        }

        let _ = leases.acquire(&task.id, &task.allowed_paths);
        free -= 1;
        decisions.push(Decision::Start {
            task: task.id.clone(),
            agent: agent.clone(),
        });
    }

    decisions
}

/// Why each queued task is not running, in one sentence each.
///
/// The scheduler already decides this — it just does not say so. A task that is
/// `Ready` and not started is holding one of a small number of reasons, and
/// every one of them is knowable here and knowable *nowhere else*: which task
/// holds the path it wants, how many agents are busy against the limit, whether
/// anything installed can do this kind of work. The interface could not compute
/// any of it, so a queue that was not moving looked stalled (FEAT-075).
///
/// Deliberately not included: unmet dependencies. The interface has the whole
/// task list and can say `Waiting for T-3` without asking, and two places
/// producing the same sentence is how they come to disagree.
///
/// Pure, like [`decide`], and tested as a table for the same reason.
pub fn why_waiting(
    farm: &Farm,
    registry: &AgentRegistry,
    leases: &Leases,
) -> Vec<(TaskId, String)> {
    let mut reasons = Vec::new();

    if !farm.status.is_live() {
        // Nothing below is true while the farm is not running: a queue that is
        // not being served is not a queue with a problem.
        for task in farm.tasks.iter().filter(|task| task.status.is_queued()) {
            reasons.push((task.id.clone(), "The farm is not running.".to_string()));
        }
        return reasons;
    }
    if !farm.autonomy.starts_tasks() {
        for task in farm.tasks.iter().filter(|task| task.status.is_queued()) {
            reasons.push((
                task.id.clone(),
                "Autonomy is Manual, so nothing starts on its own.".to_string(),
            ));
        }
        return reasons;
    }

    let graph = Graph::new(&farm.tasks);
    let mut leases = leases.clone();
    let mut free = farm.max_parallel.saturating_sub(farm.running());

    for task in graph.ready() {
        if task.is_exhausted() {
            reasons.push((
                task.id.clone(),
                format!("Attempted {} times. It needs a person.", task.attempts),
            ));
            continue;
        }
        if agent_for(farm, registry, task).is_none() {
            reasons.push((
                task.id.clone(),
                "No agent is available for this kind of work.".to_string(),
            ));
            continue;
        }
        if let Some(holder) = leases.blocked_by(&task.id, &task.allowed_paths) {
            reasons.push((
                task.id.clone(),
                format!("{holder} is working on the same files."),
            ));
            continue;
        }
        if free == 0 {
            reasons.push((
                task.id.clone(),
                format!(
                    "No free agent — {} of {} are working.",
                    farm.running(),
                    farm.max_parallel
                ),
            ));
            continue;
        }
        // This one is about to start, and it takes its paths with it — so the
        // next task in the queue is told about *this* task rather than about
        // whatever was running before the pass began.
        let _ = leases.acquire(&task.id, &task.allowed_paths);
        free -= 1;
    }

    reasons
}

/// Who should do this task.
///
/// An explicit assignment wins over routing, always. The user picking an agent
/// in the interface is a decision, and a scheduler that silently re-routed it
/// would make that control a suggestion.
fn agent_for(farm: &Farm, registry: &AgentRegistry, task: &Task) -> Option<AgentId> {
    if let Some(assigned) = &task.assigned_agent {
        // Still checked for availability: an assignment to an agent that has
        // been uninstalled since should fall back rather than fail every pass.
        if registry.runnable(assigned).is_ok() {
            return Some(assigned.clone());
        }
    }
    let picked = router::pick(registry, task.kind)?;
    // A farm can name the agents it is allowed to use. An empty list means
    // "anything installed", which is what a farm created without thinking
    // about it should do.
    if !farm.agents.is_empty() && !farm.agents.contains(&picked.id) {
        return farm
            .agents
            .iter()
            .find(|id| registry.runnable(id).is_ok())
            .cloned();
    }
    Some(picked.id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::adapters::{claude::ClaudeAdapter, codex::CodexAdapter};
    use crate::agent::AgentAdapter;
    use crate::model::{
        task_id, AgentAvailability, Autonomy, FarmId, FarmStatus, Goal, GoalId, TaskKind,
        TaskStatus,
    };
    use std::path::PathBuf;

    fn registry() -> AgentRegistry {
        let mut registry = AgentRegistry::default();
        for definition in [
            ClaudeAdapter.default_definition(PathBuf::from("/usr/bin/claude")),
            CodexAdapter.default_definition(PathBuf::from("/usr/bin/codex")),
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

    fn farm(tasks: Vec<Task>) -> Farm {
        let mut farm = Farm::new(
            FarmId::new("f1"),
            "/repo",
            Goal::new(GoalId::new("g1"), "Ship it", 0),
            0,
        );
        farm.status = FarmStatus::Running;
        farm.tasks = tasks;
        farm
    }

    fn task(number: u32, status: TaskStatus) -> Task {
        let mut task = Task::new(task_id(number), format!("task {number}"), 0);
        task.status = status;
        task
    }

    fn starts(decisions: &[Decision]) -> Vec<String> {
        decisions
            .iter()
            .filter_map(|decision| match decision {
                Decision::Start { task, .. } => Some(task.to_string()),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn a_ready_task_is_started() {
        let farm = farm(vec![task(1, TaskStatus::Ready)]);
        let decisions = decide(&farm, &registry(), &Leases::default());
        assert_eq!(starts(&decisions), ["TASK-0001"]);
    }

    #[test]
    fn a_paused_farm_starts_nothing() {
        let mut farm = farm(vec![task(1, TaskStatus::Ready)]);
        farm.status = FarmStatus::Paused;
        assert!(starts(&decide(&farm, &registry(), &Leases::default())).is_empty());
    }

    #[test]
    fn a_manual_farm_starts_nothing() {
        let mut farm = farm(vec![task(1, TaskStatus::Ready)]);
        farm.autonomy = Autonomy::Manual;
        assert!(starts(&decide(&farm, &registry(), &Leases::default())).is_empty());
    }

    #[test]
    fn tasks_that_declared_no_paths_run_one_at_a_time() {
        // A task with no `allowedPaths` has not said what it will touch, so it
        // takes the whole tree. Three such tasks are three serial runs, which
        // is the safe reading of an unanswered question — and the reason the
        // Farm screen says so beside a task that declares nothing.
        let farm = farm(vec![
            task(1, TaskStatus::Ready),
            task(2, TaskStatus::Ready),
            task(3, TaskStatus::Ready),
        ]);
        assert_eq!(
            starts(&decide(&farm, &registry(), &Leases::default())),
            ["TASK-0001"]
        );
    }

    #[test]
    fn declaring_paths_is_what_buys_parallelism() {
        let mut tasks = Vec::new();
        for number in 1..=3 {
            let mut task = task(number, TaskStatus::Ready);
            task.allowed_paths = vec![format!("area-{number}/**")];
            tasks.push(task);
        }
        let farm = farm(tasks);
        assert_eq!(farm.max_parallel, 2);
        // Two, not three: `maxParallel` is the limit, and it is respected.
        assert_eq!(
            starts(&decide(&farm, &registry(), &Leases::default())).len(),
            2
        );
    }

    #[test]
    fn running_tasks_hold_no_lease_the_scheduler_can_see() {
        // A running task's lease lives in the service, not in the farm, so the
        // scheduler is given it explicitly. This is the case that would
        // silently start a second agent on the same files if it were not.
        let mut running = task(1, TaskStatus::Running);
        running.allowed_paths = vec!["src/**".into()];
        let mut ready = task(2, TaskStatus::Ready);
        ready.allowed_paths = vec!["src/auth.rs".into()];

        let farm = farm(vec![running, ready]);
        let mut held = Leases::default();
        held.acquire(&task_id(1), &["src/**".into()]).unwrap();
        assert!(starts(&decide(&farm, &registry(), &held)).is_empty());
    }

    #[test]
    fn running_tasks_count_against_the_limit() {
        let farm = farm(vec![
            task(1, TaskStatus::Running),
            task(2, TaskStatus::Ready),
            task(3, TaskStatus::Ready),
        ]);
        assert_eq!(
            starts(&decide(&farm, &registry(), &Leases::default())).len(),
            1
        );
    }

    #[test]
    fn two_tasks_on_the_same_paths_are_not_both_started_in_one_pass() {
        // The reason the scheduler takes leases as it decides.
        let mut first = task(1, TaskStatus::Ready);
        first.allowed_paths = vec!["src/auth/**".into()];
        let mut second = task(2, TaskStatus::Ready);
        second.allowed_paths = vec!["src/auth/token.rs".into()];

        let farm = farm(vec![first, second]);
        assert_eq!(
            starts(&decide(&farm, &registry(), &Leases::default())),
            ["TASK-0001"]
        );
    }

    #[test]
    fn two_tasks_in_different_trees_start_together() {
        let mut first = task(1, TaskStatus::Ready);
        first.allowed_paths = vec!["backend/**".into()];
        let mut second = task(2, TaskStatus::Ready);
        second.allowed_paths = vec!["frontend/**".into()];

        let farm = farm(vec![first, second]);
        assert_eq!(
            starts(&decide(&farm, &registry(), &Leases::default())).len(),
            2
        );
    }

    #[test]
    fn a_task_whose_paths_are_held_waits_rather_than_blocking() {
        let mut held = Leases::default();
        held.acquire(&task_id(9), &["src/**".into()]).unwrap();

        let mut waiting = task(1, TaskStatus::Ready);
        waiting.allowed_paths = vec!["src/auth.rs".into()];
        let farm = farm(vec![waiting]);

        let decisions = decide(&farm, &registry(), &held);
        assert!(starts(&decisions).is_empty());
        // Not blocked: it resolves itself when the holder finishes.
        assert!(decisions.is_empty(), "{decisions:?}");
    }

    #[test]
    fn a_task_waiting_on_a_failure_is_blocked_with_a_reason() {
        let mut dependant = task(2, TaskStatus::Ready);
        dependant.depends_on = vec![task_id(1)];
        let farm = farm(vec![task(1, TaskStatus::Failed), dependant]);

        let decisions = decide(&farm, &registry(), &Leases::default());
        match decisions.first().unwrap() {
            Decision::Block { task, why } => {
                assert_eq!(task, &task_id(2));
                assert!(why.contains("TASK-0001"), "{why}");
            }
            other => panic!("expected a block, got {other:?}"),
        }
    }

    #[test]
    fn a_task_that_has_run_out_of_attempts_is_handed_to_a_person() {
        let mut exhausted = task(1, TaskStatus::Ready);
        exhausted.attempts = Task::MAX_ATTEMPTS;
        let farm = farm(vec![exhausted]);

        match decide(&farm, &registry(), &Leases::default())
            .first()
            .unwrap()
        {
            Decision::Block { why, .. } => assert!(why.contains("needs a person"), "{why}"),
            other => panic!("expected a block, got {other:?}"),
        }
    }

    #[test]
    fn a_farm_with_no_agents_blocks_rather_than_looping() {
        let farm = farm(vec![task(1, TaskStatus::Ready)]);
        match decide(&farm, &AgentRegistry::default(), &Leases::default())
            .first()
            .unwrap()
        {
            Decision::Block { why, .. } => assert!(why.contains("No agent"), "{why}"),
            other => panic!("expected a block, got {other:?}"),
        }
    }

    #[test]
    fn an_explicit_assignment_beats_the_routing_table() {
        let mut assigned = task(1, TaskStatus::Ready);
        assigned.kind = TaskKind::Backend;
        assigned.assigned_agent = Some(AgentId::new("claude"));
        let farm = farm(vec![assigned]);

        match decide(&farm, &registry(), &Leases::default())
            .first()
            .unwrap()
        {
            Decision::Start { agent, .. } => assert_eq!(agent, &AgentId::new("claude")),
            other => panic!("expected a start, got {other:?}"),
        }
    }

    #[test]
    fn an_assignment_to_an_agent_that_is_gone_falls_back_to_routing() {
        let mut assigned = task(1, TaskStatus::Ready);
        assigned.kind = TaskKind::Backend;
        assigned.assigned_agent = Some(AgentId::new("uninstalled"));
        let farm = farm(vec![assigned]);

        match decide(&farm, &registry(), &Leases::default())
            .first()
            .unwrap()
        {
            Decision::Start { agent, .. } => assert_eq!(agent, &AgentId::new("codex")),
            other => panic!("expected a start, got {other:?}"),
        }
    }

    #[test]
    fn a_farm_restricted_to_one_agent_uses_only_that_one() {
        let mut backend = task(1, TaskStatus::Ready);
        backend.kind = TaskKind::Backend;
        let mut farm = farm(vec![backend]);
        farm.agents = vec![AgentId::new("claude")];

        match decide(&farm, &registry(), &Leases::default())
            .first()
            .unwrap()
        {
            Decision::Start { agent, .. } => assert_eq!(agent, &AgentId::new("claude")),
            other => panic!("expected a start, got {other:?}"),
        }
    }

    #[test]
    fn a_task_waiting_on_an_unfinished_dependency_is_neither_started_nor_blocked() {
        let mut dependant = task(2, TaskStatus::Ready);
        dependant.depends_on = vec![task_id(1)];
        let farm = farm(vec![task(1, TaskStatus::Running), dependant]);
        let decisions = decide(&farm, &registry(), &Leases::default());
        assert!(decisions.is_empty(), "{decisions:?}");
    }

    /// FEAT-075 — the queue says why it is not moving.
    ///
    /// A table, because that is what the reasons are: one row per thing that
    /// can hold a ready task still, and each one is a sentence somebody reads
    /// on a task row.
    fn why(farm: &Farm, leases: &Leases) -> Vec<(String, String)> {
        why_waiting(farm, &registry(), leases)
            .into_iter()
            .map(|(task, why)| (task.to_string(), why))
            .collect()
    }

    #[test]
    fn a_task_that_is_about_to_start_has_nothing_to_explain() {
        let farm = farm(vec![task(1, TaskStatus::Ready)]);
        assert!(why(&farm, &Leases::default()).is_empty());
    }

    #[test]
    fn a_stopped_farm_says_so_rather_than_blaming_the_task() {
        let mut farm = farm(vec![task(1, TaskStatus::Ready)]);
        farm.status = FarmStatus::Idle;
        assert_eq!(
            why(&farm, &Leases::default()),
            [(
                task_id(1).to_string(),
                "The farm is not running.".to_string()
            )]
        );
    }

    #[test]
    fn manual_autonomy_says_nothing_starts_on_its_own() {
        let mut farm = farm(vec![task(1, TaskStatus::Ready)]);
        farm.autonomy = Autonomy::Manual;
        assert_eq!(
            why(&farm, &Leases::default())[0].1,
            "Autonomy is Manual, so nothing starts on its own."
        );
    }

    #[test]
    fn a_task_waiting_for_the_files_another_holds_names_the_holder() {
        let mut first = task(1, TaskStatus::Running);
        first.allowed_paths = vec!["src/auth/**".into()];
        let mut second = task(2, TaskStatus::Ready);
        second.allowed_paths = vec!["src/auth/tokens.rs".into()];
        let farm = farm(vec![first, second]);

        let mut leases = Leases::default();
        leases
            .acquire(&task_id(1), &["src/auth/**".to_string()])
            .unwrap();

        assert_eq!(
            why(&farm, &leases),
            [(
                task_id(2).to_string(),
                format!("{} is working on the same files.", task_id(1))
            )]
        );
    }

    #[test]
    fn a_full_farm_says_how_full_it_is() {
        let mut farm = farm(vec![
            task(1, TaskStatus::Running),
            task(2, TaskStatus::Ready),
        ]);
        farm.max_parallel = 1;
        assert_eq!(
            why(&farm, &Leases::default())[0].1,
            "No free agent — 1 of 1 are working."
        );
    }

    #[test]
    fn a_task_nothing_can_do_says_that_rather_than_looking_queued() {
        let mut farm = farm(vec![task(1, TaskStatus::Ready)]);
        // A farm restricted to an agent that is not installed.
        farm.agents = vec![AgentId::new("nobody")];
        assert_eq!(
            why(&farm, &Leases::default())[0].1,
            "No agent is available for this kind of work."
        );
    }

    #[test]
    fn an_exhausted_task_says_it_needs_a_person() {
        let mut exhausted = task(1, TaskStatus::Ready);
        exhausted.attempts = 3;
        let farm = farm(vec![exhausted]);
        assert!(why(&farm, &Leases::default())[0]
            .1
            .contains("needs a person"));
    }

    #[test]
    fn a_draft_is_not_a_queue_the_farm_is_failing_to_serve() {
        // It is a decision nobody has made, which the plan band asks for.
        let mut farm = farm(vec![task(1, TaskStatus::Draft)]);
        farm.status = FarmStatus::Idle;
        assert!(why(&farm, &Leases::default()).is_empty());
    }

    #[test]
    fn the_second_of_two_queued_tasks_is_told_about_the_first() {
        // Not about whatever was running before this pass: the first task takes
        // its slot inside the same pass, which is what `decide` does too.
        let mut farm = farm(vec![task(1, TaskStatus::Ready), task(2, TaskStatus::Ready)]);
        farm.max_parallel = 1;
        let reasons = why(&farm, &Leases::default());
        assert_eq!(reasons.len(), 1);
        assert_eq!(reasons[0].0, task_id(2).to_string());
    }
}
