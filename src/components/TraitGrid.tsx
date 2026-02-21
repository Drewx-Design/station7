'use client'

import { useState } from 'react'
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
  const [openCategory, setOpenCategory] = useState<keyof Selections | null>('form')

  const toggle = (category: keyof Selections) => {
    setOpenCategory(prev => prev === category ? null : category)
  }

  return (
    <div className="trait-accordion">
      {categories.map(category => {
        const isOpen = openCategory === category
        const selected = selections[category]

        return (
          <div key={category} className="accordion-category">
            <h3>
              <button
                className="accordion-header"
                aria-expanded={isOpen}
                data-has-selection={!!selected}
                onClick={() => toggle(category)}
                disabled={disabled}
                type="button"
              >
                <span className="accordion-arrow">{isOpen ? '▼' : '▶'}</span>
                <span className="accordion-label">{CATEGORY_LABELS[category]}</span>
                {selected && <span className="accordion-selection">{selected.name}</span>}
              </button>
            </h3>
            <div className="accordion-panel" data-expanded={isOpen}>
              <div className="accordion-panel-inner">
                <div className="trait-grid">
                  {round.traits[category].map((trait) => (
                    <TraitCard
                      key={trait.name}
                      trait={trait}
                      selected={selections[category]?.name === trait.name}
                      onClick={() => {
                        if (!disabled) {
                          onSelect(category, trait)
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
