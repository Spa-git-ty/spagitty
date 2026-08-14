// SPDX-License-Identifier: GPL-3.0-or-later

//! Print the graph the way the UI would draw it, as text.
//!
//! Useful for checking lane assignment against `git log --graph --date-order`
//! without starting the app.
//!
//!     cargo run -p gitlord-core --example graph-dump -- /path/to/repo [limit]

use gitlord_core::graph::{self, Flow};
use gitlord_core::refs::RefIndex;
use gitlord_core::repo;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let path = args.next().unwrap_or_else(|| ".".into());
    let limit: usize = args.next().and_then(|n| n.parse().ok()).unwrap_or(40);

    let repository = repo::open(std::path::Path::new(&path))?;
    let refs = RefIndex::build(&repository)?;
    let tips = graph::all_tips(&repository)?;

    println!("{} tips, HEAD on {:?}", tips.len(), refs.current_branch());
    println!(
        "{:<4} {:<8} {:<5} {:<28} summary",
        "row", "sha", "lane", "edges (from>to:color)"
    );

    let mut seen = 0;
    graph::walk(&repository, tips, &refs, |row| {
        let edges: Vec<String> = row
            .edges
            .iter()
            .map(|e| format!("{}>{}:{}", e.from, e.to, e.color))
            .collect();

        let chips: Vec<&str> = row.refs.iter().map(|r| r.name.as_str()).collect();
        let label = if chips.is_empty() {
            String::new()
        } else {
            format!(" [{}]", chips.join(", "))
        };

        println!(
            "{:<4} {:<8} {:<5} {:<28} {}{}",
            row.index,
            row.short,
            format!("{}/{}", row.lane, row.color),
            edges.join(" "),
            row.summary,
            label
        );

        seen += 1;
        if seen >= limit {
            Flow::Stop
        } else {
            Flow::Continue
        }
    })?;

    Ok(())
}
