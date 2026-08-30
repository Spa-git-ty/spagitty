<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-061 — Brand Guide & Interactive Showcase

**Status:** Open on `feature/FEAT-061-brand-guide-and-showcase`.
**Screens:** `assets/brand/preview.html`, `docs/branding.md`.
**Raised by:** the author: "this branding page is awful can you make another one , move this to trashbin and rewrite full guide of branding for me and for agents".

## Problem

The previous brand preview page was an unstyled, static skeleton without interactive inspection tools, clearspace overlays, copyable design tokens, platform simulation (macOS menu bar / Windows & Linux system trays), or modern presentation. Furthermore, `docs/branding.md` lacked exhaustive guidance for AI agents and human contributors regarding exact color roles, component token mappings, typography specifications, clearspace calculations, and strict anti-drift invariants.

## Change

1. **Comprehensive Branding Guide (`docs/branding.md`):**
   - Detailed brand philosophy, metaphor, and tone of voice.
   - Hand-drawn mark anatomy (Amber plate `#EEB04D`, Dark Strands `#454447`, 912×953 geometry, flat rendering mandate).
   - Complete color token matrix (brand palette, interactive accents, UI lane colors, contrast ratios, and theme adaptation rules).
   - Wordmark and typography specifications (Inter weight 660, 45 units/em tracking, optical lockup alignments).
   - Platform icon and system tray specs (macOS template mono, light/dark taskbar variants).
   - Strict Developer and AI Agent directives (invariants, code rules, do/don't enforcement).
   - Asset inventory, generator workflows, and licensing.

2. **Interactive Brand Showcase (`assets/brand/preview.html` & `tools/make-brand.py`):**
   - High-craft, responsive dark/light interface with live theme toggling and zoom inspection.
   - Interactive design tokens with click-to-copy HEX, RGB, and CSS variables, with WCAG contrast indicators.
   - Live clearspace overlay demonstrating 1x and 2x clearance perimeters.
   - Side-by-side app icon matrix across all render dimensions (16px to 1024px) with pixel-grid zoom.
   - Simulated macOS menu bar and Windows/Linux dark & light system trays displaying live template icons.
   - Visual Do's & Don'ts comparison cards highlighting prohibited treatments (no Git orange, no gradients, no shadows).
   - Self-contained, offline-first design with embedded assets, requiring zero network access.
   - Generator synchronization in `tools/make-brand.py` ensuring byte-for-byte CI Gate 2 validation.

## Non-scope

- Changing the author's original hand-drawn mark geometry in `assets/brand/mark.svg`.
- Altering core application layout logic or Rust backend code.

## Acceptance criteria

- `assets/brand/preview.html` renders cleanly offline with interactive theme switching, copyable color tokens, platform tray simulators, and clearspace visualizer.
- `docs/branding.md` provides an exhaustive reference for both human designers and AI agents.
- `bun run test tools/record.test.ts` passes with zero errors.
- `tools/make-brand.py` generates the new showcase deterministically.
