'use client'

import { memo } from 'react'
import type { Trait } from '@/lib/schemas'

export const TraitCard = memo(function TraitCard({ trait, selected, onClick }: {
  trait: Trait
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className="trait-card"
      data-selected={selected}
      onClick={onClick}
      type="button"
    >
      <div className="trait-name">{trait.name}</div>
      <div className="trait-description">{trait.description}</div>
    </button>
  )
})
