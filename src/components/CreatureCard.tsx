'use client'

import { useMemo, useCallback, useState } from 'react'
import type { Creature, Selections } from '@/lib/schemas'

// DeepPartial to match AI SDK's streaming output where arrays may contain undefined elements
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[] ? (U | undefined)[] : T[K]
}

const CATEGORIES = ['form', 'feature', 'ability', 'flaw'] as const

const VERDICT_LABELS: Record<string, string> = {
  triumphant: 'TRIUMPHANT',
  marginal: 'MARGINAL',
  catastrophic: 'CATASTROPHIC',
}

const WATERMARK_TEXT: Record<string, string> = {
  triumphant: 'VERIFIED',
  marginal: 'FILED',
  catastrophic: 'INCIDENT REPORT',
}

export function CreatureCard({ creature, isStreaming, imageUrl, imageLoading, fieldLogNumber, selections, titleId }: {
  creature: DeepPartial<Creature>
  isStreaming: boolean
  imageUrl?: string | null
  imageLoading?: boolean
  fieldLogNumber?: number
  selections?: Selections
  titleId?: string
}) {
  const verdict = creature.verdict ?? 'marginal'
  const score = creature.viability_score
  const showDossier = !isStreaming && selections && fieldLogNumber !== undefined
  const [imageLoaded, setImageLoaded] = useState(false)

  const onImageLoad = useCallback(() => setImageLoaded(true), [])

  // Color palette with safe defaults
  const colors = useMemo(() => {
    const palette = creature.color_palette
    if (palette && palette.length >= 3 && palette[0] && palette[1] && palette[2]) {
      return [palette[0], palette[1], palette[2]]
    }
    return ['#1a2a3a', '#0d1f0d', '#2a1a3a']
  }, [creature.color_palette])

  const cardStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${colors[0]}22, ${colors[1]}22, ${colors[2]}22)`,
  }), [colors])

  // During streaming (brewing phase), render the simpler streaming layout
  if (!showDossier) {
    return (
      <div className="creature-card" data-verdict={verdict} style={cardStyle}>
        {creature.name && (
          <h1 className="creature-name field-appear field-delay-0">{creature.name}</h1>
        )}
        {creature.species && (
          <p className="creature-species field-appear field-delay-1">{creature.species}</p>
        )}
        {creature.description && (
          <p className="creature-description field-appear field-delay-2">{creature.description}</p>
        )}
        {score !== undefined && (
          <div className="creature-score field-appear field-delay-3">
            <span className="score-number">{score}</span>
            <span className="score-label">
              {verdict === 'triumphant' ? 'VIABLE' :
               verdict === 'catastrophic' ? 'NON-VIABLE' : 'MARGINAL'}
            </span>
          </div>
        )}
        {creature.narrative && (
          <div className="creature-narrative field-appear field-delay-4">
            <p>{creature.narrative}</p>
            {isStreaming && !creature.epitaph && <span className="streaming-cursor" />}
          </div>
        )}
        {creature.epitaph && (
          <div className="epitaph-separator field-appear field-delay-5">
            <hr className="epitaph-rule" />
            <span className="epitaph-label">FIELD STATUS</span>
            <blockquote className="creature-epitaph">{creature.epitaph}</blockquote>
          </div>
        )}
      </div>
    )
  }

  // Full Specimen Dossier layout (reveal phase)
  return (
    <div className="creature-card dossier" data-verdict={verdict} style={cardStyle}>
      {/* CREATURE IMAGE -- hero area */}
      <div className="creature-image-area">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Illustration of ${creature.name ?? 'creature'}, ${creature.species ?? ''}`}
            className={`creature-image${imageLoaded ? ' loaded' : ''}`}
            onLoad={onImageLoad}
          />
        ) : (
          <div
            className={`creature-image-placeholder${imageLoading ? ' loading' : ''}`}
            style={{
              background: `linear-gradient(135deg, ${colors[0]}44, ${colors[1]}44, ${colors[2]}44)`,
            }}
          />
        )}
      </div>

      {/* SPECIMEN HEADER -- badge row */}
      <div className="specimen-header field-appear field-delay-0">
        <span className="specimen-number">
          SPECIMEN #{String(fieldLogNumber).padStart(4, '0')}
        </span>
        <span className="verdict-badge" data-verdict={verdict}>
          <span className="verdict-dot" aria-hidden="true">&bull;</span>
          <span>{VERDICT_LABELS[verdict] ?? 'MARGINAL'}</span>
          {score !== undefined && <span className="verdict-score">[{score}]</span>}
        </span>
      </div>

      {/* NAME */}
      {creature.name && (
        <h1 id={titleId} className="creature-name field-appear field-delay-1">{creature.name}</h1>
      )}

      {/* SPECIES */}
      {creature.species && (
        <p className="creature-species field-appear field-delay-1">{creature.species}</p>
      )}

      {/* TRAIT GRID inside card */}
      <div className="dossier-traits field-appear field-delay-2">
        {CATEGORIES.map(cat => {
          const trait = selections[cat]
          if (!trait) return null
          return (
            <div key={cat} className="dossier-trait-row">
              <span className="dossier-trait-label">{cat.toUpperCase()}</span>
              <span className="dossier-trait-dot">&middot;</span>
              <span className="dossier-trait-value">{trait.name}</span>
            </div>
          )
        })}
      </div>

      {/* SCORE BAR */}
      {score !== undefined && (
        <div
          className="score-bar field-appear field-delay-3"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Viability score: ${score} out of 100`}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="score-block"
              data-filled={i < Math.round(score / 10)}
            />
          ))}
          <span className="score-text">{score} / 100</span>
        </div>
      )}

      {/* NARRATIVE */}
      {creature.narrative && (
        <div className="creature-narrative field-appear field-delay-4">
          <p>{creature.narrative}</p>
        </div>
      )}

      {/* FIELD STATUS (epitaph) */}
      {creature.epitaph && (
        <div className="epitaph-separator field-appear field-delay-5">
          <hr className="epitaph-rule" />
          <span className="epitaph-label">FIELD STATUS</span>
          <blockquote className="creature-epitaph">{creature.epitaph}</blockquote>
        </div>
      )}

      {/* WATERMARK */}
      <span className="dossier-watermark" aria-hidden="true">
        {WATERMARK_TEXT[verdict] ?? 'FILED'}
      </span>
    </div>
  )
}
