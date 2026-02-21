'use client'

import type { BestiaryEntry } from '@/lib/schemas'

export function Bestiary({ entries, onEntryClick }: {
  entries: BestiaryEntry[]
  onEntryClick?: (entry: BestiaryEntry) => void
}) {
  if (entries.length === 0) return null

  return (
    <div className="bestiary">
      <h3 className="bestiary-title">SPECIMEN ARCHIVE ({entries.length})</h3>
      <div className="bestiary-scroll">
        {entries.map((entry, i) => (
          <div
            key={i}
            className="bestiary-card"
            data-verdict={entry.creature.verdict}
            data-clickable={onEntryClick ? 'true' : undefined}
            style={
              entry.creature.color_palette?.length >= 3
                ? { borderColor: entry.creature.color_palette[0] }
                : undefined
            }
            onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
            onKeyDown={onEntryClick ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEntryClick(entry)
              }
            } : undefined}
            role={onEntryClick ? 'button' : undefined}
            tabIndex={onEntryClick ? 0 : undefined}
          >
            <div className="bestiary-score">{entry.creature.viability_score}</div>
            <div className="bestiary-info">
              <div className="bestiary-name">{entry.creature.name}</div>
              <div className="bestiary-species">{entry.creature.species}</div>
            </div>
            <div className="bestiary-epitaph">{entry.creature.epitaph}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
