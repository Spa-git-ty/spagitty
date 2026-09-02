# Spagitty Brand & Identity Guide

> **Audience:** Human contributors, designers, and AI coding agents working on Spagitty.
> **Canonical Status:** Settled brand authority. All assets are generated deterministically from `assets/brand/mark.svg`.

---

## 1. Brand Concept & Story

Spagitty is a cross-platform, local-first desktop Git client for repositories
where people and coding agents commit side by side.

### The Words We Lead With

These are the approved forms. They exist because a product describes itself the
same way everywhere or it does not have a description at all.

| Use | Text |
| --- | --- |
| **Tagline** | Untangle the work — yours, and your agents'. |
| **One-line descriptor** | A local-first desktop Git client for repositories where people and coding agents commit side by side. |
| **Short descriptor** | A desktop Git client built for the review that follows fast work. |
| **Category** | Desktop Git client. |

Rules that the wording has to keep:

- **"Agents" are named as collaborators, never as a product we sell.** Spagitty
  does not run agents; it is where the work they did is read, reviewed and
  landed. A tagline that promises orchestration describes software that does not
  exist, and the first person to open the application would find that out.
- **Never "AI-powered".** Nothing in Spagitty is a model. Saying otherwise
  trades the one thing a local-first tool has, which is that you can tell what
  it is doing.
- **The possessive is on the agents, not the user.** "yours, and your agents'"
  — plural possessive, apostrophe after the s. It is the most commonly
  mistyped part of the tagline.
- **The em dash is an em dash**, not a hyphen, and the tagline ends in a full
  stop. It is a sentence.
- **Keep the metaphor literal.** Tangled and straightened, pasta and strands.
  Do not extend it into cooking, chefs or kitchens in product copy — that
  register belongs to the delight layer, where it is deliberately a joke, and
  mixing the two makes the serious claims read as jokes too.

### The Name & Metaphor
The name **Spagitty** (*spa-gi-ty*) is a deliberate portmanteau of **spaghetti** and **Git**. 
A complex Git repository without clear visual lane graphs, branch divergence tracking, and structured review trails quickly becomes a messy plate of tangled pasta. Spagitty's mission is to untangle the pasta bowl into clear, straight strands of intent that developers can navigate with absolute confidence.

### Brand Tone of Voice
- **Honest & Direct:** We state what actions do without patronizing marketing speak or artificial excitement.
- **Crafted & Precise:** Geometry is deliberate, flat, and legible down to 16-pixel icons.
- **Respectful of the Machine:** Zero bloat, instant response, local-first offline operation.

---

## 2. The Mark

The core symbol of Spagitty is the **author's original hand-drawn mark**.

```
       ┌────────────────────────┐
       │   /\  /\  __  /\       │  <- Tangle at top (unorganized commits / branches)
       │   │ \/  \/  \/  \      │
       │   │  │   │   │   │     │
       │   │  │   │   │   │     │  <- Straight strands (untangled, clean Git history)
       │   │  │   │   │   │     │
       └────────────────────────┘
            Amber Plate (#EEB04D)
            Dark Strands (#454447)
```

### Anatomy & Geometry
1. **The Amber Plate (`#EEB04D`):** A warm, welcoming rounded ground plate symbolizing the plate/canvas.
2. **The Four Dark Strands (`#454447`):** Four pasta strands that begin tangled and overlapping at the top and resolve into straight, parallel paths flowing downward.
3. **Master Vector Source:** `assets/brand/mark.svg` (and its identical twin `src-tauri/icons/mark.svg`) on a `912 × 953` viewBox.

### Flat Design Mandate
- **Strictly Flat:** The mark contains zero linear gradients, radial gradients, drop shadows, inner bevels, or outlines.
- **Non-destructive:** The vector path data in `assets/brand/mark.svg` is permanent and is never manually redrawn or replaced by an algorithmic approximation.

---

## 3. Color Palette & Design Tokens

### 3.1 Primary Brand Colors

| Token | Hex | RGB | Description / Role |
| --- | --- | --- | --- |
| `--brand-amber` | `#EEB04D` | `rgb(238, 176, 77)` | The core plate color of the brand mark. |
| `--brand-ink` | `#454447` | `rgb(69, 68, 71)` | The dark charcoal of the pasta strands and light-theme wordmark. |
| `--brand-ink-dark` | `#CDD6F4` | `rgb(205, 214, 244)` | The soft white/light ink used for wordmarks and text on dark surfaces. |

### 3.2 Interactive UI Accent Tokens

Spagitty adapts its interactive accent color based on theme tone to preserve strict WCAG accessibility contrast:

| Theme Surface | CSS Token | Hex Value | Contrast Ratio | Usage |
| --- | --- | --- | --- | --- |
| **Dark Themes** (Mocha, Dracula, Tokyo Night, Gruvbox Dark) | `var(--accent)` | `#EEB04D` | **> 7.2:1 (AAA)** | Focus rings, primary buttons, active tabs, selected branch chips |
| **Light Themes** (Latte, Alucard, Tokyo Day, Gruvbox Light) | `var(--accent)` | `#976317` | **4.6:1 (AA)** | Darkened amber for readable links, active states, and borders |

### 3.3 Semantic & Graph Lane Colors

The application utilizes a complementary set of vibrant, distinguished lane hues for the commit graph and status feedback:

| CSS Variable | Default Hex | Semantic Usage |
| --- | --- | --- |
| `--lane-1` | `#89B4FA` | Graph branch lane 1 (Blue) |
| `--lane-2` | `#A6E3A1` | Graph branch lane 2 (Green) / Added status |
| `--lane-3` | `#F9E2AF` | Graph branch lane 3 (Yellow) |
| `--lane-4` | `#CBA6F7` | Graph branch lane 4 (Mauve / Purple) |
| `--lane-5` | `#F38BA8` | Graph branch lane 5 (Pink / Danger / Deleted) |
| `--warn` | `#F38BA8` | Warnings and uncommitted alerts |
| `--danger` | `#F38BA8` | Destructive actions (discard, delete, force) |

---

## 4. Typography & Wordmark

### 4.1 Wordmark Specification
The wordmark consists of the lowercase text `spagitty` set in **Inter**:
- **Typeface:** Inter (SIL Open Font License 1.1, bundled in `assets/brand/font/Inter.ttf`).
- **Case:** Strictly lowercase (`spagitty`).
- **Weight:** 660 (Semi-Bold / Bold optical blend).
- **Tracking / Letterspacing:** `+45` units per 1000 em (`0.045em`).

```
    [ MARK ]   spagitty
       ▲          ▲
    Amber      Inter 660, lowercase
    Plate      Tracking +0.045em
```

### 4.2 The Lockup
The **Lockup** combines the mark on the left and the wordmark on the right along a shared optical center horizontal baseline.
- **Ratio / Gap:** The gap between the mark and the wordmark is equal to `1.1 × em` (approximately 20% of the mark's height).
- **Variants:**
  - `lockups/lockup-ink-light.png` & `lockups/lockup.svg`: Light wordmark text for dark backgrounds (`#181825`).
  - `lockups/lockup-ink-dark.png`: Dark charcoal text (`#454447`) for light backgrounds (`#EFF1F5`).

### 4.3 Clearspace
A mandatory clearspace boundary of **1X** (where X = 15% of the mark's total height) must surround the mark and lockup on all four sides. No text, icons, borders, or secondary visual elements may intrude into this zone.

---

## 5. Iconography & Platform Asset Matrix

All platform assets are generated automatically from `mark.svg` by `tools/make-icons.py` and `tools/make-brand.py`:

| Output Target | File Path | Dimensions | Treatment |
| --- | --- | --- | --- |
| **Master Mark** | `assets/brand/brand-mark.png` | 512 × 512 | Standalone full-res amber plate + strands |
| **README Banner** | `assets/brand/hero.png` | 1600 × 400 | Amber mark + wordmark + tagline banner |
| **App Icon (PNG)** | `src-tauri/icons/{16,32,128,256,512}x{...}.png` | 16² to 1024² | High-DPI app icon set with `@2x` assets |
| **Windows Icon** | `src-tauri/icons/icon.ico` | Multi-size ICO | Embedded 16, 32, 48, 64, 128, 256 px frames |
| **macOS Icon** | `src-tauri/icons/icon.icns` | Multi-size ICNS | Apple standard icon bundle |
| **macOS Menu Bar** | `src-tauri/icons/menubar-mono.png` | 18 × 18 (`@2x`: 36²) | Pure alpha monochrome template (strands only) |
| **Dark System Tray** | `src-tauri/icons/tray-white.png` | 22 × 22 (`@2x`: 44²) | Pure white strands for dark taskbars |
| **Light System Tray** | `src-tauri/icons/tray-black.png` | 22 × 22 (`@2x`: 44²) | Dark charcoal strands for light taskbars |
| **Web Favicon** | `assets/brand/favicon/favicon.ico` | Multi-size ICO | Web browser tab icon |

---

## 6. Binding Directives for AI Agents & Developers

When writing code, documentation, CSS, or adding visual components to Spagitty, AI agents and human contributors **MUST** follow these rules:

1. **NEVER use the Git Logo or Git Orange:**
   - Spagitty is an independent client. Never use the official Git diamond logo, Git badge, or Git orange (`#F05133`).
2. **NEVER Redraw or Approximate the Mark:**
   - Do not generate procedural noodles, bezier approximations, or CSS pseudo-element icons for Spagitty's mark. Always reference `assets/brand/mark.svg` or the generated PNGs in `src-tauri/icons/`.
3. **NEVER Add Gradients or Drop Shadows to Brand Assets:**
   - In accordance with TASK-023, TASK-026, and FEAT-060, all branding is strictly flat.
4. **ALWAYS Use Theme-Aware CSS Variables:**
   - In Svelte components and stylesheets, use `var(--accent)` or `var(--brand-amber)`. Never hardcode raw hex values like `#EEB04D` into component styles where light-mode adaptability is required.
5. **Enforce Deterministic Asset Generation:**
   - Whenever brand collateral is updated, run `python3 tools/make-brand.py` and `python3 tools/make-icons.py`. Gate 2 in CI (`gates.yml`) strictly rejects any PR with drifted asset bytes.
6. **Preserve Menu Bar Template Rules:**
   - Menubar/tray icons on macOS MUST only contain the four strands without the amber plate background to conform to macOS Human Interface Guidelines for menu bar items.

---

## 7. Licensing & Attribution

- **Spagitty Brand Artwork & Code:** Licensed under the **GNU General Public License v3.0 or later (GPL-3.0-or-later)**.
- **Inter Typeface:** Licensed under the **SIL Open Font License 1.1 (OFL-1.1)**, bundled locally at `assets/brand/font/OFL.txt`.
