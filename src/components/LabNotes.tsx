'use client'

import type { MicroJudgment } from '@/lib/schemas'
import { useRef, useEffect } from 'react'

type PartialJudgment = {
  [K in keyof MicroJudgment]?: MicroJudgment[K]
}

export function LabNotes({ labState, isLoading, judgmentKey, priorNotes, brewReady }: {
  labState: PartialJudgment | null
  isLoading: boolean
  judgmentKey: number
  priorNotes: string[]
  brewReady: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [priorNotes.length, labState?.scientist_note])

  if (!labState && priorNotes.length === 0) {
    return (
      <div className="lab-notes">
        <p className="lab-placeholder">Awaiting specimen data...</p>
      </div>
    )
  }

  return (
    <div className="lab-notes" ref={scrollRef}>
      {/* Prior completed notes -- the arc so far */}
      {priorNotes.map((note, i) => (
        <div key={i} className="lab-prior-note">{note}</div>
      ))}

      {/* Instrument readout -- ALL CAPS, monospace */}
      {labState?.reading && (
        <div className="lab-reading note-enter" key={`reading-${judgmentKey}`}>
          {brewReady
            ? 'SYNTHESIS AUTHORIZED | INITIATING BREW SEQUENCE'
            : labState.reading}
        </div>
      )}

      {/* Current streaming note -- skip if already accumulated into priorNotes */}
      {labState?.scientist_note &&
        labState.scientist_note !== priorNotes[priorNotes.length - 1] && (
        <div className="lab-scientist-note note-enter" key={`note-${judgmentKey}`}>
          {labState.scientist_note}
          {isLoading && <span className="streaming-cursor" />}
        </div>
      )}
    </div>
  )
}
