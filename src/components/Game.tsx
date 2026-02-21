'use client'

import { experimental_useObject as useObject } from '@ai-sdk/react'
import { CreatureSchema, RoundSchema } from '@/lib/schemas'
import type { Trait, Round, MicroJudgment, Creature } from '@/lib/schemas'
import { useRef, useState, useCallback, useEffect } from 'react'
import { parse as parsePartialJson } from 'partial-json'
import { FALLBACK_ROUND } from '@/lib/fallback-round'
import { ScenarioBar } from './ScenarioBar'
import { TraitGrid } from './TraitGrid'
import { LabNotes } from './LabNotes'
import { CreatureCard } from './CreatureCard'
import { MoodLayer } from './MoodLayer'
import { Bestiary } from './Bestiary'

type GamePhase = 'loading' | 'drafting' | 'brewing' | 'reveal'
type Selections = {
  form: Trait | null
  feature: Trait | null
  ability: Trait | null
  flaw: Trait | null
}

export default function Game() {
  const [phase, setPhase] = useState<GamePhase>('drafting')
  const [round, setRound] = useState<Round>(FALLBACK_ROUND)
  const [selections, setSelections] = useState<Selections>({
    form: null, feature: null, ability: null, flaw: null,
  })
  // Scientist memory: accumulated notes + mood trajectory
  const [accumulatedNotes, setAccumulatedNotes] = useState<string[]>([])
  const [moodTrajectory, setMoodTrajectory] = useState<string[]>([])
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Use refs for values read inside debounced callbacks to avoid stale closures
  const accumulatedNotesRef = useRef<string[]>([])
  const moodTrajectoryRef = useRef<string[]>([])
  useEffect(() => { accumulatedNotesRef.current = accumulatedNotes }, [accumulatedNotes])
  useEffect(() => { moodTrajectoryRef.current = moodTrajectory }, [moodTrajectory])

  // Field Log counter -- starts at a random high number (Station 7 has been running forever).
  // Use a fixed initial value to avoid SSR/client hydration mismatch, then randomize on mount.
  const [fieldLogNumber, setFieldLogNumber] = useState(47)
  useEffect(() => { setFieldLogNumber(Math.floor(Math.random() * 200) + 30) }, [])
  const [bestiary, setBestiary] = useState<Creature[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // Judgment counter for stable React keys (increments on each new judgment, not on partial updates)
  const judgmentCountRef = useRef(0)
  const [judgmentKey, setJudgmentKey] = useState(0)

  // --- Current lab state (from latest micro-judgment) ---
  const [labState, setLabState] = useState<Partial<MicroJudgment> | null>(null)
  const [labLoading, setLabLoading] = useState(false)

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // --- Generate a fresh round on first load (fallback displays immediately while API loads) ---
  const hasInitialFetch = useRef(false)
  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true
      roundStream.submit({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Round generation (useObject is fine here -- never cancelled) ---
  const roundStream = useObject({
    api: '/api/generate-round',
    schema: RoundSchema,
    onFinish({ object }) {
      if (object) {
        setRound(object as Round)
        setPhase('drafting')
      }
    },
  })

  // --- Micro-judgment: raw fetch + AbortController ---
  const fetchMicroJudgment = useCallback(async (
    currentSelections: Record<string, Trait>,
  ) => {
    // Abort any in-flight judgment
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Increment judgment counter for stable React keys
    judgmentCountRef.current += 1
    setJudgmentKey(judgmentCountRef.current)

    setLabLoading(true)
    try {
      const res = await fetch('/api/micro-judgment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: round!.scenario,
          selections: currentSelections,
          priorNotes: accumulatedNotesRef.current,
          priorMoods: moodTrajectoryRef.current,
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

        // Use partial-json for robust incremental parsing
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
        // Only accumulate complete, non-truncated observations
        if (final.scientist_note && final.scientist_note.length > 50 && final.lab_mood) {
          setAccumulatedNotes(prev => [...prev, final.scientist_note])
          setMoodTrajectory(prev => [...prev, final.lab_mood])
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
  }, [round])

  // --- Trait selection handler ---
  const onTraitSelect = useCallback((category: keyof Selections, trait: Trait) => {
    // Is this a swap (replacing an existing selection)?
    const isSwap = selections[category] !== null

    const newSelections = { ...selections, [category]: trait }
    setSelections(newSelections)

    // If swapping, clear scientist memory -- prior notes are about a different creature.
    if (isSwap) {
      setAccumulatedNotes([])
      setMoodTrajectory([])
    }

    // Debounce to catch rapid clicks
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const selected = Object.fromEntries(
        Object.entries(newSelections).filter(([, t]) => t !== null)
      )
      fetchMicroJudgment(selected as Record<string, Trait>)
    }, 150)
  }, [selections, fetchMicroJudgment])

  // --- Brew (useObject is fine here -- never cancelled) ---
  const [brewError, setBrewError] = useState(false)
  const brewStream = useObject({
    api: '/api/brew',
    schema: CreatureSchema,
    onFinish({ object }) {
      if (object) {
        setPhase('reveal')
        setFieldLogNumber(n => n + 1)
        setBestiary(prev => [...prev, object as Creature])
      }
    },
    onError() {
      setBrewError(true)
    },
  })

  // --- Brew handler ---
  const onBrew = useCallback(() => {
    if (!round) return
    if (brewStream.isLoading) return

    // Cancel any in-flight micro-judgment and clear debounce timer
    if (abortRef.current) abortRef.current.abort()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    setBrewError(false)
    setPhase('brewing')
    brewStream.submit({
      scenario: round.scenario,
      selections,
      accumulatedNotes,
      moodTrajectory,
    })
  }, [round, selections, accumulatedNotes, moodTrajectory, brewStream])

  // --- Play Again ---
  const onPlayAgain = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setSelections({ form: null, feature: null, ability: null, flaw: null })
    setAccumulatedNotes([])
    setMoodTrajectory([])
    setLabState(null)
    setBrewError(false)
    setPhase('loading')
    roundStream.submit({})
  }, [roundStream])

  // --- Ambient mood: update CSS variable when lab color changes ---
  useEffect(() => {
    if (labState?.color && /^#[0-9a-fA-F]{6}$/.test(labState.color)) {
      document.documentElement.style.setProperty('--mood-color', labState.color)
    }
    return () => {
      document.documentElement.style.removeProperty('--mood-color')
    }
  }, [labState?.color])

  // Derived state
  const allSelected = !!(selections.form && selections.feature && selections.ability && selections.flaw)
  const selectedCount = [selections.form, selections.feature, selections.ability, selections.flaw].filter(Boolean).length
  const brewReady = allSelected && !labLoading && labState !== null

  return (
    <>
      <MoodLayer />
      <div className="game-layout">
        {/* Scenario bar spans full width */}
        <ScenarioBar
          scenario={phase === 'loading' ? 'Station 7 is preparing your assignment...' : round.scenario}
          fieldLogNumber={fieldLogNumber}
        />

        {/* Left column: traits */}
        <div className="trait-column" data-phase={phase}>
          {(phase === 'drafting' || phase === 'reveal') && (
            <TraitGrid
              round={round}
              selections={selections}
              onSelect={onTraitSelect}
              disabled={phase !== 'drafting'}
            />
          )}

          {phase === 'brewing' && (
            <div className="brewing-state">
              <TraitGrid
                round={round}
                selections={selections}
                onSelect={onTraitSelect}
                disabled={true}
              />
            </div>
          )}

          {phase === 'loading' && (
            <div className="loading-state">
              <p>Generating specimens...</p>
            </div>
          )}

          {/* Brew / Play Again button */}
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

        {/* Right column: lab notes / creature card */}
        <div className="lab-column">
          {(phase === 'drafting' || phase === 'loading') && (
            <div className="lab-notes-container">
              <h3 className="lab-title">LAB NOTES</h3>
              <LabNotes
                labState={labState}
                isLoading={labLoading}
                judgmentKey={judgmentKey}
                priorNotes={accumulatedNotes}
                brewReady={brewReady}
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

        {/* Bestiary bar spans full width below the game */}
        {bestiary.length > 0 && (
          <div className="bestiary-row">
            <Bestiary creatures={bestiary} />
          </div>
        )}
      </div>
    </>
  )
}
