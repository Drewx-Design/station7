---
status: pending
priority: p2
issue_id: 15
tags: [code-review, performance]
---

# onTraitSelect recreated on every selection change due to selections dependency

## Problem Statement
The `useCallback` for `onTraitSelect` at Game.tsx line 165 depends on `[selections, fetchMicroJudgment]`. Every selection change updates `selections` state, which recreates `onTraitSelect`, which causes `TraitAccordion` to re-render all 22 `TraitCard` components. Since `TraitCard` accepts `onClick` as a prop and is not wrapped in `React.memo`, all cards re-render on every single trait selection. The `selectionsRef` already exists at line 48 and is kept in sync via `useEffect`, establishing a pattern that could be used here to remove the `selections` dependency.

## Findings
- **Location:** `src/components/Game.tsx:165`
- **Confidence:** 0.85
- **Source Agents:** performance

## Stakeholder Impact
- **Developer:** The `selectionsRef` already exists at line 48 and is kept in sync via useEffect. Using it inside `onTraitSelect` to read selections instead of depending on the state directly is a 3-line change. Adding `React.memo` to `TraitCard` is a 1-line wrapper. The pattern is already established in the codebase with `accumulatedNotesRef`.
- **Operations:** No operational impact. This is a client-side render optimization. On modern hardware, 22 TraitCard re-renders are unlikely to cause visible performance issues, but on lower-end mobile devices during streaming, the cumulative effect of re-renders from streaming + selection changes could cause jank.

## Failure Scenarios
- **Rapid trait switching:** Player rapidly clicks between traits in the same category (exploring options). Each click triggers: setState -> re-render Game -> recreate onTraitSelect -> re-render TraitAccordion -> re-render all 22 TraitCards. With streaming also updating labState, this can compound to multiple full re-renders per frame.
- **Low-end mobile device:** Player on a budget Android phone selects a trait while micro-judgment is streaming. Concurrent state updates (labState from streaming + selections from click) each trigger a full Game re-render including all children. Without React.memo on TraitCard, all 22 cards reconcile DOM on every streaming chunk.

## Proposed Solutions

### Option A: Use selectionsRef and React.memo (primary)
Change `onTraitSelect` to read from `selectionsRef`:
```typescript
const onTraitSelect = useCallback((category: keyof Selections, trait: Trait) => {
  const isSwap = selectionsRef.current[category] !== null
  const newSelections = { ...selectionsRef.current, [category]: trait }
  setSelections(newSelections)

  if (isSwap) {
    setAccumulatedNotes([])
    setMoodTrajectory([])
  }

  if (debounceRef.current) clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    const selected = Object.fromEntries(
      Object.entries(newSelections).filter(([, t]) => t !== null)
    )
    fetchMicroJudgment(selected as Record<string, Trait>)
  }, 150)
}, [fetchMicroJudgment])
```
Remove `selections` from deps. Wrap TraitCard with `React.memo`:
```typescript
export const TraitCard = React.memo(function TraitCard({ trait, selected, onClick }: { ... }) {
  // existing implementation
})
```

### Option B: Use functional setState updater
Instead of reading `selections` directly, use the `setSelections` functional updater form to access current state inside the callback, avoiding the need for a ref. This is idiomatic React but requires restructuring the handler logic.

## Acceptance Criteria
- [ ] `onTraitSelect` does not depend on `selections` in its useCallback deps array
- [ ] `selectionsRef` is used to read current selections inside the handler
- [ ] `TraitCard` is wrapped with `React.memo`
- [ ] Trait selection still works correctly (visual selection, micro-judgment triggers)
- [ ] Swap detection still correctly clears scientist memory
- [ ] No regression in debounced micro-judgment fetch behavior

## Work Log
- 2026-02-21: Created from code review (full main branch review)
