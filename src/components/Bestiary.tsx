'use client'

import type { Creature } from '@/lib/schemas'

export function Bestiary({ creatures }: { creatures: Creature[] }) {
  if (creatures.length === 0) return null

  return (
    <div className="bestiary">
      <h3 className="bestiary-title">SPECIMEN ARCHIVE ({creatures.length})</h3>
      <div className="bestiary-scroll">
        {creatures.map((creature, i) => (
          <div
            key={i}
            className="bestiary-card"
            data-verdict={creature.verdict}
            style={
              creature.color_palette?.length >= 3
                ? { borderColor: creature.color_palette[0] }
                : undefined
            }
          >
            <div className="bestiary-score">{creature.viability_score}</div>
            <div className="bestiary-info">
              <div className="bestiary-name">{creature.name}</div>
              <div className="bestiary-species">{creature.species}</div>
            </div>
            <div className="bestiary-epitaph">{creature.epitaph}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
