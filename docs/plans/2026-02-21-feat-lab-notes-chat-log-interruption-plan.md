---
title: "feat: Lab Notes Chat Log Interruption Freeze"
type: feat
date: 2026-02-21
depends_on: docs/plans/2026-02-21-feat-lab-notes-typewriter-effect-plan.md
---

# feat: Lab Notes Chat Log Interruption Freeze

## Overview

When a user clicks a new trait while the scientist's typewriter is mid-word, the displayed text freezes in place as a visible fragment in the chat log. The new micro-judgment streams below it. The frozen fragment is the acknowledgment of interruption — the AI model does not narrate about being cut off.

Think of it as a voice recorder: stop mid-word, the old fragment stays as artifact, new recording begins below it.

## Problem Statement

Currently, when the user selects a new trait mid-stream, `cancelTurn()` aborts the fetch and clears `labState` to null. The typewriter resets — the displayed text vanishes instantly. The partial note is captured from `labStateRef` (the full streamed text, not the typewriter's rendered position) and silently added to memory. The user sees nothing — the interruption is invisible.

This breaks the "voice recorder" feel. The scientist was mid-thought, and the evidence of that thought disappears. The model is told about the interruption via prompt heuristics (`isLikelyInterrupted`) and asked to react with agitation, but this is unreliable — the heuristic misses many cases, and the model's narration ("as I was saying...") feels unnatural.

## Proposed Solution

**LabNotes detects and reports. Game.tsx owns and persists. Memory gets the authoritative record.**

### Architecture

```
User clicks new trait
    ↓
Game.tsx: cancelTurn() → labState = null
    ↓
React renders LabNotes with target = undefined
    ↓
useTypewriter detects: was typing + target gone + displayedText has content
    ↓
Fires onInterrupt(displayedText) BEFORE resetting
    ↓
Game.tsx handler: memory.addNote(displayedText, interrupted: true)
    ↓
Frozen fragment appears in priorNotes with visual treatment
    ↓
New micro-judgment streams below it
```

### Key Design Decisions

1. **Single capture source**: Remove the existing `labStateRef`-based capture in `onTraitSelect` (Game.tsx lines 52-58). The `onInterrupt` callback from LabNotes is the sole source of interrupted text. This captures the *rendered* position, not the full streamed text.

2. **`onInterrupt` lives in `useTypewriter`**: The detection logic is built into the hook as a callback parameter. When `target` transitions from a non-empty string to undefined, and `displayed.length >= 20`, fire `onInterrupt(displayed)` before resetting. This makes timing deterministic — no effect-ordering ambiguity.

3. **`NoteEntry` type replaces `string`**: `accumulatedNotes` changes from `string[]` to `NoteEntry[]` where `NoteEntry = { text: string; interrupted: boolean }`. The `interrupted` flag is purely for display — when sending to the API, map to `notes.map(n => n.text)`.

4. **Em-dash is CSS, not data**: The trailing em-dash on frozen fragments is rendered via `::after` pseudo-element on `[data-interrupted="true"]`. The stored `text` stays clean for API consumption.

5. **Brew path unchanged**: `onBrew` still captures from `labStateRef` (full streamed text) with `interrupted: false`. The user chose to proceed — that's not an interruption. LabNotes unmounts during brew (React batches `labState=null` + `phase='brewing'`), so `onInterrupt` never fires.

6. **Remove prompt heuristics**: Delete `isLikelyInterrupted` from the route and the INTERRUPTIONS section from the prompt. The visual fragment is the acknowledgment. The scientist just moves on.

7. **20-character minimum**: `onInterrupt` only fires when `displayedText.length >= 20`. A 3-character fragment ("The") looks like a rendering bug. Twenty characters is enough to read as a coherent interrupted thought.

8. **Reduced motion**: Users with `prefers-reduced-motion` see full text instantly (`isTyping` is always false), so `onInterrupt` never fires. Their chat log shows only completed notes. This is acceptable — consistent with "no animation" preference.

## Technical Approach

### Phase 1: Type System — `NoteEntry`

**`src/lib/schemas.ts`** — Add type export:

```typescript
// After MicroJudgment type export
export type NoteEntry = { text: string; interrupted: boolean }
```

**`src/hooks/useScientistMemory.ts`** — Update state type and `addNote` signature:

```typescript
import type { NoteEntry } from '@/lib/schemas'

export function useScientistMemory() {
  const [accumulatedNotes, setAccumulatedNotes] = useState<NoteEntry[]>([])
  // moodTrajectory stays as string[] — no change

  const accumulatedNotesRef = useRef<NoteEntry[]>([])
  // sync effect stays the same

  const addNote = (text: string, interrupted = false) =>
    setAccumulatedNotes(prev => [...prev, { text, interrupted }])

  // clear() stays the same — resets to []
  // return shape unchanged except types
}
```

### Phase 2: Interrupt Detection in `useTypewriter`

**`src/components/LabNotes.tsx`** — Add `onInterrupt` parameter to hook:

```typescript
function useTypewriter(
  target: string | undefined,
  speed = 40,
  onInterrupt?: (frozenText: string) => void,
) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)
  const prevTargetRef = useRef<string | undefined>(undefined)
  const mountedRef = useRef(true)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Track unmount to prevent firing onInterrupt during brew transition
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    // Detect interruption: target went from string → null while typewriter was mid-drip
    if (!target && prevTargetRef.current) {
      const wasTyping = displayed.length > 0
        && displayed.length < prevTargetRef.current.length
      // Secondary guard: if displayed text ends with sentence punctuation,
      // it looks like a complete thought — not visually "interrupted."
      // This prevents false positives when the stream finished but the
      // typewriter was a few chars behind the final value.
      const looksComplete = /[.!?]$/.test(displayed.trim())
      if (wasTyping && !looksComplete && displayed.length >= 20 && mountedRef.current && onInterrupt) {
        onInterrupt(displayed)
      }
      prevTargetRef.current = target
      setDisplayed('')
      indexRef.current = 0
      return
    }

    prevTargetRef.current = target

    if (!target) {
      setDisplayed('')
      indexRef.current = 0
      return
    }

    // Target changed fundamentally (new judgment, not stream growth) — reset
    if (displayed.length > 0 && !target.startsWith(displayed)) {
      setDisplayed('')
      indexRef.current = 0
      return
    }

    if (reducedMotion.current) {
      setDisplayed(target)
      indexRef.current = target.length
      return
    }

    if (indexRef.current < target.length) {
      const timeout = setTimeout(() => {
        indexRef.current++
        setDisplayed(target.slice(0, indexRef.current))
      }, speed)
      return () => clearTimeout(timeout)
    }
  }, [target, displayed, speed, onInterrupt])

  return {
    displayedText: displayed,
    isTyping: !!target && displayed.length < target.length,
  }
}
```

**Detection logic explained:**
- `prevTargetRef` stores the previous target value, updated only inside the effect (not during render)
- When `target` is falsy and `prevTargetRef.current` was a string: the target transitioned from something to nothing
- `wasTyping`: `displayed.length > 0` (there's rendered content) AND `displayed.length < prevTargetRef.current.length` (typewriter hadn't finished)
- `mountedRef.current`: prevents firing during unmount (brew transition)
- `displayed.length >= 20`: minimum threshold for a meaningful fragment
- Calls `onInterrupt(displayed)` BEFORE resetting `displayed` to `''`

**Edge cases handled:**
- Typewriter finished naturally, then target goes null → `displayed.length === prevTargetRef.current.length` → `wasTyping` is false → no callback
- Stream finished but typewriter a few chars behind final value → `wasTyping` is true, but `looksComplete` check catches it if displayed text ends with `.!?` → no callback (looks like a complete thought, not a fragment)
- Brew unmounts LabNotes → `mountedRef.current` is false → no callback
- Stream barely started, few chars displayed → `displayed.length < 20` → no callback
- Reduced motion user → `displayed === target` immediately → `wasTyping` is false → no callback

### Phase 3: Wire `onInterrupt` Through Game.tsx

**`src/components/Game.tsx`** — Add handler and pass as prop:

```typescript
// New callback — LabNotes reports frozen typewriter text
// IMPORTANT: must be useCallback to avoid unstable ref in useTypewriter's
// useEffect dependency array, which would cause the effect to re-run every render.
const onInterrupt = useCallback((frozenText: string) => {
  memory.addNote(frozenText, true)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

// Remove old capture from onTraitSelect:
const onTraitSelect = useCallback((category: keyof Selections, trait: Trait) => {
  // 1. Terminate previous turn atomically
  judgment.cancelTurn()  // return value no longer used for note capture

  // 2. REMOVED: the labStateRef-based partial capture
  //    LabNotes now handles this via onInterrupt callback

  // 3. Update selections
  const newSelections = { ...selectionsRef.current, [category]: trait }
  setSelections(newSelections)

  // 4. Debounce new fetch
  const selected = Object.fromEntries(
    Object.entries(newSelections).filter(([, t]) => t !== null)
  )
  judgment.debounceFetch(selected as Record<string, Trait>)
}, [judgment.cancelTurn, judgment.debounceFetch])
```

**Pass to LabNotes:**

```tsx
<LabNotes
  labState={judgment.labState}
  isLoading={judgment.labLoading}
  judgmentKey={judgment.judgmentKey}
  priorNotes={memory.accumulatedNotes}
  brewReady={brewReady}
  onInterrupt={onInterrupt}
/>
```

### Phase 4: LabNotes Rendering with `NoteEntry[]`

**`src/components/LabNotes.tsx`** — Update props and rendering:

```typescript
import type { NoteEntry } from '@/lib/schemas'

export function LabNotes({ labState, isLoading, judgmentKey, priorNotes, brewReady, onInterrupt }: {
  labState: PartialJudgment | null
  isLoading: boolean
  judgmentKey: number
  priorNotes: NoteEntry[]
  brewReady: boolean
  onInterrupt: (frozenText: string) => void
}) {
  // ...

  // Pass onInterrupt to useTypewriter
  const { displayedText, isTyping } = useTypewriter(targetNote, 35, onInterrupt)

  // SHAPE CHANGE: duplicate suppression now compares .text (string) instead of
  // the full object. Old code compared string === string; new code compares
  // string === NoteEntry.text. If you refactor priorNotes rendering, preserve
  // this comparison — it prevents the same note showing in both prior log and
  // current typewriter slot simultaneously.
  const lastPrior = priorNotes[priorNotes.length - 1]
  const showCurrentNote = isTyping || (targetNote && targetNote !== lastPrior?.text)
  const visiblePriorNotes = (isTyping && targetNote === lastPrior?.text)
    ? priorNotes.slice(0, -1)
    : priorNotes

  // Render prior notes with interrupted styling
  {visiblePriorNotes.map((note, i) => (
    <div
      key={i}
      className="lab-prior-note"
      data-interrupted={note.interrupted || undefined}
    >
      {note.text}
    </div>
  ))}
}
```

### Phase 5: API Boundary Mapping

**`src/hooks/useMicroJudgment.ts`** — Map `NoteEntry[]` to `string[]` for API:

```typescript
// Line 54: change from direct ref read to mapped read
priorNotes: memoryRefs.accumulatedNotesRef.current.map(n => n.text),
```

**`src/components/Game.tsx`** `onBrew` — Map for brew request:

```typescript
// The finalNotes construction needs to produce string[] for the API
const notesAsStrings = memory.accumulatedNotes.map(n => n.text)
const finalNotes = capturedNote
  ? [...notesAsStrings, capturedNote]
  : notesAsStrings
// ...
brewStream.submit({
  scenario: round.scenario,
  selections,
  accumulatedNotes: finalNotes,  // string[] for API
  moodTrajectory: finalMoods,
})
```

### Phase 6: Remove Server-Side Heuristics

**`src/app/api/micro-judgment/route.ts`** — Remove `isLikelyInterrupted`:

```diff
- // Detect interrupted notes: short + no sentence-ending punctuation
- const isLikelyInterrupted = (note: string) =>
-   note.length < 100 && !/[.!?]$/.test(note.trim())
-
  let memoryContext = ''
  if (safePriorNotes.length > 0) {
    memoryContext = `\n\nYOUR PRIOR OBSERVATIONS (you said these -- build on them, don't repeat):
- ${safePriorNotes.map((note: string, i: number) => {
-   const tag = isLikelyInterrupted(note) ? ', interrupted' : ''
-   return `[Observation ${i + 1}${tag}] ${note}`
- }).join('\n')}
+ ${safePriorNotes.map((note: string, i: number) =>
+   `[Observation ${i + 1}] ${note}`
+ ).join('\n')}
```

**`src/lib/prompts.ts`** — Remove INTERRUPTIONS section:

```diff
  YOU HAVE MEMORY:
  You will receive your own prior notes and emotional states from earlier selections. You said those things. You felt those things. Do not repeat yourself -- build on what you've already observed. Reference your prior state organically. Not "as I previously noted" -- more like the natural evolution of someone whose theory is being confirmed, disrupted, or complicated.
-
- INTERRUPTIONS:
- Sometimes a prior observation ends abruptly -- you were mid-thought when the specimen configuration changed. You remember being cut off. Let this color your tone: a flicker of annoyance, a dry remark about losing your train of thought, or begrudging acceptance that the old configuration needed changing. One brief aside, woven naturally. Do not over-explain.
```

### Phase 7: CSS for Interrupted Notes

**`src/app/globals.css`** — Add interrupted note styling:

```css
/* Interrupted fragment — frozen mid-thought */
.lab-prior-note[data-interrupted] {
  opacity: 0.55;
}

.lab-prior-note[data-interrupted]::after {
  content: '\2014';  /* em-dash */
  opacity: 0.5;
}
```

Uses `data-interrupted` attribute following the existing codebase convention (`data-selected`, `data-verdict`, `data-expanded`, `data-phase`).

## Acceptance Criteria

- [x] Clicking a new trait mid-typewriter freezes displayed text in place as a prior note
- [x] Frozen fragment has trailing em-dash and dimmed opacity (visual-only, not stored in text)
- [x] Frozen fragment is added to `accumulatedNotes` with `interrupted: true`
- [x] Frozen fragment's text is sent to API as prior context (for memory continuity)
- [x] API receives plain `string[]` — no `NoteEntry` objects leak to server
- [x] No frozen fragment appears if typewriter had < 20 characters displayed
- [x] No frozen fragment appears when typewriter finished naturally before trait click
- [x] No frozen fragment appears during brew (LabNotes unmounts, brew captures full text)
- [x] `isLikelyInterrupted` heuristic removed from server route
- [x] INTERRUPTIONS section removed from system prompt
- [x] Reduced motion users see no frozen fragments (acceptable — typewriter renders instantly)
- [x] Rapid triple-click does not produce duplicate or ghost fragments
- [x] New judgment streams below the frozen fragment in the chat log

## Files Changed

| File | Change |
|------|--------|
| `src/lib/schemas.ts` | Add `NoteEntry` type export |
| `src/hooks/useScientistMemory.ts` | `NoteEntry[]` state, `addNote(text, interrupted?)` signature |
| `src/components/LabNotes.tsx` | `onInterrupt` param in `useTypewriter`, `NoteEntry[]` props, `data-interrupted` rendering |
| `src/components/Game.tsx` | `onInterrupt` handler, remove `labStateRef` capture from `onTraitSelect`, map `NoteEntry[]` to `string[]` in brew |
| `src/hooks/useMicroJudgment.ts` | Map `NoteEntry[]` to `string[]` when building API request |
| `src/app/api/micro-judgment/route.ts` | Remove `isLikelyInterrupted`, simplify observation labels |
| `src/lib/prompts.ts` | Remove INTERRUPTIONS section |
| `src/app/globals.css` | Add `.lab-prior-note[data-interrupted]` styles |

## Dependencies & Risks

**Dependencies:** None. No new packages. No schema changes to API request bodies (they stay `string[]`).

**Risks:**
- **Effect timing**: The `onInterrupt` callback fires inside a `useEffect`, which runs after render. React batches `labState=null` from `cancelTurn()` with the selection state update. On the next render, LabNotes sees `target=undefined`, the effect fires `onInterrupt(displayed)` before resetting. Then `memory.addNote()` queues another state update. The 150ms debounce ensures the ref is synced before the next fetch. Tested timing is safe.
- **Unmount during brew**: `mountedRef` guard prevents `onInterrupt` from firing when LabNotes unmounts during phase transition to `'brewing'`. React 18+ batches all state updates in the same event handler, so `labState=null` and `phase='brewing'` are applied in a single render.
- **Triple-click**: Debounce (150ms) + typewriter speed (35ms/char) means rapid clicks rarely produce meaningful fragments. The 20-char minimum filters out noise.

## References

- Prior plan: `docs/plans/2026-02-21-feat-lab-notes-typewriter-effect-plan.md`
- Typewriter hook: `src/components/LabNotes.tsx:11-54`
- Cancel flow: `src/hooks/useMicroJudgment.ts:112-132`
- Trait select handler: `src/components/Game.tsx:50-70`
- Interrupted heuristic: `src/app/api/micro-judgment/route.ts:44-53`
- Prompt interruptions section: `src/lib/prompts.ts:50-51`
- CSS data-attribute pattern: `src/app/globals.css` (search `data-selected`, `data-verdict`)
