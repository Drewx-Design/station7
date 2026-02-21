'use client'

type Segment = {
  name: string
  value: string
  percent: number | null
}

function parseReading(raw: string): Segment[] {
  return raw
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .map(seg => {
      const colonIdx = seg.indexOf(':')
      if (colonIdx === -1) return null
      const name = seg.slice(0, colonIdx).trim()
      const value = seg.slice(colonIdx + 1).trim()
      if (!name || !value) return null
      const match = value.match(/^(\d+)%$/)
      return {
        name,
        value,
        percent: match ? parseInt(match[1], 10) : null,
      }
    })
    .filter((s): s is Segment => s !== null)
}

const PLACEHOLDER_SEGMENTS: Segment[] = [
  { name: '\u2014', value: '\u2014', percent: null },
  { name: '\u2014', value: '\u2014', percent: null },
]

export function InstrumentStrip({ reading, brewReady, judgmentKey }: {
  reading: string | undefined
  brewReady: boolean
  judgmentKey: number
}) {
  if (brewReady) {
    return (
      <div className="instrument-strip" data-brew-ready aria-live="polite">
        <span className="brew-authorized">
          SYNTHESIS AUTHORIZED | INITIATING BREW SEQUENCE
        </span>
      </div>
    )
  }

  const segments = reading ? parseReading(reading) : PLACEHOLDER_SEGMENTS
  const isEmpty = !reading

  return (
    <div className="instrument-strip" aria-live="polite" data-empty={isEmpty || undefined}>
      {segments.map((seg, i) => (
        <div className="gauge-segment" key={isEmpty ? `empty-${i}` : `${judgmentKey}-${i}`}>
          <div className="gauge-label">{seg.name}</div>
          {seg.percent !== null ? (
            <>
              <div className="gauge-value">{seg.value}</div>
              <div
                className="gauge-bar"
                role="meter"
                aria-valuenow={seg.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={seg.name}
              >
                <div
                  className="gauge-fill"
                  style={{ width: `${Math.max(seg.percent, 2)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="gauge-chip">{seg.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}
