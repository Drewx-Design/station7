---
status: pending
priority: p2
issue_id: 9
tags: [code-review, type-safety]
---

# Selections type defined identically in 3 separate files

## Problem Statement
The `Selections` type (`{form: Trait|null, feature: Trait|null, ability: Trait|null, flaw: Trait|null}`) is defined independently in `Game.tsx:17`, `TraitAccordion.tsx:7`, and `TraitGrid.tsx:7`. If the trait categories ever change, all three must be updated in sync. This violates DRY. `schemas.ts` already exports `Trait` and `Round` -- `Selections` is a natural addition to the shared types layer. **[Strong Signal -- 4 agents flagged independently]**

## Findings
- **Location:** `src/components/Game.tsx:17`
- **Confidence:** 0.97
- **Source Agents:** architecture, patterns, simplicity, typescript

## Stakeholder Impact
- **Developer:** Three identical type definitions means three places to update if the game adds a fifth trait category. Deleting TraitGrid.tsx (finding #8) reduces the duplication to 2 files, but the fix should still centralize it. The `CATEGORY_LABELS` constant is also duplicated across TraitGrid and TraitAccordion.
- **Operations:** No operational impact. Type definitions are compile-time only.

## Failure Scenarios
- **New trait category addition:** Game design adds a fifth category (e.g., 'origin'). Developer updates the Selections type in Game.tsx but forgets TraitAccordion.tsx. TypeScript compile error when Game.tsx passes the new Selections shape to TraitAccordion. The error message would be confusing because both files define 'Selections' independently.

## Proposed Solutions

### Option A: Export from schemas.ts (primary)
Add to `schemas.ts`:
```typescript
export type Selections = {
  form: Trait | null
  feature: Trait | null
  ability: Trait | null
  flaw: Trait | null
}
```
Then replace local definitions with `import type { Selections } from '@/lib/schemas'` in Game.tsx and TraitAccordion.tsx.

### Option B: Derive from RoundSchema keys
Create the type programmatically from the existing schema:
```typescript
export type Selections = { [K in keyof Round['traits']]: Trait | null }
```
This keeps Selections automatically in sync with the trait categories defined in RoundSchema.

## Acceptance Criteria
- [ ] `Selections` type is exported from a single canonical location (`schemas.ts`)
- [ ] `Game.tsx` imports `Selections` instead of defining it locally
- [ ] `TraitAccordion.tsx` imports `Selections` instead of defining it locally
- [ ] No duplicate `Selections` type definitions remain in the codebase
- [ ] Application compiles with no type errors

## Work Log
- 2026-02-21: Created from code review (full main branch review)
