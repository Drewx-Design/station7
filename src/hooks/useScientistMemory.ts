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

  // Replace the last note with a frozen fragment if it's the full version
  // of what the typewriter was dripping. Handles the case where the stream
  // completed (full note added via onNoteAccumulated) but the typewriter
  // was still rendering when the user interrupted.
  const replaceLastNote = (text: string) =>
    setAccumulatedNotes(prev => {
      const last = prev[prev.length - 1]
      if (last && !last.interrupted && last.text.startsWith(text)) {
        return [...prev.slice(0, -1), { text, interrupted: true }]
      }
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
