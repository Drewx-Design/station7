import { useState, useRef, useCallback, useEffect } from 'react'
import { parse as parsePartialJson } from 'partial-json'
import type { Trait, Round, MicroJudgment, Creature } from '@/lib/schemas'

export function useMicroJudgment(
  round: Round,
  memoryRefs: {
    accumulatedNotesRef: React.RefObject<string[]>
    moodTrajectoryRef: React.RefObject<string[]>
  },
  bestiaryRef: React.RefObject<Creature[]>,
  onNoteAccumulated: (note: string, mood: string) => void,
) {
  const [labState, setLabState] = useState<Partial<MicroJudgment> | null>(null)
  const [labLoading, setLabLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

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
    try {
      const res = await fetch('/api/micro-judgment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: round.scenario,
          selections: currentSelections,
          priorNotes: memoryRefs.accumulatedNotesRef.current,
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
        buffer += decoder.decode(value, { stream: true })

        try {
          const partial = parsePartialJson(buffer)
          if (partial && typeof partial === 'object') {
            setLabState(partial as Partial<MicroJudgment>)
          }
        } catch {
          // Not yet parseable -- continue accumulating
        }
      }

      // Stream completed -- parse final object and accumulate
      try {
        const final = JSON.parse(buffer)
        setLabState(final)
        if (final.scientist_note && final.scientist_note.length > 50 && final.lab_mood) {
          onNoteAccumulated(final.scientist_note, final.lab_mood)
        }
      } catch { /* malformed final JSON -- lab state stays at last partial */ }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLabLoading(false)
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }, [round, memoryRefs, bestiaryRef, onNoteAccumulated])

  const abort = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setLabState(null)
  }, [])

  return {
    labState,
    labLoading,
    judgmentKey,
    fetchMicroJudgment,
    abort,
    reset,
    debounceRef,
  }
}
