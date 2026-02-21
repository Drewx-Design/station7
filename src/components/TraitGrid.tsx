'use client'

import type { Trait, Round } from '@/lib/schemas'
import { TraitCard } from './TraitCard'

type Selections = {
  form: Trait | null
  feature: Trait | null
  ability: Trait | null
  flaw: Trait | null
}

const CATEGORY_LABELS: Record<keyof Selections, string> = {
  form: 'FORM',
  feature: 'FEATURE',
  ability: 'ABILITY',
  flaw: 'FLAW',
}

export function TraitGrid({ round, selections, onSelect, disabled }: {
  round: Round
  selections: Selections
  onSelect: (category: keyof Selections, trait: Trait) => void
  disabled: boolean
}) {
  const categories = Object.keys(CATEGORY_LABELS) as (keyof Selections)[]

  return (
    <div className="trait-categories">
      {categories.map(category => (
        <div key={category} className="trait-category">
          <h3>{CATEGORY_LABELS[category]}</h3>
          <div className="trait-grid">
            {round.traits[category].map((trait) => (
              <TraitCard
                key={trait.name}
                trait={trait}
                selected={selections[category]?.name === trait.name}
                onClick={() => !disabled && onSelect(category, trait)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
