import { useState, useRef, useEffect } from 'react'
import type { NoteEntry } from '@/lib/schemas'

export function useScientistMemory() {
  const [accumulatedNotes, setAccumulatedNotes] = useState<NoteEntry[]>([])
  const [moodTrajectory, setMoodTrajectory] = useState<string[]>([])
  const [interruptionCount, setInterruptionCount] = useState(0)

  // Refs for reading inside callbacks without stale closures
  const accumulatedNotesRef = useRef<NoteEntry[]>([])
  const moodTrajectoryRef = useRef<string[]>([])
  const interruptionCountRef = useRef(0)
  useEffect(() => { accumulatedNotesRef.current = accumulatedNotes }, [accumulatedNotes])
  useEffect(() => { moodTrajectoryRef.current = moodTrajectory }, [moodTrajectory])
  useEffect(() => { interruptionCountRef.current = interruptionCount }, [interruptionCount])

  const addNote = (text: string, interrupted = false) =>
    setAccumulatedNotes(prev => [...prev, { text, interrupted }])

  // Replace a completed note with its frozen typewriter fragment.
  // Scans backwards — the matching full note may not be the very last entry
  // if another state update slipped in between addNote and this call.
  const replaceLastNote = (text: string) =>
    setAccumulatedNotes(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (!prev[i].interrupted && prev[i].text.startsWith(text)) {
          return [...prev.slice(0, i), { text, interrupted: true }, ...prev.slice(i + 1)]
        }
      }
      // No matching full note — add fragment, but guard against exact dupes
      if (prev.some(n => n.text === text)) return prev
      return [...prev, { text, interrupted: true }]
    })

  const addMood = (mood: string) => setMoodTrajectory(prev => [...prev, mood])
  const incrementInterruptions = () => setInterruptionCount(prev => prev + 1)

  const clear = () => {
    setAccumulatedNotes([])
    setMoodTrajectory([])
    setInterruptionCount(0)
  }

  return {
    accumulatedNotes,
    moodTrajectory,
    interruptionCount,
    refs: { accumulatedNotesRef, moodTrajectoryRef, interruptionCountRef },
    addNote,
    replaceLastNote,
    addMood,
    incrementInterruptions,
    clear,
  }
}
