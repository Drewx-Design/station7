'use client'

import { experimental_useObject as useObject } from '@ai-sdk/react'
import { CreatureSchema } from '@/lib/schemas'
import type { Trait, Creature, Selections } from '@/lib/schemas'
import { useRef, useState, useCallback, useEffect } from 'react'
import { ScenarioBar } from './ScenarioBar'
import { TraitAccordion } from './TraitAccordion'
import { LabNotes } from './LabNotes'
import { CreatureCard } from './CreatureCard'
import { Bestiary } from './Bestiary'
import { useScientistMemory } from '@/hooks/useScientistMemory'
import { useMicroJudgment } from '@/hooks/useMicroJudgment'
import { useRoundGeneration } from '@/hooks/useRoundGeneration'

type GamePhase = 'loading' | 'drafting' | 'brewing' | 'reveal'

export default function Game() {
  const [phase, setPhase] = useState<GamePhase>('drafting')
  const [selections, setSelections] = useState<Selections>({
    form: null, feature: null, ability: null, flaw: null,
  })
  const [expandedCategory, setExpandedCategory] = useState<keyof Selections | null>('form')
  const [fieldLogNumber, setFieldLogNumber] = useState(47)
  useEffect(() => { setFieldLogNumber(Math.floor(Math.random() * 200) + 30) }, [])
  const [bestiary, setBestiary] = useState<Creature[]>([])

  const selectionsRef = useRef(selections)
  useEffect(() => { selectionsRef.current = selections }, [selections])
  const bestiaryRef = useRef(bestiary)
  useEffect(() => { bestiaryRef.current = bestiary }, [bestiary])

  // --- Hooks ---
  const memory = useScientistMemory()

  const onNoteAccumulated = useCallback((note: string, mood: string) => {
    memory.addNote(note)
    memory.addMood(mood)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // LabNotes reports frozen typewriter text on interruption.
  // Must be useCallback — unstable ref in useTypewriter's useEffect deps
  // would cause the effect to re-run every render.
  // Uses replaceLastNote: if the stream already completed (full note in memory),
  // replaces it with the fragment. If stream was mid-flight, just adds it.
  const onInterrupt = useCallback((frozenText: string) => {
    memory.replaceLastNote(frozenText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { round, roundStream } = useRoundGeneration(
    selectionsRef,
    () => setPhase('drafting'),
  )

  const judgment = useMicroJudgment(round, memory.refs, bestiaryRef, onNoteAccumulated)

  // --- Trait selection handler ---
  const onTraitSelect = useCallback((category: keyof Selections, trait: Trait) => {
    // 1. Terminate previous turn atomically
    // Note: return value no longer used for note capture —
    // LabNotes handles interrupted text via onInterrupt callback
    judgment.cancelTurn()

    // 2. Update selections
    const newSelections = { ...selectionsRef.current, [category]: trait }
    setSelections(newSelections)

    // 3. Debounce new fetch via hook method (no ref leak)
    const selected = Object.fromEntries(
      Object.entries(newSelections).filter(([, t]) => t !== null)
    )
    judgment.debounceFetch(selected as Record<string, Trait>)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judgment.cancelTurn, judgment.debounceFetch])

  // --- Brew ---
  const [brewError, setBrewError] = useState(false)
  const brewStream = useObject({
    api: '/api/brew',
    schema: CreatureSchema,
    onFinish({ object }) {
      if (object) {
        setPhase('reveal')
        setFieldLogNumber(n => n + 1)
        setBestiary(prev => [...prev, object as Creature].slice(-20))
      }
    },
    onError() {
      setBrewError(true)
    },
  })

  const onBrew = useCallback(() => {
    if (!round || brewStream.isLoading) return

    const lastState = judgment.cancelTurn()
    const capturedNote = lastState?.scientist_note && lastState.scientist_note.length >= 20
      ? lastState.scientist_note : null

    // Synchronous snapshot: React hasn't flushed addNote() yet, so
    // memory.accumulatedNotes is stale. Build the array manually.
    // Map NoteEntry[] → string[] for API (interrupted flag is display-only).
    const notesAsStrings = memory.accumulatedNotes.map(n => n.text)
    const finalNotes = capturedNote
      ? [...notesAsStrings, capturedNote]
      : notesAsStrings
    const finalMoods = lastState?.lab_mood
      ? [...memory.moodTrajectory, lastState.lab_mood]
      : memory.moodTrajectory

    // Also update state for UI consistency (not read by submit above)
    if (capturedNote) memory.addNote(capturedNote)
    if (lastState?.lab_mood) memory.addMood(lastState.lab_mood)

    setBrewError(false)
    setPhase('brewing')
    brewStream.submit({
      scenario: round.scenario,
      selections,
      accumulatedNotes: finalNotes,
      moodTrajectory: finalMoods,
    })
  }, [round, selections, memory.accumulatedNotes, memory.moodTrajectory, brewStream, judgment])

  // --- Play Again ---
  const onPlayAgain = useCallback(() => {
    judgment.cancelTurn()  // ignore return — full reset
    setSelections({ form: null, feature: null, ability: null, flaw: null })
    setExpandedCategory('form')
    memory.clear()
    setBrewError(false)
    setPhase('loading')
    roundStream.submit({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundStream])

  // --- Ambient mood ---
  useEffect(() => {
    if (judgment.labState?.color && /^#[0-9a-fA-F]{6}$/.test(judgment.labState.color)) {
      document.documentElement.style.setProperty('--mood-color', judgment.labState.color)
    }
    return () => { document.documentElement.style.removeProperty('--mood-color') }
  }, [judgment.labState?.color])

  // Derived state
  const allSelected = !!(selections.form && selections.feature && selections.ability && selections.flaw)
  const selectedCount = [selections.form, selections.feature, selections.ability, selections.flaw].filter(Boolean).length
  const brewReady = allSelected && !judgment.labLoading && judgment.labState !== null

  return (
    <>
      <div className="mood-layer" />
      <div className="game-layout">
        <ScenarioBar
          scenario={phase === 'loading' ? 'Station 7 is preparing your assignment...' : round.scenario}
          fieldLogNumber={fieldLogNumber}
        />

        <div className="trait-column" data-phase={phase}>
          {(phase === 'drafting' || phase === 'reveal' || phase === 'brewing') && (
            <TraitAccordion
              round={round}
              selections={selections}
              onSelect={onTraitSelect}
              disabled={phase !== 'drafting'}
              expandedCategory={expandedCategory}
              onExpand={setExpandedCategory}
            />
          )}

          {phase === 'loading' && (
            <div className="loading-state">
              <p>Generating specimens...</p>
            </div>
          )}

          {phase === 'drafting' && (
            <button
              className={`brew-button ${brewReady ? 'brew-ready-pulse' : ''}`}
              disabled={!allSelected}
              onClick={onBrew}
            >
              {allSelected ? 'BREW SPECIMEN' : `SELECT ${4 - selectedCount} MORE`}
            </button>
          )}

          {phase === 'brewing' && (
            <button className="brew-button brewing" disabled>
              SYNTHESIZING...
            </button>
          )}

          {phase === 'reveal' && (
            <button className="play-again-button" onClick={onPlayAgain}>
              NEW SPECIMEN
            </button>
          )}
        </div>

        <div className="lab-column">
          {(phase === 'drafting' || phase === 'loading') && (
            <div className="lab-notes-container">
              <h3 className="lab-title">LAB NOTES</h3>
              <LabNotes
                labState={judgment.labState}
                isLoading={judgment.labLoading}
                judgmentKey={judgment.judgmentKey}
                priorNotes={memory.accumulatedNotes}
                brewReady={brewReady}
                onInterrupt={onInterrupt}
              />
            </div>
          )}

          {phase === 'brewing' && (
            <div className="lab-notes-container brewing">
              <h3 className="lab-title">SYNTHESIZING SPECIMEN</h3>
              {brewStream.object ? (
                <CreatureCard
                  creature={brewStream.object}
                  isStreaming={brewStream.isLoading}
                />
              ) : (
                <p className="lab-placeholder">Initiating brew sequence...</p>
              )}
            </div>
          )}

          {phase === 'reveal' && brewStream.object && (
            <div className="lab-notes-container">
              <CreatureCard
                creature={brewStream.object}
                isStreaming={false}
              />
            </div>
          )}

          {brewError && (
            <div className="brew-error">
              <p>Station 7 containment anomaly.</p>
              <button onClick={onBrew}>Retry</button>
            </div>
          )}
        </div>

        {bestiary.length > 0 && (
          <div className="bestiary-row">
            <Bestiary creatures={bestiary} />
          </div>
        )}
      </div>
    </>
  )
}
