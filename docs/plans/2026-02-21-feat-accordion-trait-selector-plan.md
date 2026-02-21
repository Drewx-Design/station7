---
title: "feat: Accordion Trait Selector with Progressive Reveal"
type: feat
date: 2026-02-21
---

# feat: Accordion Trait Selector with Progressive Reveal

## Overview

Convert the flat four-category trait stack into a standard accordion pattern. One category is expanded at a time. Collapsed categories show the selected trait name as a summary. The scientist fires on every selection change regardless of which category is open, enabling free-form exploration with persistent reactivity.

## Problem Statement / Motivation

The current UI displays all 22 trait cards simultaneously in a single scrollable column. This creates two problems:

1. **Visual overwhelm** — the player sees 22 cards at once, which dilutes focus and makes the choice feel less deliberate.
2. **No progressive reveal** — there is no sense of building something step-by-step. The accordion introduces focus, letting the player concentrate on one category at a time while seeing a summary of prior picks.

The accordion is not a linear funnel — the player can bounce between categories freely. The key mechanic: the scientist fires on every selection change, so swapping a trait in a previously-completed category triggers fresh agitation.

## Proposed Solution

Replace `TraitGrid` with a `TraitAccordion` component that manages `expandedCategory` state. Each category has a clickable header and a collapsible panel. Standard accordion rules: expanding one collapses the other.

### Interaction Rules

| Rule | Behavior |
|---|---|
| Initial state | FORM expanded, others collapsed (no selections yet) |
| Select a trait | Category stays open. Selection highlighted. Scientist fires. |
| Click different category header | That category expands. Previous one collapses (shows selection summary). |
| Click already-expanded header | No-op. Always one panel open during drafting. |
| Collapsed header with selection | Shows: `FORM ▶ Gelatinous Cube` (category + arrow + trait name) |
| Collapsed header without selection | Shows: `FEATURE ▶` (category + arrow, dimmed) |
| Swap a trait | Same as selecting — scientist fires, memory clears (existing behavior) |
| No auto-advance | Player manually clicks next category header after selecting |
| Brewing/reveal phases | Accordion frozen. All categories collapsed showing summaries. |
| Play Again reset | Accordion returns to initial state (FORM expanded, no selections) |

### Decision Log

These were identified as ambiguous in the spec and resolved here:

- **Click expanded header → no-op** — Always one category open during drafting. Prevents confusing "all collapsed" state. The user's language ("clicking a collapsed tile reopens it, which collapses the currently open one") implies only collapsed tiles are clickable targets for expansion.
- **No auto-advance** — The spec says "player can bounce around freely." Auto-advance conflicts with this. The scientist streams after each pick; let the player read it.
- **Round-stream race** — Gate `roundStream.onFinish` so it only replaces the round if `selectedCount === 0`. Once the player interacts, lock in whatever data they see.
- **Brewing/reveal freeze** — All collapsed with summaries. Accordion headers non-interactive. Clean recap without interaction confusion.
- **No deselect** — Clicking an already-selected trait is a no-op. Can only swap to a different trait.
- **Selection is optimistic** — Trait card highlights immediately on click. The collapsed header summary (`FORM ▶ Gelatinous Cube`) only becomes visible when the user navigates to another category, so there's no waiting-on-stream issue. The selection state in React updates synchronously; the scientist stream is a side effect.
- **Swap agitation** — Current behavior clears `accumulatedNotes` + `moodTrajectory` on swap, so the scientist starts cold. If agitation doesn't land in testing, consider passing the *previous* note as a single `priorNote` with a flag `context: "observation_invalidated"` so the scientist reacts to the disruption rather than starting fresh. This is a prompt-tuning question, not a code architecture one.

## Technical Approach

### Files Changed

| File | Change | Lines |
|---|---|---|
| `src/components/TraitGrid.tsx` | Rename to `TraitAccordion.tsx`. Add accordion header, expand/collapse state, collapsed summary. | Major rewrite (~80 lines) |
| `src/components/TraitCard.tsx` | No changes | — |
| `src/components/Game.tsx` | Update import to `TraitAccordion`. Pass `expandedCategory` + `onExpandCategory`. Gate `roundStream.onFinish` on `selectedCount === 0`. Reset accordion on Play Again. | ~15 lines changed |
| `src/app/globals.css` | Add accordion header styles, collapse/expand animation, collapsed summary styles. Remove `.trait-category h3` static styles. | ~60 lines added, ~10 removed |

### Component Architecture

```
Game.tsx
  ├── expandedCategory: keyof Selections  (state — 'form' | 'feature' | 'ability' | 'flaw')
  │
  └── TraitAccordion
        ├── props: round, selections, onSelect, disabled, expandedCategory, onExpand
        │
        ├── AccordionHeader (per category)
        │     ├── category label (FORM, FEATURE, etc.)
        │     ├── expand arrow (▼ / ▶)
        │     └── selected trait name (when collapsed + has selection)
        │
        └── AccordionPanel (per category)
              └── trait-grid (2-column grid of TraitCards)
```

`expandedCategory` lives in `Game.tsx` because:
- Brewing/reveal phases need to override it (freeze all collapsed)
- Play Again needs to reset it to `'form'`
- It's one piece of state, not worth a custom hook

### Expand/Collapse Animation

Use CSS `grid-template-rows: 0fr → 1fr` for smooth height animation. This avoids hardcoded max-height values and works with variable-height panels (FLAW has 4 cards, others have 6).

```css
.accordion-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms ease-out;
}

.accordion-panel[data-expanded="true"] {
  grid-template-rows: 1fr;
}

.accordion-panel-inner {
  min-height: 0;
  overflow: hidden;
}
```

### Scroll Management

After expanding a category, use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on the header element. This only scrolls if the header is out of view — no jarring jumps when the user is already looking at the right place.

Trigger after transition completes (250ms timeout matching CSS duration).

## Acceptance Criteria

### Functional

- [x] FORM expanded by default on page load; FEATURE, ABILITY, FLAW collapsed
- [x] Clicking a collapsed header expands it and collapses the currently open category
- [x] Clicking the already-expanded header does nothing
- [x] Selecting a trait keeps the category open and highlights the card
- [x] Collapsed categories with a selection show the trait name in the header
- [x] Collapsed categories without a selection show just the category label (dimmed)
- [x] Scientist streams on every selection change (existing behavior preserved)
- [x] Swapping a trait clears scientist memory (existing behavior preserved)
- [x] BREW SPECIMEN button appears when all 4 selected (existing behavior preserved)
- [x] During brewing/reveal, accordion is frozen — all collapsed, non-interactive
- [x] Play Again resets accordion to initial state (FORM expanded, no selections)
- [x] Round-stream only replaces round data if no selections have been made

### Visual

- [x] Expand/collapse animates smoothly (~250ms ease-out)
- [x] Arrow indicator: ▼ for expanded, ▶ for collapsed
- [x] Collapsed summary uses monospace font consistent with existing `.trait-category h3` style
- [x] Selected trait name in collapsed header truncates with ellipsis on overflow
- [x] Header touch target is at least 44px tall (for mobile)
- [x] No scroll jumps during expand/collapse transitions
- [x] Collapsed headers have 4px gap between them (read as separate tiles, not merged block)
- [x] Existing trait card styles (hover, selected glow, pulse animation) preserved

### Accessibility

- [x] Accordion headers are `<button>` elements (keyboard accessible)
- [x] `aria-expanded` on each header reflects open/closed state
- [x] `aria-controls` links each header to its panel
- [x] Panel has `role="region"` and `aria-labelledby` linking back to header
- [x] Collapsed panels are hidden from tab order (cards not focusable)
- [x] `Enter`/`Space` on headers works (free from `<button>` — no extra code needed)

## MVP

### TraitAccordion.tsx

```tsx
'use client'

import type { Trait, Round } from '@/lib/schemas'
import { TraitCard } from './TraitCard'
import { useRef, useEffect } from 'react'

type Selections = {
  form: Trait | null
  feature: Trait | null
  ability: Trait | null
  flaw: Trait | null
}

const CATEGORY_LABELS: Record<keyof Selections, string> = {
  form: 'FORM',
  feature: 'FEATURE',
  ability: 'ABILITY',
  flaw: 'FLAW',
}

const CATEGORIES = ['form', 'feature', 'ability', 'flaw'] as const

export function TraitAccordion({ round, selections, onSelect, disabled, expandedCategory, onExpand }: {
  round: Round
  selections: Selections
  onSelect: (category: keyof Selections, trait: Trait) => void
  disabled: boolean
  expandedCategory: keyof Selections
  onExpand: (category: keyof Selections) => void
}) {
  const headerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Scroll newly expanded header into view after transition
  useEffect(() => {
    const timeout = setTimeout(() => {
      headerRefs.current[expandedCategory]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 260) // slightly after 250ms CSS transition
    return () => clearTimeout(timeout)
  }, [expandedCategory])

  return (
    <div className="trait-accordion">
      {CATEGORIES.map(category => {
        const isExpanded = expandedCategory === category
        const selection = selections[category]
        const panelId = `panel-${category}`
        const headerId = `header-${category}`

        return (
          <div key={category} className="accordion-category">
            <h3>
              <button
                ref={el => { headerRefs.current[category] = el }}
                id={headerId}
                className="accordion-header"
                data-has-selection={!!selection}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => !disabled && !isExpanded && onExpand(category)}
                disabled={disabled}
                type="button"
              >
                <span className="accordion-arrow">{isExpanded ? '▼' : '▶'}</span>
                <span className="accordion-label">{CATEGORY_LABELS[category]}</span>
                {!isExpanded && selection && (
                  <span className="accordion-selection">{selection.name}</span>
                )}
              </button>
            </h3>

            <div
              id={panelId}
              className="accordion-panel"
              data-expanded={isExpanded}
              role="region"
              aria-labelledby={headerId}
            >
              <div className="accordion-panel-inner">
                <div className="trait-grid">
                  {round.traits[category].map((trait) => (
                    <TraitCard
                      key={trait.name}
                      trait={trait}
                      selected={selection?.name === trait.name}
                      onClick={() => !disabled && onSelect(category, trait)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

### Game.tsx changes

```tsx
// Add state (near other useState calls)
const [expandedCategory, setExpandedCategory] = useState<keyof Selections>('form')

// Gate round replacement on zero selections (in roundStream onFinish)
onFinish({ object }) {
  if (object) {
    // Only replace round if player hasn't started selecting
    const hasSelections = Object.values(selections).some(s => s !== null)
    if (!hasSelections) {
      setRound(object as Round)
    }
    setPhase('drafting')
  }
}

// Reset accordion on Play Again (add to onPlayAgain)
setExpandedCategory('form')

// Replace TraitGrid with TraitAccordion in render
<TraitAccordion
  round={round}
  selections={selections}
  onSelect={onTraitSelect}
  disabled={phase !== 'drafting'}
  expandedCategory={expandedCategory}
  onExpand={setExpandedCategory}
/>
```

### globals.css additions

```css
/* === ACCORDION === */

.trait-accordion {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.accordion-category h3 {
  margin: 0;
}

.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--foreground);
  cursor: pointer;
  font-family: var(--font-mono), 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 0.2s ease;
  min-height: 44px;
  text-align: left;
}

.accordion-header:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
}

.accordion-header:disabled {
  cursor: default;
  opacity: 0.5;
}

.accordion-header[aria-expanded="true"] {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  margin-bottom: 0;
}

.accordion-header[data-has-selection="true"] {
  opacity: 1;
}

.accordion-header[data-has-selection="false"]:not([aria-expanded="true"]) {
  opacity: 0.5;
}

.accordion-arrow {
  font-size: 0.6rem;
  opacity: 0.6;
  flex-shrink: 0;
  width: 0.75rem;
}

.accordion-label {
  flex-shrink: 0;
}

.accordion-selection {
  opacity: 0.7;
  font-family: var(--font-sans), system-ui, sans-serif;
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: normal;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Expand/collapse animation via grid rows */
.accordion-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms ease-out;
}

.accordion-panel[data-expanded="true"] {
  grid-template-rows: 1fr;
}

.accordion-panel-inner {
  min-height: 0;
  overflow: hidden;
  padding: 0 1rem;
}

.accordion-panel[data-expanded="true"] .accordion-panel-inner {
  padding: 0.75rem 1rem 1rem;
}
```

## Dependencies & Risks

**Low risk.** This is a UI-only refactor. No API changes. No schema changes. No new dependencies.

| Risk | Mitigation |
|---|---|
| `grid-template-rows: 0fr/1fr` transition not supported | All modern browsers support this (Chrome 57+, Firefox 66+, Safari 10.1+). The project already uses CSS Grid. |
| Scroll jumping during expand/collapse | `scrollIntoView` with `block: 'nearest'` only scrolls when needed |
| Round-stream gating breaks something | Only changes when `setRound` is called — if player has selections, round stays as FALLBACK_ROUND which is a complete valid dataset |
| Stale `selections` in `roundStream.onFinish` closure | Use a ref (like existing `accumulatedNotesRef` pattern) to read current selections inside the callback |

## References

### Internal

- Current trait grid: `src/components/TraitGrid.tsx` (46 lines, to be replaced)
- Game state machine: `src/components/Game.tsx:24-248` (state + handlers)
- Trait card styling: `src/app/globals.css:154-233`
- Category header styling: `src/app/globals.css:167-174`
- Brewing/reveal dim: `src/app/globals.css:306-316`
- Fallback round: `src/lib/fallback-round.ts`

### Patterns

- CSS `grid-template-rows` animation: native CSS, no library needed
- ARIA accordion pattern: W3C APG specification
