'use client'

import type { Trait, Round, Selections } from '@/lib/schemas'
import { TraitCard } from './TraitCard'

const CATEGORY_LABELS: Record<keyof Selections, string> = {
  form: 'FORM',
  feature: 'FEATURE',
  ability: 'ABILITY',
  flaw: 'FLAW',
}

const CATEGORIES = ['form', 'ability', 'feature', 'flaw'] as const

export function TraitAccordion({ round, selections, onSelect, disabled }: {
  round: Round
  selections: Selections
  onSelect: (category: keyof Selections, trait: Trait) => void
  disabled: boolean
}) {
  return (
    <div className="trait-accordion">
      {CATEGORIES.map(category => {
        const selection = selections[category]
        const panelId = `panel-${category}`
        const headerId = `header-${category}`

        return (
          <div key={category} className="accordion-category">
            <h3>
              <div
                id={headerId}
                className="accordion-header"
                data-has-selection={!!selection}
              >
                <span className="accordion-label">{CATEGORY_LABELS[category]}</span>
                {selection && (
                  <span className="accordion-selection">&mdash; {selection.name}</span>
                )}
              </div>
            </h3>

            <div
              id={panelId}
              className="accordion-panel"
              data-expanded={true}
              role="region"
              aria-labelledby={headerId}
            >
              <div className="accordion-panel-inner">
                <div className="trait-grid">
                  {round.traits[category].map((trait) => (
                    <TraitCard
                      key={trait.name}
                      trait={trait}
                      selected={selection?.name === trait.name}
                      onClick={() => !disabled && onSelect(category, trait)}
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
