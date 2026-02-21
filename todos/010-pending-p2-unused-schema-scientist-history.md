---
status: pending
priority: p2
issue_id: 10
tags: [code-review, dead-code]
---

# ScientistHistorySchema is exported but never used

## Problem Statement
`ScientistHistorySchema` and its `ScientistHistory` type are defined in `schemas.ts` (lines 39-44) but never imported or referenced anywhere in the codebase. The accumulated notes and moods are tracked as plain `string[]` arrays in Game.tsx state (lines 31-32), not via this schema. The schema is misleading -- it suggests a formal structure for scientist history that should be used, when in reality the state is just two parallel string arrays.

## Findings
- **Location:** `src/lib/schemas.ts:39`
- **Confidence:** 0.95
- **Source Agents:** patterns, simplicity

## Stakeholder Impact
- **Developer:** The unused schema is misleading -- it suggests there is a formal structure for scientist history that should be used, when in reality the state is just two parallel string arrays. A developer might waste time trying to find where it is used or incorrectly base new code on it.
- **Operations:** No operational impact. Dead code that compiles away.

## Failure Scenarios
- **Schema drift:** The actual scientist history structure in Game.tsx evolves (e.g., adding timestamps to notes) without updating the unused ScientistHistorySchema. The schema becomes actively misleading about the data model. A developer using it as a reference would implement the wrong structure.

## Proposed Solutions

### Option A: Delete the unused schema (primary)
Delete lines 37-44 of `schemas.ts` (the comment, `ScientistHistorySchema`, and `ScientistHistory` type export). If formalization is desired later, re-derive the schema from actual usage.

### Option B: Adopt the schema in Game.tsx
If the schema represents intended architecture, refactor Game.tsx to use `ScientistHistory` as the type for the combined notes/moods state instead of two separate `string[]` arrays. This would consolidate the two useState hooks into one.

## Acceptance Criteria
- [ ] `ScientistHistorySchema` and `ScientistHistory` type are removed from `schemas.ts`
- [ ] No references to `ScientistHistorySchema` or `ScientistHistory` exist in the codebase
- [ ] The `schemas.ts` section comment for "Scientist History" is also removed
- [ ] Application compiles with no errors

## Work Log
- 2026-02-21: Created from code review (full main branch review)
