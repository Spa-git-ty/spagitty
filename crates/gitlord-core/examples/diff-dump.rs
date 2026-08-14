// SPDX-License-Identifier: GPL-3.0-or-later

//! Print a commit's diff the way the Diff screen would show it, as text.
//!
//! The output is deliberately shaped like `git show`'s, so the two can be
//! diffed against each other to check the hunk headers, the context and the
//! line numbering without starting the app:
//!
//!     cargo run -p gitlord-core --example diff-dump -- /path/to/repo <sha>
//!     git -C /path/to/repo show --no-color --no-renames <sha>

use gitlord_core::diff::{self, LineOrigin};
use gitlord_core::repo;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let path = args.next().unwrap_or_else(|| ".".into());
    let commit = args.next().unwrap_or_else(|| "HEAD".into());

    let repository = repo::open(std::path::Path::new(&path))?;

    // `HEAD` and other revspecs are not the core's business; resolve here.
    let id = repository
        .rev_parse_single(commit.as_str())?
        .detach()
        .to_string();

    let summary = diff::commit_diff(&repository, &id)?;
    println!(
        "{} {}  ({} files, +{} -{})",
        summary.short,
        summary.summary,
        summary.files.len(),
        summary.added,
        summary.removed
    );

    for file in &summary.files {
        println!();
        println!("--- a/{}", file.path);
        println!("+++ b/{}", file.path);

        if file.binary {
            println!("Binary files differ");
            continue;
        }
        if file.too_large {
            println!("File is too large to diff");
            continue;
        }

        for hunk in diff::file_diff(&repository, &id, &file.path)?.hunks {
            println!("{}", hunk.header);
            for line in hunk.lines {
                let glyph = match line.origin {
                    LineOrigin::Context => ' ',
                    LineOrigin::Added => '+',
                    LineOrigin::Removed => '-',
                };
                println!("{glyph}{}", line.text);
            }
        }
    }

    Ok(())
}
