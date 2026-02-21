---
title: "refactor: Control Room Atmosphere UI Overhaul"
type: refactor
date: 2026-02-21
---

# refactor: Control Room Atmosphere UI Overhaul

## Overview

Transform the drafting phase UI from a clean "settings panel" feel to a dense "control room" atmosphere. Four changes in priority order: hero scenario banner, control-panel-style accordion headers, dramatically tightened spacing, and relocated brew status/button.

## Problem Statement

The current build is functional but reads like a settings panel — generous spacing, understated header, action button buried in the wrong panel. The target aesthetic is a mission control room: dense, purposeful, scenario-as-mission-briefing, categories-as-checklist, every pixel earning its place.

## Proposed Solution

Four targeted changes to `globals.css`, `Game.tsx`, and `TraitAccordion.tsx`. All changes use existing design tokens, data attributes, and CSS custom properties. No new dependencies.

---

## Implementation Plan

### Change 1: Hero Scenario Banner

**Files:** `src/app/globals.css` (GAME LAYOUT section), `src/components/ScenarioBar.tsx` (minor)

**Current state:**
- `ScenarioBar.tsx:7-12` — renders `FIELD LOG #NNNN`, `XENOBIOLOGY STATION 7`, and scenario text
- `.scenario-text` uses `--font-display` (Space Grotesk), `--text-display` (22px), `max-width: 640px`
- `.scenario-bar` spans full width (`grid-column: 1 / -1`) but has no background or border

**Changes:**

CSS in `globals.css`:
- `.scenario-bar`: Add `background: var(--surface-1)`, `border: 1px solid var(--border-rest)`, `border-bottom: 3px solid var(--accent)`, `padding: var(--space-3)`, `box-shadow: var(--shadow-bevel), var(--shadow-inset)` (leverages Kennedy Phase 3 materiality)
- `.scenario-header`: Add `ACTIVE SCENARIO` label above the scenario text via a `::before` pseudo-element or a new `<span>`. Style with `font-family: var(--font-mono)`, `text-transform: uppercase`, `letter-spacing: 0.15em`, `font-size: var(--text-label)`, `color: var(--color-label)`
- `.scenario-text`: Increase to `font-size: var(--text-headline)` (28px), remove `max-width: 640px`, keep `--font-display` (Space Grotesk — the scenario is narrative content, not UI chrome, so it stays in the display font)
- `.field-log-id` and `.station-id`: Already monospace. Increase letter-spacing for wider terminal feel

**Phase-aware dimming** — add `data-phase` attribute to `.scenario-bar` in `Game.tsx`:
- `[data-phase="brewing"] .scenario-bar` or scope under `.game-layout[data-phase]`: `opacity: 0.5`
- `[data-phase="reveal"]`: `opacity: 0.4`
- This prevents the hero banner from competing with the creature card during reveal

**Edge case — loading placeholder:** During `phase='loading'`, the scenario shows `'Station 7 is preparing your assignment...'`. At 28px in the hero banner, this placeholder will be more prominent when it swaps to the real scenario. Acceptable — the hero treatment makes the moment of "receiving your mission" feel deliberate.

**Edge case — long scenario text:** Without `max-width`, long scenarios (up to ~2000 chars from API) will wrap across the full width. Add `max-width: 960px` as a reasonable upper bound that still feels "full-width" without becoming a wall of text.

---

### Change 2: Control Panel Accordion Headers

**Files:** `src/app/globals.css` (TRAIT ACCORDION section), `src/components/TraitAccordion.tsx` (small JSX tweak)

**Current state:**
- `TraitAccordion.tsx:62-64` — already renders `.accordion-selection` inline when `!isExpanded && selection`
- `data-has-selection` attribute already on `.accordion-header` (`"true"` / `"false"`)
- Arrow characters: `▼` (expanded) / `▶` (collapsed)

**Changes:**

CSS:
- `.accordion-header[data-has-selection="true"]`: Add `border-color: var(--accent)`, `background: var(--accent-dim)` (green tint on selected)
- `.accordion-header[data-has-selection="false"]:not([aria-expanded="true"])`: Dim with `opacity: 0.5`, `border-color: var(--border-rest)` (unselected categories fade)
- `.accordion-header[data-has-selection="true"]::after`: Add a CSS checkmark — `content: '✓'`, `color: var(--accent)`, `margin-left: auto` (pushes to right edge). Only show when collapsed: `.accordion-header[data-has-selection="true"]:not([aria-expanded="true"])::after`
- `.accordion-selection`: Increase opacity to 1.0, use `color: var(--foreground)` for stronger readability

JSX in `TraitAccordion.tsx`:
- No bracket characters needed — the `border + background + checkmark::after` treatment achieves the control-panel checklist aesthetic without literal `[` `]` characters
- The existing structure (`arrow + label + selection name`) is sufficient

**Interaction states:**
| Category State | Expanded? | Visual |
|---|---|---|
| No selection | Yes (expanded) | Normal opacity, no green, traits visible |
| No selection | No (collapsed) | Dimmed (0.5 opacity), no green |
| Has selection | Yes (expanded) | Green border + background, traits visible, no checkmark |
| Has selection | No (collapsed) | Green border + background, trait name inline, checkmark ✓ |

---

### Change 3: Tighten Spacing

**Files:** `src/app/globals.css` (GAME LAYOUT, TRAIT ACCORDION, TRAIT CARDS, LAB NOTES sections)

**Approach:** Use nearest 8px-grid-aligned token value rather than literal halves. The Kennedy design system established `--space-1` (8px) through `--space-6` (48px); stay on-grid.

**Spacing changes:**

| Element | Property | Before | After | Token |
|---|---|---|---|---|
| `.game-layout` | `padding` | 40px (`--space-5`) | 24px (`--space-3`) | `--space-3` |
| `.game-layout` | `gap` | 32px (`--space-4`) | 16px (`--space-2`) | `--space-2` |
| `.trait-accordion` | `gap` | 8px (`--space-1`) | 8px (`--space-1`) | No change (already tight) |
| `.accordion-header` | `padding` | 16px (`--space-2`) | 12px | `calc(var(--space-1) * 1.5)` — compromise to keep 44px min-height touch target |
| `.accordion-panel-inner` | `padding` | 16px 0 | 8px 0 | `--space-1` |
| `.trait-grid` | `gap` | 16px (`--space-2`) | 8px (`--space-1`) | `--space-1` |
| `.trait-card` | `padding` | 16px (`--space-2`) | 12px | `calc(var(--space-1) * 1.5)` — denser cards without crushing text |
| `.lab-notes-container` | `padding` | 24px (`--space-3`) | 16px (`--space-2`) | `--space-2` |
| `.brew-button` | `padding` | 16px 32px | 12px 24px | Tighter profile |

**Touch target safety:** `.accordion-header` retains `min-height: 44px` (WCAG requirement). The 12px padding + text height meets this.

**Mobile override at 768px:** Current mobile padding is already 16px. After tightening, mobile padding stays 16px (no change needed — desktop is now closer to mobile density).

---

### Change 4: Relocate Brew Button / Status Indicator

**Files:** `src/components/Game.tsx` (JSX restructuring), `src/app/globals.css` (button positioning)

**Current state:**
- Brew button lives in `.lab-column` at `Game.tsx:211-219`
- Shows `SELECT N MORE` (disabled) or `BREW SPECIMEN` (enabled) or `SYNTHESIZING...` (brewing) or `NEW SPECIMEN` (reveal)
- `allSelected`, `selectedCount`, `brewReady`, `onBrew` all available in `Game.tsx` scope

**JSX change in `Game.tsx`:**

Move the button block from `.lab-column` into `.trait-column`, after `<TraitAccordion />`:

```tsx
{/* Inside .trait-column, after TraitAccordion */}
<div className="brew-status" aria-live="polite">
  {phase === 'drafting' && (
    <button
      className={`brew-button ${brewReady ? 'brew-ready-pulse' : ''}`}
      disabled={!allSelected}
      onClick={onBrew}
    >
      {allSelected ? 'READY TO BREW' : `AWAITING ${4 - selectedCount} MORE ${4 - selectedCount === 1 ? 'SELECTION' : 'SELECTIONS'}`}
    </button>
  )}
  {phase === 'brewing' && (
    <button className="brew-button" disabled>SYNTHESIZING...</button>
  )}
  {phase === 'reveal' && (
    <button className="play-again-button" onClick={onPlayAgain}>NEW SPECIMEN</button>
  )}
</div>
```

**Key decisions:**
- **All phase buttons move together** — "SYNTHESIZING..." and "NEW SPECIMEN" also render in the left column. Keeps the action position consistent across phases.
- **Wrapper `<div className="brew-status">`** with `aria-live="polite"` — screen readers announce countdown changes
- **Text rewording:** "SELECT N MORE" → "AWAITING N MORE SELECTION(S)" (with singular/plural handling). "BREW SPECIMEN" → "READY TO BREW"
- **Singular handling:** `4 - selectedCount === 1 ? 'SELECTION' : 'SELECTIONS'`
- **Brew error block** (`Game.tsx:204-209`): Keep in `.lab-column` — the error relates to the brew API response, which is contextually tied to the right panel where the creature card streams

**CSS changes:**
- `.brew-status`: `margin-top: var(--space-2)` to separate from accordion
- `.brew-button` in new position inherits `width: 100%` — already works
- Remove `.brew-button` margin/spacing from `.lab-column` context (no longer needed there)

**Tab order improvement:** Traits → brew button → lab notes. User acts on the left, reads feedback on the right. Better flow than the current traits → lab notes → button order.

---

## Acceptance Criteria

### Functional
- [ ] Scenario bar renders as a full-width hero banner with surface background, bevel, and 3px green bottom border
- [ ] Scenario text is 28px (`--text-headline`), "ACTIVE SCENARIO" label above in monospace caps
- [ ] Scenario bar dims during brewing (0.5) and reveal (0.4) phases
- [ ] Collapsed accordion headers with selection show green border, green-tinted background, trait name inline, and ✓ checkmark
- [ ] Unselected collapsed accordion headers are dimmed to 0.5 opacity
- [ ] All spacing values tightened per the spacing table above
- [ ] Touch targets maintain 44px minimum height on accordion headers
- [ ] Brew button renders below trait accordion in the left column
- [ ] Status text shows "AWAITING N MORE SELECTION(S)" with correct singular/plural
- [ ] Status text changes to "READY TO BREW" when all 4 traits selected
- [ ] "SYNTHESIZING..." and "NEW SPECIMEN" buttons also render in the left column
- [ ] `aria-live="polite"` on brew status wrapper announces countdown changes

### Visual / Atmosphere
- [ ] Overall feel shifts from "settings panel" to "control room" / "instrument panel"
- [ ] Scenario bar reads as a mission briefing, not an afterthought
- [ ] Accordion categories read as a checklist being completed
- [ ] Spacing is dense and purposeful — no wasted gaps

### Non-Regression
- [ ] Mood color system (`--mood-color` custom property) still drives trait card glows, brew button pulse, and mood background
- [ ] Fallback round → real round transition works without visual glitch
- [ ] Trait swap clears memory and re-triggers micro-judgment
- [ ] Mobile layout (< 768px) renders correctly in single column
- [ ] `prefers-reduced-motion` guards cover any new animations
- [ ] Brewing and reveal phases function unchanged (except button position and scenario dimming)

## Files Changed

| File | Change Type | Scope |
|---|---|---|
| `src/app/globals.css` | Edit | GAME LAYOUT, TRAIT ACCORDION, TRAIT CARDS, LAB NOTES, BREW BUTTONS sections |
| `src/components/Game.tsx` | Edit | Move button JSX from `.lab-column` to `.trait-column`, add `data-phase` to scenario bar |
| `src/components/ScenarioBar.tsx` | Edit | Add "ACTIVE SCENARIO" label, accept `phase` prop for `data-phase` |
| `src/components/TraitAccordion.tsx` | Edit | Minor — checkmark may use CSS `::after` with no JSX change, or small tweak if needed |

## Dependencies & Risks

**Risk: Fallback round swap at hero scale.** The scenario text swapping from placeholder to real content is more noticeable at 28px. Mitigation: the placeholder text ("Station 7 is preparing your assignment...") works as a thematic loading message in the hero format.

**Risk: Spacing too aggressive.** Halving gaps may feel cramped on smaller desktop screens. Mitigation: using grid-aligned values (not literal halves) and preserving 44px touch targets. Visual review at 1280px and 768px breakpoints.

**Risk: Button move breaks muscle memory.** Users accustomed to the current layout will look to the right for the brew button. Mitigation: the control room aesthetic makes the button position feel natural ("complete checklist on left, then brew").

## References

- **Kennedy Design System Plan (Phase 3 — Materiality):** `docs/plans/2026-02-21-refactor-kennedy-design-system-overhaul-plan.md`
- **CSS Anti-Pattern Solutions:** `docs/solutions/2026-02-21-css-design-token-migration-patterns.md`
- **Accordion Implementation Plan:** `docs/plans/2026-02-21-feat-accordion-trait-selector-plan.md`
- **Current CSS:** `src/app/globals.css` (1086 lines, all sections documented)
- **Game State Container:** `src/components/Game.tsx` (242 lines)
