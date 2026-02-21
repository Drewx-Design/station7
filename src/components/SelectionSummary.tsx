'use client'

import type { Selections } from '@/lib/schemas'

const CATEGORIES = ['form', 'feature', 'ability', 'flaw'] as const

export function SelectionSummary({ selections }: { selections: Selections }) {
  return (
    <div className="selection-summary">
      {CATEGORIES.map(cat => (
        <div key={cat} className="summary-line">
          <span className="summary-label">{cat.toUpperCase()}</span>
          <span className="summary-dot">&middot;</span>
          <span className="summary-value">{selections[cat]?.name ?? '\u2014'}</span>
        </div>
      ))}
    </div>
  )
}
