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

function formatMoodSlug(slug: string): string {
  return slug.replace(/[_-]/g, ' ')
}

function GaugeSegment({ title, seg, segKey, skeleton }: {
  title: string
  seg: Segment | null
  segKey: string
  skeleton?: boolean
}) {
  return (
    <div className="gauge-segment" key={segKey}>
      <div className="gauge-title">{title}</div>
      {skeleton || !seg ? (
        <div className="gauge-bar" aria-hidden="true">
          <div className="gauge-fill" style={{ width: 0 }} />
        </div>
      ) : seg.percent !== null ? (
        <>
          <div className="gauge-value">{seg.value}</div>
          <div
            className="gauge-bar"
            role="meter"
            aria-valuenow={Math.min(Math.max(seg.percent, 0), 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title}: ${seg.name}`}
          >
            <div
              className="gauge-fill"
              style={{ width: `${Math.min(Math.max(seg.percent, 2), 100)}%` }}
            />
          </div>
        </>
      ) : (
        <div className="gauge-chip">{seg.value}</div>
      )}
    </div>
  )
}

export function InstrumentStrip({ reading, brewReady, judgmentKey, labMood, moodIntensity }: {
  reading: string | undefined
  brewReady: boolean
  judgmentKey: number
  labMood?: string
  moodIntensity?: number
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

  // Clamp AI reading to 1 segment; mood gauge is always the second
  const readingSegments = reading ? parseReading(reading).slice(0, 1) : []
  const isEmpty = !reading && !labMood

  // Build the reading segment (null when no data yet)
  const readingSeg: Segment | null = readingSegments[0] ?? null

  // Build the mood segment (null when no data yet)
  const moodPercent = moodIntensity != null ? Math.min(Math.max(Math.round(moodIntensity), 0), 100) : null
  const moodSeg: Segment | null = labMood
    ? { name: 'MOOD', value: `${formatMoodSlug(labMood)} ${moodPercent != null ? `${moodPercent}%` : ''}`.trim(), percent: moodPercent }
    : null

  return (
    <div className="instrument-strip" aria-live="polite" data-empty={isEmpty || undefined}>
      <GaugeSegment title="READING" seg={readingSeg} skeleton={!readingSeg} segKey={isEmpty ? 'skeleton-0' : `${judgmentKey}-0`} />
      <GaugeSegment title="MOOD" seg={moodSeg} skeleton={!moodSeg} segKey={isEmpty ? 'skeleton-1' : `${judgmentKey}-mood`} />
    </div>
  )
}
