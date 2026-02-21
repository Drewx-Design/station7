import { useState, useRef, useEffect } from 'react'
import type { NoteEntry } from '@/lib/schemas'

export function useScientistMemory() {
  const [accumulatedNotes, setAccumulatedNotes] = useState<NoteEntry[]>([])
  const [moodTrajectory, setMoodTrajectory] = useState<string[]>([])

  // Refs for reading inside callbacks without stale closures
  const accumulatedNotesRef = useRef<NoteEntry[]>([])
  const moodTrajectoryRef = useRef<string[]>([])
  useEffect(() => { accumulatedNotesRef.current = accumulatedNotes }, [accumulatedNotes])
  useEffect(() => { moodTrajectoryRef.current = moodTrajectory }, [moodTrajectory])

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

  const clear = () => {
    setAccumulatedNotes([])
    setMoodTrajectory([])
  }

  return {
    accumulatedNotes,
    moodTrajectory,
    refs: { accumulatedNotesRef, moodTrajectoryRef },
    addNote,
    replaceLastNote,
    addMood,
    clear,
  }
}
