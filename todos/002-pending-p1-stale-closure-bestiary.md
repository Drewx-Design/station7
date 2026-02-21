---
status: pending
priority: p1
issue_id: 2
tags: [code-review, react, stale-closure, state-management]
---

# fetchMicroJudgment captures stale `bestiary.length` via closure

## Problem Statement
**[Strong Signal -- 4 agents flagged independently]**

In `Game.tsx`, the `fetchMicroJudgment` callback (line 94) depends only on `[round]` (line 162), but reads `bestiary.length` directly at line 116 to send as `creatureCount` in the API request body. After brewing completes and `setBestiary` grows the array (line 197), the next micro-judgment still sends the old count because the callback closure captured the stale value.

The codebase already has a ref-sync pattern for this exact problem -- `accumulatedNotesRef` (line 36) and `moodTrajectoryRef` (line 37) are kept in sync via `useEffect` and read inside callbacks via `.current`. However, `bestiary` was never given the same treatment, creating an inconsistency in the pattern.

## Findings
- **Location:** `src/components/Game.tsx:116`
- **Confidence:** 0.92
- **Source Agents:** architecture, patterns, performance, typescript
- **Impact:** Stale creatureCount sent to AI degrades cross-round narrative coherence. Subtle data integrity bug in scientist commentary.

## Stakeholder Impact

**Developer:** The ref-sync pattern is already established for accumulatedNotes and moodTrajectory (lines 36-39), so the omission of bestiary is a consistency gap that makes the codebase harder to reason about. A developer reading the useCallback deps would assume all external state is either in deps or in refs, but bestiary falls through the cracks.

**Operations:** This bug is invisible in logs. The API receives a valid creatureCount -- just the wrong one. There is no way to detect this from server-side telemetry. It only manifests as subtly incorrect AI-generated text that a human might not even notice.

**End User:** After playing multiple rounds, the scientist's cross-round commentary (e.g., "You have catalogued 3 specimens before this one") will report stale numbers. This breaks immersion in the narrative continuity that the game is explicitly designed to create via the CROSS-ROUND CONTEXT prompt injection.

**Security:** No security impact. The stale value is a count sent to the LLM prompt, not a security boundary.

**Business:** Minor impact on game quality. The cross-round narrative is a differentiating feature, and stale data undermines it. However, most players may not notice the exact count.

## Failure Scenarios
1. **Post-brew stale count:** Player completes a brew (bestiary grows from 0 to 1), clicks Play Again, selects a trait in the new round. `fetchMicroJudgment` sends `creatureCount: 0` instead of 1. The scientist says "no prior specimens" when there is one visible in the bestiary bar.
2. **Multiple rounds accumulation:** Player completes 5 rounds. The callback was created when `bestiary.length` was 0 (on first round's round change). All subsequent micro-judgments send `creatureCount: 0`. The scientist never acknowledges prior specimens.
3. **Round change re-capture:** `fetchMicroJudgment` depends on `[round]`. When a new round loads, the callback re-creates and captures current `bestiary.length`. Within a single round where a brew completes and Play Again fires in quick succession, the window is real but partially mitigated.

## Proposed Solutions

### Option A: Add bestiaryRef following existing pattern (recommended)
After line 48 (`const selectionsRef = useRef(selections)`), add:
```ts
const bestiaryRef = useRef(bestiary)
useEffect(() => { bestiaryRef.current = bestiary }, [bestiary])
```
Then change line 116 from `creatureCount: bestiary.length` to `creatureCount: bestiaryRef.current.length`.
- **Pros:** Consistent with existing pattern. Minimal change. No dependency array modifications.
- **Cons:** Adds another ref to an already ref-heavy component. Does not address the underlying fragility of manual ref-syncing.
- **Effort:** Small (5 minutes)

### Option B: Add bestiary.length to useCallback deps
Change line 162 from `}, [round])` to `}, [round, bestiary.length])`.
- **Pros:** Simplest possible fix. No new refs.
- **Cons:** Recreates the callback on every brew, which aborts any in-flight micro-judgment (line 98). May cause subtle timing issues if bestiary changes during an active judgment stream.
- **Effort:** Small (2 minutes)

### Option C: Extract to useMicroJudgment hook
Move the entire fetchMicroJudgment logic into a custom hook that accepts all needed values as parameters, eliminating the closure problem entirely.
- **Pros:** Eliminates the entire class of stale-closure bugs. Makes the logic testable in isolation.
- **Cons:** Larger refactor, overlaps with finding #3 (God Component). Should be done as part of that work.
- **Effort:** Medium (part of larger refactor)

## Acceptance Criteria
- [ ] After brewing a creature, the next round's micro-judgments report the correct `creatureCount`
- [ ] The CROSS-ROUND CONTEXT prompt reflects the actual number of specimens in the bestiary
- [ ] No regression in the existing ref-sync pattern for accumulatedNotes and moodTrajectory
- [ ] Scientist tone shifts appropriately as specimen count grows (weariness, pattern recognition)

## Work Log
- 2026-02-21: Created from code review (full main branch review)
