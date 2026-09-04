// SPDX-License-Identifier: GPL-3.0-or-later

//! Turning what an agent prints into something a person can watch.
//!
//! # The problem this solves
//!
//! `claude -p "<prompt>"` prints nothing at all until the turn is over, and
//! then prints the answer in one go. For a farm that is the worst possible
//! shape: a task sits at Running for minutes with an empty transcript, and the
//! screen has nothing true to say about it beyond the status word. The fix is
//! the provider's own streaming mode — `--output-format stream-json` — which
//! emits one JSON object per event as it happens.
//!
//! That output is not for reading. A single assistant event is several hundred
//! characters of envelope around eight characters of text, and the interesting
//! ones are mixed in with hook callbacks, token estimates and rate-limit
//! notices. So it is narrated here, on the way past: JSON in, the lines a
//! person would want in a log out.
//!
//! # Why the narration happens before the transcript is written
//!
//! The transcript file is not a debugging artifact. [`crate::model::Handoff`]
//! and [`crate::orchestrator::planner::Plan`] are both parsed out of it by
//! looking for a fenced block the agent was asked to write. If the raw
//! stream-json went to the file, that fence would be inside a JSON string —
//! escaped, one line, unparseable — and both would silently stop finding
//! anything. Narrating first means the file holds the agent's own words, the
//! fence survives, and everything downstream is unchanged.
//!
//! # Anything that is not an event passes through unchanged
//!
//! A line that is not JSON is emitted exactly as it arrived. Agents print
//! startup banners, version-manager noise and stray progress bars, and a
//! narrator that swallowed them would be a narrator that hides the one line
//! explaining why a run did nothing. A line that *is* one of the provider's
//! envelopes but carries a kind this does not render is dropped instead —
//! passing it through would put raw JSON in a log meant to be read.

use serde_json::Value;

/// Turns one raw output line into the lines a person should see.
///
/// Stateful, because a run's final event repeats the text of the last assistant
/// message and printing it twice would duplicate the handoff block. One
/// narrator per run, shared by the stdout and stderr readers.
pub trait Narrator: Send + std::fmt::Debug {
    fn narrate(&mut self, raw: &str) -> Vec<String>;
}

/// The default: the agent's output is already what a person should read.
///
/// Codex narrates its own work on stdout, and a custom agent is whatever the
/// user pointed at. Neither is improved by being interpreted.
#[derive(Debug, Default)]
pub struct Verbatim;

impl Narrator for Verbatim {
    fn narrate(&mut self, raw: &str) -> Vec<String> {
        vec![raw.to_string()]
    }
}

/// A marker on the lines this module wrote rather than the agent.
///
/// One character, so a narrated action reads as an event and the agent's own
/// words read as prose. It is not a status: nothing parses it.
const MARK: &str = "·";

/// Claude Code's `--output-format stream-json`.
///
/// The shapes read here were taken from a real run of `claude 2.1.259`, not
/// from documentation: `system` (with `init`, `hook_started`, `hook_response`
/// and `thinking_tokens` subtypes), `assistant` with a `message.content` array
/// of `thinking`, `text` and `tool_use` blocks, `user` carrying `tool_result`,
/// `rate_limit_event`, and a final `result`.
#[derive(Debug, Default)]
pub struct ClaudeStream {
    /// The last assistant text emitted, so the final `result` — which repeats
    /// it — is not printed a second time.
    last_text: Option<String>,
}

impl Narrator for ClaudeStream {
    fn narrate(&mut self, raw: &str) -> Vec<String> {
        let trimmed = raw.trim_start();
        if !trimmed.starts_with('{') {
            return vec![raw.to_string()];
        }
        let Ok(event) = serde_json::from_str::<Value>(trimmed) else {
            return vec![raw.to_string()];
        };

        match event.get("type").and_then(Value::as_str) {
            Some("system") => self.system(&event),
            Some("assistant") => self.assistant(&event),
            Some("user") => self.user(&event),
            Some("result") => self.result(&event),
            // A stream event of a type this does not render. Dropped rather
            // than passed through: it parsed as one of the provider's own
            // envelopes, so printing it raw would put JSON in the log.
            _ => Vec::new(),
        }
    }
}

impl ClaudeStream {
    fn system(&mut self, event: &Value) -> Vec<String> {
        // Only the session opening is worth a line. Hook callbacks and running
        // token estimates are the agent talking to itself.
        if event.get("subtype").and_then(Value::as_str) != Some("init") {
            return Vec::new();
        }
        let model = event
            .get("model")
            .and_then(Value::as_str)
            .unwrap_or("an agent");
        vec![format!("{MARK} {model} started")]
    }

    fn assistant(&mut self, event: &Value) -> Vec<String> {
        let mut lines = Vec::new();
        for block in blocks(event) {
            match block.get("type").and_then(Value::as_str) {
                Some("text") => {
                    let Some(text) = block.get("text").and_then(Value::as_str) else {
                        continue;
                    };
                    if text.trim().is_empty() {
                        continue;
                    }
                    self.last_text = Some(text.to_string());
                    lines.extend(text.lines().map(str::to_string));
                }
                Some("tool_use") => lines.push(tool_line(block)),
                // Thinking is deliberately not shown. It is long, it is not the
                // agent's answer, and a farm's log is a record of what was done.
                _ => {}
            }
        }
        lines
    }

    fn user(&mut self, event: &Value) -> Vec<String> {
        // A tool's output is the agent's input, and there is a lot of it. Only
        // failures are worth a line, because a run that goes wrong usually goes
        // wrong at a tool.
        blocks(event)
            .into_iter()
            .filter(|block| block.get("is_error").and_then(Value::as_bool) == Some(true))
            .map(|block| {
                let detail = block
                    .get("content")
                    .and_then(Value::as_str)
                    .unwrap_or("a tool failed");
                format!("{MARK} {}", clip(detail.lines().next().unwrap_or(detail)))
            })
            .collect()
    }

    fn result(&mut self, event: &Value) -> Vec<String> {
        let mut lines = Vec::new();

        // The final text repeats the last assistant message. Printing it again
        // would put a second handoff block in the transcript — harmless, since
        // the last one wins, but it reads as the agent having said everything
        // twice. Emitted only when it is genuinely new, which is what happens
        // when a run ends without an assistant message.
        if let Some(text) = event.get("result").and_then(Value::as_str) {
            if !text.trim().is_empty() && self.last_text.as_deref() != Some(text) {
                lines.extend(text.lines().map(str::to_string));
            }
        }

        if event.get("is_error").and_then(Value::as_bool) == Some(true) {
            let why = event
                .get("api_error_status")
                .and_then(Value::as_str)
                .or_else(|| event.get("subtype").and_then(Value::as_str))
                .unwrap_or("the run reported an error");
            lines.push(format!("{MARK} failed: {why}"));
            return lines;
        }

        match event.get("duration_ms").and_then(Value::as_u64) {
            Some(ms) => lines.push(format!("{MARK} finished in {}", seconds(ms))),
            None => lines.push(format!("{MARK} finished")),
        }
        lines
    }
}

/// The content blocks of an `assistant` or `user` event.
fn blocks(event: &Value) -> Vec<&Value> {
    event
        .get("message")
        .and_then(|message| message.get("content"))
        .and_then(Value::as_array)
        .map(|blocks| blocks.iter().collect())
        .unwrap_or_default()
}

/// One line for a tool call: what it was, and what it was pointed at.
///
/// The argument shown is chosen per tool rather than dumped, because the input
/// of a single `Edit` is the whole replacement text and nobody watching a farm
/// wants it in the log.
fn tool_line(block: &Value) -> String {
    let name = block
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("a tool");
    let input = block.get("input");
    let field = match name {
        "Read" | "Write" | "Edit" | "NotebookEdit" => "file_path",
        "Bash" | "BashOutput" => "command",
        "Grep" | "Glob" => "pattern",
        "Task" | "Agent" => "description",
        "WebFetch" | "WebSearch" => "url",
        _ => "",
    };
    let detail = input
        .and_then(|input| input.get(field))
        .and_then(Value::as_str)
        // An unknown tool still gets a useful line: the first string its input
        // carries is, in practice, the thing it is acting on.
        .or_else(|| {
            input
                .and_then(Value::as_object)
                .and_then(|object| object.values().find_map(Value::as_str))
        });

    match detail {
        Some(detail) => format!("{MARK} {name} {}", clip(detail.lines().next().unwrap_or(""))),
        None => format!("{MARK} {name}"),
    }
}

/// How long a line of narration may be.
///
/// A hundred and sixty characters: a `Bash` command or a path fits, a file's
/// contents does not. The transcript is read in a pane, not a terminal.
const WIDTH: usize = 160;

fn clip(text: &str) -> String {
    let text = text.trim();
    if text.chars().count() <= WIDTH {
        return text.to_string();
    }
    let kept: String = text.chars().take(WIDTH - 1).collect();
    format!("{kept}…")
}

/// A duration, for the closing line.
fn seconds(ms: u64) -> String {
    let seconds = ms / 1000;
    if seconds < 60 {
        return format!("{seconds}s");
    }
    format!("{}m {}s", seconds / 60, seconds % 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn narrate(lines: &[&str]) -> Vec<String> {
        let mut narrator = ClaudeStream::default();
        lines
            .iter()
            .flat_map(|line| narrator.narrate(line))
            .collect()
    }

    #[test]
    fn a_line_that_is_not_json_is_passed_through() {
        // The version-manager banner a shim prints before the agent starts.
        assert_eq!(
            narrate(&["mise ~/.config/mise/config.toml tools: claude@2.1.259"]),
            ["mise ~/.config/mise/config.toml tools: claude@2.1.259"]
        );
    }

    #[test]
    fn json_of_an_unknown_shape_is_not_swallowed() {
        assert_eq!(narrate(&["{ not json at all"]), ["{ not json at all"]);
    }

    #[test]
    fn the_session_opening_says_which_model_is_working() {
        let lines = narrate(&[
            r#"{"type":"system","subtype":"init","model":"claude-opus-5","tools":["Bash"]}"#,
        ]);
        assert_eq!(lines, ["· claude-opus-5 started"]);
    }

    #[test]
    fn hooks_and_token_estimates_say_nothing() {
        let lines = narrate(&[
            r#"{"type":"system","subtype":"hook_started","hook_name":"SessionStart"}"#,
            r#"{"type":"system","subtype":"thinking_tokens","estimated_tokens":153}"#,
            r#"{"type":"rate_limit_event","rate_limit_info":{"status":"allowed"}}"#,
        ]);
        assert!(lines.is_empty(), "{lines:?}");
    }

    #[test]
    fn a_tool_call_becomes_the_tool_and_what_it_touched() {
        let lines = narrate(&[
            r#"{"type":"assistant","message":{"content":[
                {"type":"tool_use","name":"Read","input":{"file_path":"src/auth.rs"}},
                {"type":"tool_use","name":"Bash","input":{"command":"cargo test","description":"run tests"}},
                {"type":"tool_use","name":"Grep","input":{"pattern":"fn main"}}
            ]}}"#,
        ]);
        assert_eq!(
            lines,
            ["· Read src/auth.rs", "· Bash cargo test", "· Grep fn main"]
        );
    }

    #[test]
    fn a_tool_nobody_has_heard_of_still_reads_as_something() {
        let lines = narrate(&[
            r#"{"type":"assistant","message":{"content":[
                {"type":"tool_use","name":"mcp__thing__do","input":{"target":"the-thing"}}
            ]}}"#,
        ]);
        assert_eq!(lines, ["· mcp__thing__do the-thing"]);
    }

    #[test]
    fn thinking_is_not_shown() {
        let lines = narrate(&[
            r#"{"type":"assistant","message":{"content":[{"type":"thinking","thinking":"long"}]}}"#,
        ]);
        assert!(lines.is_empty(), "{lines:?}");
    }

    #[test]
    fn the_agents_own_words_arrive_line_by_line() {
        let lines = narrate(&[
            r#"{"type":"assistant","message":{"content":[{"type":"text","text":"Done.\nTwo files changed."}]}}"#,
        ]);
        assert_eq!(lines, ["Done.", "Two files changed."]);
    }

    #[test]
    fn a_handoff_block_survives_narration() {
        // The whole reason narration happens before the transcript is written.
        let text = "```spagitty-handoff\\n{\\\"status\\\":\\\"completed\\\"}\\n```";
        let event =
            format!(r#"{{"type":"assistant","message":{{"content":[{{"type":"text","text":"{text}"}}]}}}}"#);
        let lines = narrate(&[&event]);
        assert_eq!(
            lines,
            ["```spagitty-handoff", r#"{"status":"completed"}"#, "```"]
        );
    }

    #[test]
    fn the_final_result_does_not_repeat_what_was_already_said() {
        let lines = narrate(&[
            r#"{"type":"assistant","message":{"content":[{"type":"text","text":"Hello."}]}}"#,
            r#"{"type":"result","subtype":"success","result":"Hello.","duration_ms":12400}"#,
        ]);
        assert_eq!(lines, ["Hello.", "· finished in 12s"]);
    }

    #[test]
    fn a_result_nobody_said_out_loud_is_still_printed() {
        // A run that produced no assistant message must not lose its answer,
        // handoff block included.
        let lines = narrate(&[
            r#"{"type":"result","subtype":"success","result":"Only here.","duration_ms":61000}"#,
        ]);
        assert_eq!(lines, ["Only here.", "· finished in 1m 1s"]);
    }

    #[test]
    fn a_failed_run_says_so_rather_than_reporting_a_duration() {
        let lines = narrate(&[
            r#"{"type":"result","subtype":"error_during_execution","is_error":true,"api_error_status":"rate limited","duration_ms":900}"#,
        ]);
        assert_eq!(lines, ["· failed: rate limited"]);
    }

    #[test]
    fn a_failing_tool_is_the_one_tool_result_worth_a_line() {
        let lines = narrate(&[
            r#"{"type":"user","message":{"content":[
                {"type":"tool_result","is_error":true,"content":"No such file\nsecond line"},
                {"type":"tool_result","content":"1\thello"}
            ]}}"#,
        ]);
        assert_eq!(lines, ["· No such file"]);
    }

    #[test]
    fn a_long_command_is_clipped_but_the_agents_prose_is_not() {
        let long = "x".repeat(500);
        let lines = narrate(&[
            &format!(r#"{{"type":"assistant","message":{{"content":[{{"type":"tool_use","name":"Bash","input":{{"command":"{long}"}}}}]}}}}"#),
            &format!(r#"{{"type":"assistant","message":{{"content":[{{"type":"text","text":"{long}"}}]}}}}"#),
        ]);
        // "· Bash " and then the clipped command, ellipsis included.
        assert!(lines[0].ends_with('…'), "{}", lines[0]);
        assert_eq!(lines[0].chars().count(), "· Bash ".chars().count() + WIDTH);
        // Prose is never clipped: the handoff block is prose.
        assert_eq!(lines[1].chars().count(), 500);
    }

    #[test]
    fn the_verbatim_narrator_changes_nothing() {
        assert_eq!(Verbatim.narrate("  spaced  "), ["  spaced  "]);
    }
}
