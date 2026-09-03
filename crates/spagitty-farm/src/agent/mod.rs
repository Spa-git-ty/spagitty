// SPDX-License-Identifier: GPL-3.0-or-later

//! Agents: the interface, the detection, and the registry that joins them.
//!
//! Nothing above this module knows the name of a provider's executable or the
//! shape of its command line. That is the rule the plan calls "the Farm Engine
//! must never depend directly on provider-specific CLI output", and it is
//! enforced by where the strings live rather than by convention: every one of
//! them is inside [`adapters`].

pub mod adapter;
pub mod adapters;
pub mod detector;
pub mod registry;

pub use adapter::{AgentAdapter, AgentCommand, AgentRunRequest};
pub use registry::{adapter_for, AgentRegistry, AgentStatus};
