import { useState, useRef, useCallback, useEffect } from 'react'
import { parse as parsePartialJson } from 'partial-json'
import type { Trait, Round, MicroJudgment, Creature, NoteEntry } from '@/lib/schemas'

export function useMicroJudgment(
  round: Round,
  memoryRefs: {
    accumulatedNotesRef: React.RefObject<NoteEntry[]>
    moodTrajectoryRef: React.RefObject<string[]>
  },
  bestiaryRef: React.RefObject<Creature[]>,
  onNoteAccumulated: (note: string, mood: string) => void,
) {
  const [labState, setLabState] = useState<Partial<MicroJudgment> | null>(null)
  const [labLoading, setLabLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Ref mirrors — updated synchronously for cancelTurn() to read
  const labStateRef = useRef<Partial<MicroJudgment> | null>(null)
  const labLoadingRef = useRef(false)

  // Judgment counter for stable React keys
  const judgmentCountRef = useRef(0)
  const [judgmentKey, setJudgmentKey] = useState(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const fetchMicroJudgment = useCallback(async (
    currentSelections: Record<string, Trait>,
  ) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    judgmentCountRef.current += 1
    setJudgmentKey(judgmentCountRef.current)

    setLabLoading(true)
    labLoadingRef.current = true
    try {
      const res = await fetch('/api/micro-judgment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: round.scenario,
          selections: currentSelections,
          priorNotes: memoryRefs.accumulatedNotesRef.current.map(n => n.text),
          priorMoods: memoryRefs.moodTrajectoryRef.current,
          creatureCount: bestiaryRef.current.length,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (controller.signal.aborted) break

        buffer += decoder.decode(value, { stream: true })

        try {
          const partial = parsePartialJson(buffer)
          if (partial && typeof partial === 'object') {
            labStateRef.current = partial as Partial<MicroJudgment>
            setLabState(partial as Partial<MicroJudgment>)
          }
        } catch {
          // Not yet parseable -- continue accumulating
        }
      }

      // Stream completed -- parse final object and accumulate
      // Guard: if cancelled between last chunk and here, skip accumulation
      if (!controller.signal.aborted) {
        try {
          const final = JSON.parse(buffer)
          labStateRef.current = final
          setLabState(final)
          if (final.scientist_note && final.scientist_note.length > 50 && final.lab_mood) {
            onNoteAccumulated(final.scientist_note, final.lab_mood)
          }
        } catch { /* malformed final JSON -- lab state stays at last partial */ }
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      if (abortRef.current === controller) {
        setLabLoading(false)
        labLoadingRef.current = false
        abortRef.current = null
      }
    }
  }, [round, memoryRefs, bestiaryRef, onNoteAccumulated])

  // --- Public API ---

  // Atomic turn cancellation: abort stream + clear display + return last state
  const cancelTurn = useCallback((): Partial<MicroJudgment> | null => {
    // 1. Kill the stream immediately — no more setLabState calls
    if (abortRef.current) abortRef.current.abort()

    // 2. Kill any pending debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    // 3. Capture last state before clearing (synchronous ref read)
    const lastState = labStateRef.current

    // 4. Clear display + refs
    setLabState(null)
    labStateRef.current = null
    setLabLoading(false)
    labLoadingRef.current = false

    return lastState
  }, [])

  // Encapsulate debounce logic — callers should not touch debounceRef directly
  const debounceFetch = useCallback((selections: Record<string, Trait>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchMicroJudgment(selections)
    }, 150)
  }, [fetchMicroJudgment])

  return {
    labState,
    labLoading,
    judgmentKey,
    cancelTurn,
    debounceFetch,
  }
}
