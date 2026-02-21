---
status: pending
priority: p2
issue_id: 13
tags: [code-review, performance]
---

# Bestiary array grows without limit across Play Again cycles

## Problem Statement
At Game.tsx line 197, `setBestiary(prev => [...prev, object as Creature])` appends every brewed creature forever. After 20+ rounds, the bestiary holds 20+ full `Creature` objects (each with narrative, epitaph, color_palette, and 8 other fields). This array is never trimmed, never paginated, and is rendered as a horizontal scroll in the Bestiary component. DOM node count and memory grow linearly with no upper bound.

## Findings
- **Location:** `src/components/Game.tsx:197`
- **Confidence:** 0.88
- **Source Agents:** performance

## Stakeholder Impact
- **Developer:** The fix is trivial: `setBestiary(prev => [...prev, object].slice(-20))`. The horizontal scroll rendering in Bestiary.tsx would need no changes. Virtualization is overkill for a cap of 20.
- **Operations:** No server-side impact. This is purely a client-side memory concern. In practice, a player would need to complete 50+ rounds in a single session to notice degradation, which is unlikely but not impossible.

## Failure Scenarios
- **Extended play session:** A player completes 50+ rounds in a single browser session (possible during testing or demo scenarios). 50 Creature objects in memory (~50KB+ of JSON data). 50 bestiary cards rendered in the horizontal scroll. Each card has 5+ DOM nodes. On mobile, the 250+ DOM nodes in the scroll container may cause scroll jank.
- **Memory pressure on low-end devices:** Player on a low-RAM mobile device plays 20+ rounds with the tab open. Combined with the streaming state, ref-synced arrays, and React's retained fiber tree, memory usage grows linearly per round with no garbage collection opportunity for old creatures.

## Proposed Solutions

### Option A: Cap the array (primary)
Cap the array in the onFinish callback:
```typescript
setBestiary(prev => [...prev, object as Creature].slice(-20))
```
This keeps the 20 most recent creatures and bounds memory/DOM growth.

### Option B: Virtualized horizontal scroll
Use a lightweight virtual scroll library (e.g., `react-window`) for the bestiary bar. This allows unlimited history without DOM growth, but adds a dependency and complexity that is likely unnecessary for a capped collection.

## Acceptance Criteria
- [ ] Bestiary array never exceeds 20 entries
- [ ] Most recent creatures are retained (oldest are dropped)
- [ ] Bestiary bar renders correctly with the cap in place
- [ ] No visual regression when fewer than 20 creatures exist
- [ ] The 21st brew correctly drops the oldest creature from the array

## Work Log
- 2026-02-21: Created from code review (full main branch review)
