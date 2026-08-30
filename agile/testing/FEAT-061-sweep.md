<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-061 — Manual sweep

**Item:** [`agile/items/FEAT-061-brand-guide-and-showcase.md`](../items/FEAT-061-brand-guide-and-showcase.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT061-01 | Browser open | 1. Open `assets/brand/preview.html`<br>2. Toggle Dark / Light theme button | Page themes switch smoothly, background and text adapt, lockups adapt | P1 | Pass |
| SWEEP-FEAT061-02 | Browser open | 1. Click on any color swatch (e.g. Amber `#EEB04D`, Light Accent `#976317`) | Hex code or CSS variable is copied to clipboard with visual toast feedback | P1 | Pass |
| SWEEP-FEAT061-03 | Browser open | 1. Scroll to System Tray Simulator section<br>2. Observe macOS, Windows dark, and Windows light taskbar previews | Icons render crisp and contrast correctly against taskbar surfaces | P1 | Pass |
| SWEEP-FEAT061-04 | Browser open | 1. Scroll to Clearspace & Grid section<br>2. Inspect 1x and 2x clearance indicators | Clearspace box surrounds mark and wordmark with defined spacing | P2 | Pass |
| SWEEP-FEAT061-05 | Working tree clean | 1. Open `docs/branding.md`<br>2. Verify section structure and agent guidelines | All sections (Mark, Color, Typography, Agent Directives, Assets) present and clear | P1 | Pass |
