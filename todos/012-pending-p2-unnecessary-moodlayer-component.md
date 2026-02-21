---
status: pending
priority: p2
issue_id: 12
tags: [code-review, simplicity]
---

# MoodLayer component is a single div with no logic

## Problem Statement
`MoodLayer.tsx` is 5 lines total: a `'use client'` directive and a function returning `<div className="mood-layer" />`. It has no props, no state, no logic, and no conditional rendering. The component indirection adds a file, an import in Game.tsx (line 13), and a React component boundary for zero benefit. The `'use client'` directive is already present on Game.tsx, so there is no client/server boundary benefit either.

## Findings
- **Location:** `src/components/MoodLayer.tsx:1`
- **Confidence:** 0.90
- **Source Agents:** simplicity

## Stakeholder Impact
- **Developer:** One fewer file to navigate. The `'use client'` directive is already present on Game.tsx, so there is no boundary benefit. However, some developers prefer the explicit separation for discoverability -- "where is the mood layer?" is answered by the filename.
- **Operations:** No operational impact. The component boundary adds negligible overhead.

## Failure Scenarios
- **Future enhancement:** If the mood layer needs props (e.g., to accept a custom color or opacity), a component wrapper would be needed anyway. If inlined, the div is trivially enhanced in Game.tsx. Neither path is significantly harder.

## Proposed Solutions

### Option A: Inline the div (primary)
Replace `<MoodLayer />` at Game.tsx line 261 with `<div className="mood-layer" />`. Remove the `import { MoodLayer } from './MoodLayer'` at line 13. Delete `src/components/MoodLayer.tsx`.

### Option B: Keep but add a comment
If the team prefers atomic component files even for trivial elements, add a comment explaining the component exists as a named landmark for the CSS mood system. No code change, just documentation of intent.

## Acceptance Criteria
- [ ] `MoodLayer.tsx` is deleted from the codebase
- [ ] `<div className="mood-layer" />` is rendered directly in Game.tsx
- [ ] The MoodLayer import is removed from Game.tsx
- [ ] The mood ambient background effect still works correctly (CSS custom property `--mood-color` drives the div)
- [ ] Application builds with no errors

## Work Log
- 2026-02-21: Created from code review (full main branch review)
