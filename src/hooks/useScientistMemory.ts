import { useState, useRef, useEffect } from 'react'

export function useScientistMemory() {
  const [accumulatedNotes, setAccumulatedNotes] = useState<string[]>([])
  const [moodTrajectory, setMoodTrajectory] = useState<string[]>([])

  // Refs for reading inside callbacks without stale closures
  const accumulatedNotesRef = useRef<string[]>([])
  const moodTrajectoryRef = useRef<string[]>([])
  useEffect(() => { accumulatedNotesRef.current = accumulatedNotes }, [accumulatedNotes])
  useEffect(() => { moodTrajectoryRef.current = moodTrajectory }, [moodTrajectory])

  const addNote = (note: string) => setAccumulatedNotes(prev => [...prev, note])
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
    addMood,
    clear,
  }
}
