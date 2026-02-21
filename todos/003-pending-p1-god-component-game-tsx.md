---
status: pending
priority: p1
issue_id: 3
tags: [code-review, architecture, react, maintainability]
---

# Game.tsx is a 367-line monolith owning all state, handlers, effects, and render

## Problem Statement
`Game.tsx` (367 lines) contains 15 `useState` hooks, 8 `useEffect` hooks, 4 `useCallback` handlers, 5 `useRef` instances, and all render logic for the entire game. No state is extracted into custom hooks. The phase machine, scientist memory management, streaming logic, micro-judgment fetch/abort/parse cycle, and UI rendering are all co-located in a single component function starting at line 24.

This monolith structure means every state change (e.g., a `labState` update from streaming) triggers a re-render of the entire Game component tree. All child components (ScenarioBar, TraitAccordion, LabNotes, CreatureCard, Bestiary) re-render because none are memoized. The ref-sync pattern (finding #2) is a direct symptom -- it exists because the streaming logic was never extracted into a hook that would naturally isolate the closure scope.

## Findings
- **Location:** `src/components/Game.tsx:24`
- **Confidence:** 0.95
- **Source Agents:** architecture, patterns
- **Impact:** Every new feature requires modifying Game.tsx. Re-render blast radius is entire game UI. Testing individual behaviors is impossible.

## Stakeholder Impact

**Developer:** Every feature change (accordion, bestiary, new game phases) requires modifying this single file. The 15 useState hooks create a re-render blast radius that is impossible to reason about without a profiler. The ref-sync pattern (finding #2) is a symptom -- it exists because extracting the streaming logic into a hook would have naturally isolated the closure scope. Adding tests is impractical because there is no way to test the micro-judgment streaming logic without mounting the entire game UI.

**Operations:** No direct operational impact. However, the monolith structure means any bug fix touches a high-traffic file, increasing merge conflict risk and deployment risk for a team. For a single developer, the risk is lower but still present as the codebase grows.

**End User:** No direct user impact today. Indirect impact: the monolith slows down feature development, meaning new features and bug fixes take longer to ship.

**Security:** No direct security impact. However, the co-location of API call logic with render logic means security-sensitive code (fetch calls, request bodies) is interleaved with UI concerns, making security review harder.

**Business:** For a POC/game, this is acceptable technical debt. The cost becomes real if the project grows beyond a single developer or needs to support multiple game modes. Refactoring later is straightforward but time-consuming.

## Failure Scenarios
1. **New feature addition:** Adding a new game feature (e.g., creature comparison, multiplayer, save/load) adds more useState/useEffect/useCallback to the same component. At current growth rate, Game.tsx will exceed 500 lines within 2-3 features.
2. **Re-render cascade:** Any state change (e.g., labState update from streaming) triggers a re-render of the entire Game component tree. All child components re-render. On lower-end devices, this could cause visible jank during streaming.
3. **Testing isolation failure:** Cannot write a unit test for the micro-judgment streaming logic without rendering the full Game component, setting up all 15 state variables, and mocking all child components.

## Proposed Solutions

### Option A: Extract three custom hooks (recommended)
Extract the following hooks from Game.tsx:
- `useScientistMemory()` -- returns `{accumulatedNotes, moodTrajectory, addNote, addMood, clear, refs}`
- `useMicroJudgment(round, memoryRefs)` -- returns `{labState, labLoading, fetch, abort}`
- `useRoundGeneration()` -- returns `{round, submit, isLoading}`

Game.tsx becomes ~120 lines of orchestration and JSX.
- **Pros:** Each hook is independently testable. Closure scopes are naturally isolated. Re-render surface area is reduced. Follows established React patterns.
- **Cons:** Larger refactor with risk of introducing regressions. Requires careful state dependency mapping.
- **Effort:** Large (2-4 hours)

### Option B: Extract scientist memory hook only
Start with just `useScientistMemory()` to centralize the ref-sync pattern and note/mood accumulation. Addresses finding #2 as a side effect.
- **Pros:** Smaller, lower-risk first step. Directly fixes the ref-sync inconsistency. Can be extended later.
- **Cons:** Only partially addresses the problem. Game.tsx remains ~300 lines.
- **Effort:** Medium (1 hour)

### Option C: Add React.memo to child components
Without restructuring Game.tsx, wrap all child components in `React.memo` to prevent unnecessary re-renders from state changes they do not consume.
- **Pros:** Quick win for performance. No structural changes.
- **Cons:** Does not improve testability or maintainability. Treats symptoms, not cause. Memo boundaries need stable prop references (which the useCallback churn undermines).
- **Effort:** Small (30 minutes)

## Acceptance Criteria
- [ ] Game.tsx is under 150 lines of orchestration and JSX
- [ ] Scientist memory (notes, moods, refs) lives in a dedicated hook
- [ ] Micro-judgment fetch/abort/stream lives in a dedicated hook
- [ ] Round generation lives in a dedicated hook
- [ ] All existing game functionality works identically after refactor
- [ ] Each extracted hook can be tested in isolation (even if tests are not written yet)
- [ ] No new stale-closure bugs introduced by the extraction

## Work Log
- 2026-02-21: Created from code review (full main branch review)
