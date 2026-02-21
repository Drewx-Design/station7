'use client'

import type { Trait, Round, Selections } from '@/lib/schemas'
import { TraitCard } from './TraitCard'
import { useRef, useEffect } from 'react'

const CATEGORY_LABELS: Record<keyof Selections, string> = {
  form: 'FORM',
  feature: 'FEATURE',
  ability: 'ABILITY',
  flaw: 'FLAW',
}

const CATEGORIES = ['form', 'feature', 'ability', 'flaw'] as const

export function TraitAccordion({ round, selections, onSelect, disabled, expandedCategory, onExpand }: {
  round: Round
  selections: Selections
  onSelect: (category: keyof Selections, trait: Trait) => void
  disabled: boolean
  expandedCategory: keyof Selections | null
  onExpand: (category: keyof Selections | null) => void
}) {
  const headerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Scroll newly expanded header into view after transition
  useEffect(() => {
    if (!expandedCategory) return
    const timeout = setTimeout(() => {
      headerRefs.current[expandedCategory]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 260) // slightly after 250ms CSS transition
    return () => clearTimeout(timeout)
  }, [expandedCategory])

  return (
    <div className="trait-accordion">
      {CATEGORIES.map(category => {
        const isExpanded = expandedCategory === category
        const selection = selections[category]
        const panelId = `panel-${category}`
        const headerId = `header-${category}`

        return (
          <div key={category} className="accordion-category">
            <h3>
              <button
                ref={el => { headerRefs.current[category] = el }}
                id={headerId}
                className="accordion-header"
                data-has-selection={!!selection}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => !disabled && onExpand(isExpanded ? null : category)}
                disabled={disabled}
                type="button"
              >
                <span className="accordion-arrow">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                <span className="accordion-label">{CATEGORY_LABELS[category]}</span>
                {!isExpanded && selection && (
                  <span className="accordion-selection">{selection.name}</span>
                )}
              </button>
            </h3>

            <div
              id={panelId}
              className="accordion-panel"
              data-expanded={isExpanded}
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
