'use client'

import { useMemo } from 'react'
import type { Creature } from '@/lib/schemas'

// DeepPartial to match AI SDK's streaming output where arrays may contain undefined elements
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[] ? (U | undefined)[] : T[K]
}

export function CreatureCard({ creature, isStreaming }: {
  creature: DeepPartial<Creature>
  isStreaming: boolean
}) {
  const verdict = creature.verdict ?? 'mediocre'

  // Apply creature's color_palette to the card background when available
  const cardStyle = useMemo(() => {
    if (creature.color_palette && creature.color_palette.length >= 3) {
      return {
        background: `linear-gradient(135deg, ${creature.color_palette[0]}22, ${creature.color_palette[1]}22, ${creature.color_palette[2]}22)`,
      }
    }
    return undefined
  }, [creature.color_palette])

  return (
    <div className="creature-card" data-verdict={verdict} style={cardStyle}>
      {/* NAME -- appears first, large display typography */}
      {creature.name && (
        <h1 className="creature-name field-appear field-delay-0">
          {creature.name}
        </h1>
      )}

      {/* SPECIES -- appears second, smaller italic */}
      {creature.species && (
        <p className="creature-species field-appear field-delay-1">
          {creature.species}
        </p>
      )}

      {/* DESCRIPTION -- one-line summary */}
      {creature.description && (
        <p className="creature-description field-appear field-delay-2">
          {creature.description}
        </p>
      )}

      {/* VIABILITY SCORE -- the verdict number */}
      {creature.viability_score !== undefined && (
        <div className="creature-score field-appear field-delay-3">
          <span className="score-number">{creature.viability_score}</span>
          <span className="score-label">
            {verdict === 'triumphant' ? 'VIABLE' :
             verdict === 'catastrophic' ? 'NON-VIABLE' : 'MARGINAL'}
          </span>
        </div>
      )}

      {/* NARRATIVE -- the star. Streams in as text. */}
      {creature.narrative && (
        <div className="creature-narrative field-appear field-delay-4">
          <p>{creature.narrative}</p>
          {isStreaming && !creature.epitaph && (
            <span className="streaming-cursor" />
          )}
        </div>
      )}

      {/* EPITAPH -- the punchline. Lands last. */}
      {creature.epitaph && (
        <div className="epitaph-separator field-appear field-delay-5">
          <hr className="epitaph-rule" />
          <span className="epitaph-label">FIELD STATUS</span>
          <blockquote className="creature-epitaph">
            {creature.epitaph}
          </blockquote>
        </div>
      )}
    </div>
  )
}
