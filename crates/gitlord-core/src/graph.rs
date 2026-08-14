// SPDX-License-Identifier: GPL-3.0-or-later

//! History walking and lane assignment.
//!
//! # Lanes
//!
//! A lane is a vertical column in the graph. Lane assignment happens
//! *incrementally* as the walk produces commits — there is no second pass over
//! the history, which is what lets the graph paint while it is still loading.
//!
//! [`LaneState`] holds one slot per lane, and each slot holds the commit that
//! lane is currently waiting for. Walking a commit means: take the lane that was
//! waiting for you, hand it to your first parent, and give every other parent a
//! lane of its own branching out of yours. Lanes that were waiting for the same
//! commit converge on it and are released.
//!
//! # Edges
//!
//! Rows are self-contained: a row carries the lane segments for the band
//! **above** it, from the previous row's center down to its own. That band is
//! exactly [`ROW_PITCH`] tall, so an edge only needs lane indices — the y
//! coordinates fall out of the row index on the drawing side.
//!
//! A segment with `from == to` is a straight vertical. Otherwise it is a cubic
//! elbow spanning that one row: a branch-out leaves its node and arrives in its
//! new lane one row down, then runs straight; a merge runs straight down its own
//! lane and bends into the node in the last row before it.

use std::collections::HashMap;

use gix::ObjectId;
use serde::Serialize;

use crate::error::{Error, Result};
use crate::refs::{RefChip, RefIndex};

/// Height of one commit row in CSS pixels.
///
/// This mirrors `ROW_PITCH` in `src/lib/metrics.ts`, which is the source of
/// truth for the frontend. It exists here because lane geometry is described in
/// row units, and the two must not drift; `metrics_match` asserts they agree.
pub const ROW_PITCH: u32 = 26;

/// Lane colors cycle through this many values. A lane keeps the color it was
/// allocated for its whole lifetime, so a long-lived branch keeps one color.
pub const LANE_COLOR_COUNT: usize = 5;

/// How many rows are emitted per event. Small enough that the first paint is
/// immediate, large enough that a long walk isn't dominated by IPC overhead.
pub const BATCH: usize = 256;

/// One lane segment in the band above a row.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaneEdge {
    /// Lane index at the top of the band.
    pub from: usize,
    /// Lane index at the bottom of the band.
    pub to: usize,
    /// Index into the lane color cycle.
    pub color: usize,
}

/// One commit row: everything needed to paint it, with no global state.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphRow {
    /// Absolute index in the walk. The row sits at `y = index * ROW_PITCH`.
    pub index: usize,
    pub id: String,
    pub short: String,
    pub summary: String,
    pub author_name: String,
    /// Up to two uppercase letters, drawn inside the node.
    pub initials: String,
    /// Author time, seconds since the unix epoch.
    pub time: i64,
    pub lane: usize,
    pub color: usize,
    pub parents: Vec<String>,
    pub refs: Vec<RefChip>,
    pub edges: Vec<LaneEdge>,
}

/// What [`LaneState::step`] worked out for one commit.
#[derive(Debug, Clone)]
pub struct RowLanes {
    pub lane: usize,
    pub color: usize,
    pub edges: Vec<LaneEdge>,
}

/// Incremental lane assignment. Feed it commits in walk order.
#[derive(Debug, Default)]
pub struct LaneState {
    /// Lane -> the commit that lane is waiting for.
    active: Vec<Option<ObjectId>>,
    /// Lane -> color index, fixed when the lane is allocated.
    colors: Vec<usize>,
    /// Lane -> the lane it branched out of, for the band above the *next* row.
    /// Cleared every step.
    origin: Vec<Option<usize>>,
    /// Merge edges that route into a lane which already exists, to be drawn in
    /// the band above the *next* row alongside that lane's own segment.
    joins: Vec<LaneEdge>,
    next_color: usize,
    row: usize,
}

impl LaneState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Lanes currently in use. Useful for tests and for sizing the lane column.
    pub fn width(&self) -> usize {
        self.active.iter().filter(|s| s.is_some()).count()
    }

    /// Take the lowest free lane, or add one. The new lane gets the next color
    /// in the cycle.
    fn alloc(&mut self) -> usize {
        let lane = match self.active.iter().position(Option::is_none) {
            Some(lane) => lane,
            None => {
                self.active.push(None);
                self.colors.push(0);
                self.origin.push(None);
                self.active.len() - 1
            }
        };
        self.colors[lane] = self.next_color % LANE_COLOR_COUNT;
        self.next_color = self.next_color.wrapping_add(1);
        self.origin[lane] = None;
        lane
    }

    /// Advance by one commit.
    pub fn step(&mut self, id: ObjectId, parents: &[ObjectId]) -> RowLanes {
        // Which lanes were waiting for this commit? The lowest one becomes the
        // node's lane; any others are duplicate edges that converge here.
        let mut mine: Option<usize> = None;
        let mut converging: Vec<usize> = Vec::new();
        for (lane, slot) in self.active.iter().enumerate() {
            if *slot == Some(id) {
                match mine {
                    None => mine = Some(lane),
                    Some(_) => converging.push(lane),
                }
            }
        }

        // No lane was waiting: this commit is a tip nothing has descended from
        // yet, so it starts a new lane and has nothing drawn above it.
        let is_tip = mine.is_none();
        let lane = match mine {
            Some(lane) => lane,
            None => {
                let lane = self.alloc();
                self.active[lane] = Some(id);
                lane
            }
        };
        let color = self.colors[lane];

        // The band above this row: one segment per lane that was active there.
        let mut edges = Vec::new();
        if self.row > 0 {
            for l in 0..self.active.len() {
                if self.active[l].is_none() {
                    continue;
                }
                if is_tip && l == lane {
                    // Allocated a moment ago; there is nothing above it to draw.
                    continue;
                }
                let from = self.origin[l].unwrap_or(l);
                let to = if self.active[l] == Some(id) { lane } else { l };
                edges.push(LaneEdge { from, to, color: self.colors[l] });
            }
        }
        // Merge edges recorded by the previous row, which join a lane that
        // already existed rather than opening one of their own. If that lane is
        // the one arriving at this commit, the join lands on the node too.
        for join in std::mem::take(&mut self.joins) {
            let to = if self.active[join.to] == Some(id) { lane } else { join.to };
            edges.push(LaneEdge { to, ..join });
        }

        for slot in self.origin.iter_mut() {
            *slot = None;
        }

        // Converging lanes have arrived; release them.
        for l in converging {
            self.active[l] = None;
        }

        // The first parent inherits this lane and its color, which is what keeps
        // a long-lived branch on one color for its whole length.
        //
        // Every other parent either joins a lane that is already waiting for it,
        // or opens a new one. Reusing the existing lane is what keeps the graph
        // narrow: giving each merge edge a lane of its own is correct but makes
        // width grow with the number of *edges* in flight rather than the number
        // of distinct commits awaited. On a merge-heavy history that is the
        // difference between a graph 60 lanes wide and one 400 lanes wide.
        match parents.split_first() {
            None => self.active[lane] = None,
            Some((first, rest)) => {
                self.active[lane] = Some(*first);
                for parent in rest {
                    match self.active.iter().position(|slot| *slot == Some(*parent)) {
                        // Already awaited: draw an edge into that lane and let
                        // the two lines converge there.
                        Some(existing) => self.joins.push(LaneEdge {
                            from: lane,
                            to: existing,
                            color: self.colors[existing],
                        }),
                        None => {
                            let branched = self.alloc();
                            self.active[branched] = Some(*parent);
                            self.origin[branched] = Some(lane);
                        }
                    }
                }
            }
        }

        self.row += 1;
        RowLanes { lane, color, edges }
    }
}

/// What the sink wants the walk to do next.
pub enum Flow {
    Continue,
    Stop,
}

/// Walk history from `tips`, newest first, assigning lanes as we go.
///
/// `sink` is called once per commit and decides whether to keep going. It is
/// also the backpressure valve: a sink that has delivered everything the UI
/// asked for can block inside the call until more is requested, which is how
/// the windowing in `src-tauri` works. Nothing here ever walks to the end of
/// history before producing its first row.
pub fn walk<F>(
    repo: &gix::Repository,
    tips: Vec<ObjectId>,
    refs: &RefIndex,
    mut sink: F,
) -> Result<usize>
where
    F: FnMut(GraphRow) -> Flow,
{
    if tips.is_empty() {
        return Err(Error::EmptyRepository);
    }

    // Newest first, by commit time. This is what `git log` shows by default and
    // what the graph's row order means: down the screen is back in time.
    let walk = repo
        .rev_walk(tips)
        .sorting(gix::revision::walk::Sorting::ByCommitTime(
            gix::traverse::commit::simple::CommitTimeOrder::NewestFirst,
        ))
        .all()
        .map_err(|e| Error::Walk(e.to_string()))?;

    let mut lanes = LaneState::new();
    let mut index = 0usize;
    // Author-name -> initials. Repositories repeat a handful of authors
    // thousands of times; this keeps it to one computation each.
    let mut initials_cache: HashMap<String, String> = HashMap::new();

    for info in walk {
        let info = info.map_err(|e| Error::Walk(e.to_string()))?;
        let id = info.id;
        let parents: Vec<ObjectId> = info.parent_ids.iter().copied().collect();

        let commit = repo
            .find_commit(id)
            .map_err(|e| Error::Walk(e.to_string()))?;

        // An unparseable signature is not worth dropping a commit over; fall
        // back to the walk's own commit time, which is already known.
        let (author_name, time) = match commit.author() {
            Ok(sig) => (
                sig.name.to_string(),
                sig.time().map(|t| t.seconds).unwrap_or_else(|_| info.commit_time.unwrap_or(0)),
            ),
            Err(_) => (String::new(), info.commit_time.unwrap_or(0)),
        };

        let summary = commit
            .message()
            .map(|m| m.summary().to_string())
            .unwrap_or_default();

        let initials = initials_cache
            .entry(author_name.clone())
            .or_insert_with(|| initials(&author_name))
            .clone();

        let RowLanes { lane, color, edges } = lanes.step(id, &parents);

        let row = GraphRow {
            index,
            id: id.to_string(),
            short: short_id(&id),
            summary,
            author_name,
            initials,
            time,
            lane,
            color,
            parents: parents.iter().map(ObjectId::to_string).collect(),
            refs: refs.chips_for(&id),
            edges,
        };

        index += 1;
        if let Flow::Stop = sink(row) {
            break;
        }
    }

    Ok(index)
}

/// The tips to walk from: every local and remote branch, plus HEAD.
///
/// This is the graph's "all branches" mode, which is the default in the
/// handoff. Walking from HEAD alone would hide every branch not merged into it.
pub fn all_tips(repo: &gix::Repository) -> Result<Vec<ObjectId>> {
    let mut tips = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Ok(head) = repo.head_id() {
        let id = head.detach();
        if seen.insert(id) {
            tips.push(id);
        }
    }

    let platform = repo.references().map_err(|e| Error::Refs(e.to_string()))?;
    let iter = platform
        .prefixed("refs/heads/")
        .map_err(|e| Error::Refs(e.to_string()))?;
    for reference in iter.filter_map(std::result::Result::ok) {
        if let Some(id) = reference.try_id().map(|id| id.detach()) {
            if seen.insert(id) {
                tips.push(id);
            }
        }
    }

    let iter = platform
        .prefixed("refs/remotes/")
        .map_err(|e| Error::Refs(e.to_string()))?;
    for reference in iter.filter_map(std::result::Result::ok) {
        if let Some(id) = reference.try_id().map(|id| id.detach()) {
            if seen.insert(id) {
                tips.push(id);
            }
        }
    }

    Ok(tips)
}

/// Seven hex characters, matching what git shows by default.
pub fn short_id(id: &ObjectId) -> String {
    let hex = id.to_string();
    hex[..hex.len().min(7)].to_string()
}

/// Up to two uppercase letters for the node glyph.
///
/// "Ada Lovelace" -> AL, "torvalds" -> TO, "" -> ?.
fn initials(name: &str) -> String {
    let words: Vec<&str> = name.split_whitespace().collect();
    let letters: String = match words.len() {
        0 => return "?".to_string(),
        1 => words[0].chars().filter(|c| c.is_alphanumeric()).take(2).collect(),
        _ => words
            .iter()
            .filter_map(|w| w.chars().find(|c| c.is_alphanumeric()))
            .take(2)
            .collect(),
    };
    if letters.is_empty() {
        "?".to_string()
    } else {
        letters.to_uppercase()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn oid(n: u8) -> ObjectId {
        let mut bytes = [0u8; 20];
        bytes[0] = n;
        ObjectId::from_bytes_or_panic(&bytes)
    }

    /// Straight history: everything stays in lane 0 with one color.
    #[test]
    fn linear_history_uses_one_lane() {
        let mut lanes = LaneState::new();
        let a = lanes.step(oid(1), &[oid(2)]);
        let b = lanes.step(oid(2), &[oid(3)]);
        let c = lanes.step(oid(3), &[]);

        assert_eq!((a.lane, b.lane, c.lane), (0, 0, 0));
        assert_eq!((a.color, b.color, c.color), (0, 0, 0));
        assert!(a.edges.is_empty(), "nothing is drawn above the first row");
        assert_eq!(b.edges, vec![LaneEdge { from: 0, to: 0, color: 0 }]);
        assert_eq!(lanes.width(), 0, "a root releases its lane");
    }

    /// A merge branches out, runs in its own lane, and converges again.
    #[test]
    fn merge_branches_out_and_converges() {
        let (merge, main, side, base) = (oid(1), oid(2), oid(3), oid(4));
        let mut lanes = LaneState::new();

        let m = lanes.step(merge, &[main, side]);
        assert_eq!(m.lane, 0);
        assert_eq!(lanes.width(), 2, "both parents are now expected");

        // The second parent's lane arrives one row down, elbowing out of lane 0.
        let r1 = lanes.step(main, &[base]);
        assert_eq!(r1.lane, 0);
        assert!(
            r1.edges.contains(&LaneEdge { from: 0, to: 1, color: 1 }),
            "the branch-out elbow spans exactly the row below its node: {:?}",
            r1.edges
        );

        let r2 = lanes.step(side, &[base]);
        assert_eq!(r2.lane, 1, "the side commit sits in the lane reserved for it");
        assert_eq!(r2.color, 1, "and keeps that lane's color");

        // Both lanes now wait for `base`; it converges them.
        let r3 = lanes.step(base, &[]);
        assert_eq!(r3.lane, 0, "convergence lands in the lowest waiting lane");
        assert!(
            r3.edges.contains(&LaneEdge { from: 1, to: 0, color: 1 }),
            "the merge-in elbow keeps the incoming lane's color: {:?}",
            r3.edges
        );
        assert_eq!(lanes.width(), 0);
    }

    /// A freed lane is reused rather than the graph growing without bound.
    #[test]
    fn lanes_are_reused() {
        let mut lanes = LaneState::new();
        lanes.step(oid(1), &[oid(2), oid(3)]);
        lanes.step(oid(2), &[]); // releases lane 0
        let r = lanes.step(oid(3), &[oid(4), oid(5)]);
        assert_eq!(r.lane, 1);
        assert_eq!(lanes.width(), 2, "lane 0 was free and got picked up again");
    }

    /// A merge whose second parent is already awaited must not open a lane for
    /// it. This is what keeps width proportional to distinct commits in flight
    /// rather than to merge edges, and it is the difference between a readable
    /// graph and an unreadable one on a merge-heavy history.
    #[test]
    fn merge_edges_reuse_an_awaited_lane() {
        let (a, b, c, d) = (oid(1), oid(2), oid(3), oid(4));
        let mut lanes = LaneState::new();

        // `a` is a merge: lane 0 continues to `b`, lane 1 opens for `c`.
        lanes.step(a, &[b, c]);
        assert_eq!(lanes.width(), 2);

        // `b` is also a merge, and its second parent `c` is the commit lane 1
        // is already waiting for. Opening a third lane here is what used to
        // make merge-heavy histories hundreds of lanes wide.
        lanes.step(b, &[d, c]);
        assert_eq!(lanes.width(), 2, "no lane opened for an already-awaited commit");
    }

    /// Reusing a lane must not mean losing the edge: a merge into an existing
    /// lane still draws a line leaving its node.
    #[test]
    fn a_joining_merge_edge_is_drawn() {
        let (a, b, c, d) = (oid(1), oid(2), oid(3), oid(4));
        let mut lanes = LaneState::new();

        lanes.step(a, &[b, c]);
        lanes.step(b, &[d, c]); // second parent joins lane 1

        // The join is drawn in the band above the row it arrives at, keeping
        // the colour of the lane it merges into.
        let row = lanes.step(c, &[]);
        assert!(
            row.edges.contains(&LaneEdge { from: 0, to: 1, color: 1 }),
            "the join edge must reach lane 1: {:?}",
            row.edges
        );
    }

    #[test]
    fn colors_cycle_and_stick_to_a_lane() {
        let mut lanes = LaneState::new();
        // One commit with six parents allocates six lanes.
        let parents: Vec<ObjectId> = (10..16).map(oid).collect();
        lanes.step(oid(1), &parents);

        let first = lanes.step(parents[0], &[]);
        assert_eq!(first.color, 0);
        // The sixth lane wraps around to the first color.
        let sixth = lanes.step(parents[5], &[]);
        assert_eq!(sixth.color, 5 % LANE_COLOR_COUNT);
    }

    #[test]
    fn initials_are_two_letters() {
        assert_eq!(initials("Ada Lovelace"), "AL");
        assert_eq!(initials("torvalds"), "TO");
        assert_eq!(initials("Jean-Luc Picard Jr"), "JP");
        assert_eq!(initials(""), "?");
        assert_eq!(initials("   "), "?");
    }
}
