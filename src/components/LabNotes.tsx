'use client'

import type { MicroJudgment, NoteEntry } from '@/lib/schemas'
import { useRef, useEffect, useState, useCallback } from 'react'

type PartialJudgment = {
  [K in keyof MicroJudgment]?: MicroJudgment[K]
}

// --- Typewriter: drip characters from a growing target string ---
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resets typewriter animation state
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

    // Target changed fundamentally (new judgment, not just stream growth) — reset
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

// --- Sound engine: Web Audio API oscillator clicks ---
function useTypewriterSound(isMuted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const playKeystroke = useCallback(() => {
    if (isMuted) return
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 800
      gain.gain.value = 0.03
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.008)
    } catch {
      // Silently fail if Web Audio is unavailable
    }
  }, [isMuted])

  useEffect(() => {
    return () => {
      ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])

  return { playKeystroke }
}

export function LabNotes({ labState, isLoading, judgmentKey, priorNotes, onInterrupt }: {
  labState: PartialJudgment | null
  isLoading: boolean
  judgmentKey: number
  priorNotes: NoteEntry[]
  onInterrupt: (frozenText: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Mute toggle — persisted to localStorage
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('station7-mute') === 'true'
  })

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      localStorage.setItem('station7-mute', String(next))
      return next
    })
  }, [])

  // Typewriter hooks
  const targetNote = labState?.scientist_note
  const { displayedText, isTyping } = useTypewriter(targetNote, 35, onInterrupt)
  const { playKeystroke } = useTypewriterSound(isMuted)

  // Steady keystroke rhythm while typing — independent of character speed
  useEffect(() => {
    if (!isTyping) return
    playKeystroke()
    const interval = setInterval(playKeystroke, 120)
    return () => clearInterval(interval)
  }, [isTyping, playKeystroke])

  // Auto-scroll as typewriter drips characters
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [priorNotes.length, displayedText])

  // SHAPE CHANGE: duplicate suppression now compares .text (string) instead of
  // the full object. Old code compared string === string; new code compares
  // string === NoteEntry.text. If you refactor priorNotes rendering, preserve
  // this comparison — it prevents the same note showing in both prior log and
  // current typewriter slot simultaneously.
  const lastPrior = priorNotes[priorNotes.length - 1]
  const showCurrentNote = isLoading || isTyping || (targetNote && targetNote !== lastPrior?.text)
  const visiblePriorNotes = (isTyping && targetNote === lastPrior?.text)
    ? priorNotes.slice(0, -1)
    : priorNotes

  const muteIcon = isMuted ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L4 5.5H1v5h3L8 14V2z" fill="currentColor"/>
      <path d="M11 5.5l4 5M15 5.5l-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L4 5.5H1v5h3L8 14V2z" fill="currentColor"/>
      <path d="M11 5.5a3.5 3.5 0 010 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12.5 3.5a6 6 0 010 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )

  // Only show placeholder when truly empty — no data at all
  if (!labState && priorNotes.length === 0) {
    return (
      <>
        <button
          className="mute-toggle"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute typing sound' : 'Mute typing sound'}
        >
          {muteIcon}
        </button>
        <div className="lab-notes">
          <p className="lab-placeholder">Awaiting specimen data...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <button
        className="mute-toggle"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute typing sound' : 'Mute typing sound'}
      >
        {muteIcon}
      </button>
      <div className="lab-notes" ref={scrollRef}>
        {/* Prior completed notes — the arc so far */}
        {visiblePriorNotes.map((note, i) => (
          <div
            key={i}
            className="lab-prior-note"
            data-interrupted={note.interrupted || undefined}
          >
            {note.text}
          </div>
        ))}

        {/* Current scientist note — typewriter character drip */}
        {showCurrentNote && (
          <div className="lab-scientist-note" key={`note-${judgmentKey}`}>
            {displayedText}
            {(isTyping || isLoading) && <span className="streaming-cursor" />}
          </div>
        )}
      </div>
    </>
  )
}
