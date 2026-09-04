// SPDX-License-Identifier: GPL-3.0-or-later

//! The task graph.
//!
//! Tasks form a directed acyclic graph and the scheduler runs whatever has no
//! unfinished ancestors. That single rule is the whole of parallel execution:
//! there is no worker pool to reason about, no priority inversion, and no
//! situation where two agents are started because two code paths each thought
//! they were the only one — the graph is asked once, and it answers with a set.
//!
//! # Cycles are refused, not detected later
//!
//! A cycle is not a rare corruption. It is what a planner produces when it
//! decides the integration task depends on the review and the review depends on
//! the integration, and it is what a user produces in the task editor in about
//! four clicks. So [`validate`] runs before anything is scheduled and names the
//! cycle it found, because "there is a cycle in your tasks" is not something a
//! person can act on.

use std::collections::{BTreeMap, BTreeSet};

use crate::error::{Error, Result};
use crate::model::{Task, TaskId, TaskStatus};

/// Every task, and what it waits for.
pub struct Graph<'a> {
    tasks: BTreeMap<&'a TaskId, &'a Task>,
}

impl<'a> Graph<'a> {
    pub fn new(tasks: &'a [Task]) -> Self {
        Graph {
            tasks: tasks.iter().map(|task| (&task.id, task)).collect(),
        }
    }

    /// The dependencies of `task` that are not `Done`.
    ///
    /// A dependency that does not exist is ignored rather than treated as
    /// unfinished. It can only get there by a hand-edited file or a planner
    /// naming a task it did not create, and a task blocked forever on a
    /// phantom is worse than one that runs — the phantom is visible in
    /// [`validate`], which is where it is reported.
    pub fn unmet(&self, task: &Task) -> Vec<&'a TaskId> {
        task.depends_on
            .iter()
            .filter_map(|id| self.tasks.get(id).map(|task| (id, task)))
            .filter(|(_, dependency)| dependency.status != TaskStatus::Done)
            .map(|(id, _)| self.tasks.get_key_value(id).map(|(key, _)| *key).unwrap())
            .collect()
    }

    /// The tasks cut out of `parent`, in identifier order.
    pub fn children(&self, parent: &TaskId) -> Vec<&'a Task> {
        self.tasks
            .values()
            .copied()
            .filter(|task| task.parent.as_ref() == Some(parent))
            .collect()
    }

    /// True when something was cut out of this task.
    ///
    /// A container is never run: it is a heading over the work, and the work is
    /// its children. Derived from the children rather than stored on the task,
    /// so a task stops being a container the moment its last child is deleted
    /// and there is no flag left saying otherwise (FEAT-076).
    pub fn is_container(&self, id: &TaskId) -> bool {
        self.tasks
            .values()
            .any(|task| task.parent.as_ref() == Some(id))
    }

    /// What a container's children add up to: how many are finished, and how
    /// many there are.
    pub fn progress(&self, parent: &TaskId) -> (usize, usize) {
        let children = self.children(parent);
        let done = children
            .iter()
            .filter(|task| task.status == TaskStatus::Done)
            .count();
        (done, children.len())
    }

    /// What a container should become, given where its children are.
    ///
    /// `None` while there is still work to do. A container follows its
    /// children and nothing else — it has no agent, no worktree and no run of
    /// its own to fail.
    pub fn container_status(&self, parent: &TaskId) -> Option<TaskStatus> {
        let children = self.children(parent);
        if children.is_empty() {
            return None;
        }
        if children.iter().all(|task| task.status == TaskStatus::Done) {
            return Some(TaskStatus::Done);
        }
        // One child that will never finish is a container that will never
        // finish. Saying so is the difference between a heading that is stuck
        // and a heading that looks like it is still going.
        if children.iter().any(|task| {
            matches!(
                task.status,
                TaskStatus::Failed | TaskStatus::Cancelled | TaskStatus::Blocked
            )
        }) {
            return Some(TaskStatus::Blocked);
        }
        None
    }

    /// Tasks whose dependencies are all `Done`.
    ///
    /// Ordered by priority and then by identifier, so a farm run twice against
    /// the same graph starts the same tasks in the same order. Determinism is
    /// worth more than cleverness here: it is what makes a farm's behaviour
    /// reproducible enough to debug.
    pub fn ready(&self) -> Vec<&'a Task> {
        let mut ready: Vec<&Task> = self
            .tasks
            .values()
            .copied()
            .filter(|task| matches!(task.status, TaskStatus::Ready | TaskStatus::Waiting))
            // A container is a heading, not work. Its children are what run,
            // and starting an agent on it would cut a worktree for a task
            // whose whole description is "these five things" (FEAT-076).
            .filter(|task| !self.is_container(&task.id))
            .filter(|task| self.unmet(task).is_empty())
            .collect();
        ready.sort_by(|left, right| {
            left.priority
                .cmp(&right.priority)
                .then_with(|| left.id.cmp(&right.id))
        });
        ready
    }

    /// Tasks that can never run, because something they wait for has failed or
    /// been cancelled.
    ///
    /// Reported so the farm can move them to `Blocked` and say why, rather than
    /// leaving them `Ready` forever while the user waits for something to
    /// happen.
    pub fn stranded(&self) -> Vec<(&'a TaskId, &'a TaskId)> {
        let mut stranded = Vec::new();
        for task in self.tasks.values() {
            if task.status.is_terminal() || task.status == TaskStatus::Blocked {
                continue;
            }
            for id in &task.depends_on {
                if let Some(dependency) = self.tasks.get(id) {
                    if matches!(
                        dependency.status,
                        TaskStatus::Failed | TaskStatus::Cancelled
                    ) {
                        stranded.push((&task.id, &dependency.id));
                        break;
                    }
                }
            }
        }
        stranded
    }

    /// Dependencies naming tasks that do not exist.
    pub fn dangling(&self) -> Vec<(&'a TaskId, TaskId)> {
        let mut dangling = Vec::new();
        for task in self.tasks.values() {
            for id in &task.depends_on {
                if !self.tasks.contains_key(id) {
                    dangling.push((&task.id, id.clone()));
                }
            }
        }
        dangling
    }
}

/// Refuse a graph that does not terminate.
///
/// Depth-first, tracking the path, so the error can name the loop. An
/// iterative walk with an explicit stack rather than recursion: a hand-edited
/// farm can nest as deeply as it likes, and a stack overflow inside the
/// scheduler takes the whole application with it.
pub fn validate(tasks: &[Task]) -> Result<()> {
    let by_id: BTreeMap<&TaskId, &Task> = tasks.iter().map(|task| (&task.id, task)).collect();

    #[derive(Clone, Copy, PartialEq)]
    enum Mark {
        Open,
        Closed,
    }

    let mut marks: BTreeMap<&TaskId, Mark> = BTreeMap::new();

    for root in tasks {
        if marks.contains_key(&root.id) {
            continue;
        }
        // (task, index of the next dependency to look at)
        let mut stack: Vec<(&TaskId, usize)> = vec![(&root.id, 0)];
        marks.insert(&root.id, Mark::Open);

        while let Some((current, index)) = stack.pop() {
            let Some(task) = by_id.get(current) else {
                continue;
            };
            match task.depends_on.get(index) {
                None => {
                    marks.insert(current, Mark::Closed);
                }
                Some(next) => {
                    stack.push((current, index + 1));
                    let Some((key, _)) = by_id.get_key_value(next) else {
                        continue;
                    };
                    match marks.get(*key) {
                        Some(Mark::Open) => {
                            let mut path: Vec<String> =
                                stack.iter().map(|(id, _)| id.to_string()).collect();
                            path.push(key.to_string());
                            return Err(Error::DependencyCycle(path.join(" → ")));
                        }
                        Some(Mark::Closed) => {}
                        None => {
                            marks.insert(*key, Mark::Open);
                            stack.push((*key, 0));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

/// Every task that must finish before `task` can, transitively.
///
/// Used by the interface to explain why something is waiting, and by the
/// planner to refuse a dependency that would create a cycle.
pub fn ancestors(tasks: &[Task], task: &TaskId) -> BTreeSet<TaskId> {
    let by_id: BTreeMap<&TaskId, &Task> = tasks.iter().map(|task| (&task.id, task)).collect();
    let mut seen = BTreeSet::new();
    let mut queue = vec![task.clone()];
    while let Some(current) = queue.pop() {
        let Some(task) = by_id.get(&current) else {
            continue;
        };
        for id in &task.depends_on {
            if seen.insert(id.clone()) {
                queue.push(id.clone());
            }
        }
    }
    seen
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{task_id, TaskPriority};

    fn task(number: u32, status: TaskStatus, depends: &[u32]) -> Task {
        let mut task = Task::new(task_id(number), format!("task {number}"), 0);
        task.status = status;
        task.depends_on = depends.iter().map(|n| task_id(*n)).collect();
        task
    }

    #[test]
    fn a_task_with_no_dependencies_is_ready() {
        let tasks = [task(1, TaskStatus::Ready, &[])];
        let graph = Graph::new(&tasks);
        assert_eq!(graph.ready().len(), 1);
    }

    #[test]
    fn a_task_waits_for_its_dependency() {
        let tasks = [
            task(1, TaskStatus::Running, &[]),
            task(2, TaskStatus::Ready, &[1]),
        ];
        let graph = Graph::new(&tasks);
        assert!(graph.ready().is_empty());
        assert_eq!(graph.unmet(&tasks[1]), [&task_id(1)]);
    }

    #[test]
    fn a_finished_dependency_releases_its_dependants() {
        // The plan's diagram: TASK-001 done releases 002 and 003 together.
        let tasks = [
            task(1, TaskStatus::Done, &[]),
            task(2, TaskStatus::Ready, &[1]),
            task(3, TaskStatus::Ready, &[1]),
            task(4, TaskStatus::Ready, &[2, 3]),
        ];
        let ready: Vec<String> = Graph::new(&tasks)
            .ready()
            .iter()
            .map(|task| task.id.to_string())
            .collect();
        assert_eq!(ready, ["TASK-0002", "TASK-0003"]);
    }

    #[test]
    fn ready_is_ordered_by_priority_then_identifier() {
        let mut high = task(3, TaskStatus::Ready, &[]);
        high.priority = TaskPriority::High;
        let tasks = [
            task(1, TaskStatus::Ready, &[]),
            task(2, TaskStatus::Ready, &[]),
            high,
        ];
        let ready: Vec<String> = Graph::new(&tasks)
            .ready()
            .iter()
            .map(|task| task.id.to_string())
            .collect();
        assert_eq!(ready, ["TASK-0003", "TASK-0001", "TASK-0002"]);
    }

    #[test]
    fn a_task_that_came_back_to_waiting_can_be_scheduled_again() {
        let tasks = [task(1, TaskStatus::Waiting, &[])];
        assert_eq!(Graph::new(&tasks).ready().len(), 1);
    }

    #[test]
    fn a_failed_dependency_strands_what_waits_on_it() {
        let tasks = [
            task(1, TaskStatus::Failed, &[]),
            task(2, TaskStatus::Ready, &[1]),
        ];
        let graph = Graph::new(&tasks);
        assert_eq!(graph.stranded(), [(&task_id(2), &task_id(1))]);
        assert!(graph.ready().is_empty());
    }

    #[test]
    fn a_task_already_blocked_is_not_stranded_again() {
        let tasks = [
            task(1, TaskStatus::Cancelled, &[]),
            task(2, TaskStatus::Blocked, &[1]),
        ];
        assert!(Graph::new(&tasks).stranded().is_empty());
    }

    #[test]
    fn a_straight_line_of_tasks_validates() {
        let tasks = [
            task(1, TaskStatus::Done, &[]),
            task(2, TaskStatus::Ready, &[1]),
            task(3, TaskStatus::Ready, &[2]),
        ];
        assert!(validate(&tasks).is_ok());
    }

    #[test]
    fn a_diamond_validates() {
        let tasks = [
            task(1, TaskStatus::Done, &[]),
            task(2, TaskStatus::Ready, &[1]),
            task(3, TaskStatus::Ready, &[1]),
            task(4, TaskStatus::Ready, &[2, 3]),
        ];
        assert!(validate(&tasks).is_ok());
    }

    #[test]
    fn a_cycle_is_refused_and_named() {
        let tasks = [
            task(1, TaskStatus::Ready, &[2]),
            task(2, TaskStatus::Ready, &[1]),
        ];
        let error = validate(&tasks).unwrap_err();
        assert_eq!(error.kind(), "dependencyCycle");
        let message = error.to_string();
        assert!(message.contains("TASK-0001"), "{message}");
        assert!(message.contains("TASK-0002"), "{message}");
    }

    #[test]
    fn a_task_that_depends_on_itself_is_a_cycle() {
        let tasks = [task(1, TaskStatus::Ready, &[1])];
        assert_eq!(validate(&tasks).unwrap_err().kind(), "dependencyCycle");
    }

    #[test]
    fn a_long_chain_does_not_overflow_the_stack() {
        // The reason the walk is iterative. Recursion here would take the
        // application down rather than report a problem.
        let tasks: Vec<Task> = (1..=20_000)
            .map(|n| task(n, TaskStatus::Ready, &[]))
            .enumerate()
            .map(|(index, mut task)| {
                if index > 0 {
                    task.depends_on = vec![task_id(index as u32)];
                }
                task
            })
            .collect();
        assert!(validate(&tasks).is_ok());
    }

    #[test]
    fn a_dependency_on_a_task_that_does_not_exist_is_reported_not_fatal() {
        let mut task = task(1, TaskStatus::Ready, &[]);
        task.depends_on = vec![task_id(99)];
        let tasks = [task];
        let graph = Graph::new(&tasks);
        assert!(validate(&tasks).is_ok());
        assert_eq!(graph.dangling(), [(&task_id(1), task_id(99))]);
        // And it does not block: a phantom dependency would stall forever.
        assert_eq!(graph.ready().len(), 1);
    }

    #[test]
    fn ancestors_are_transitive() {
        let tasks = [
            task(1, TaskStatus::Done, &[]),
            task(2, TaskStatus::Done, &[1]),
            task(3, TaskStatus::Ready, &[2]),
        ];
        let found = ancestors(&tasks, &task_id(3));
        assert!(found.contains(&task_id(1)));
        assert!(found.contains(&task_id(2)));
        assert_eq!(found.len(), 2);
    }

    #[test]
    fn ancestors_of_a_root_are_empty() {
        let tasks = [task(1, TaskStatus::Ready, &[])];
        assert!(ancestors(&tasks, &task_id(1)).is_empty());
    }
}
