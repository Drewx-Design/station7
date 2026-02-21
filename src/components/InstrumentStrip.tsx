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

function GaugeSegment({ seg, segKey, skeleton }: { seg: Segment; segKey: string; skeleton?: boolean }) {
  if (skeleton) {
    return (
      <div className="gauge-segment" key={segKey}>
        <div className="gauge-label">{seg.name}</div>
        <div className="gauge-bar" aria-hidden="true">
          <div className="gauge-fill" style={{ width: 0 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="gauge-segment" key={segKey}>
      <div className="gauge-label">{seg.name}</div>
      {seg.percent !== null ? (
        <>
          <div className="gauge-value">{seg.value}</div>
          <div
            className="gauge-bar"
            role="meter"
            aria-valuenow={Math.min(Math.max(seg.percent, 0), 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={seg.name}
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

  if (isEmpty) {
    // Skeleton: always visible, pinned to bottom, shows empty gauge tracks
    return (
      <div className="instrument-strip" aria-live="polite" data-empty>
        <GaugeSegment skeleton seg={{ name: 'READING', value: '', percent: null }} segKey="skeleton-0" />
        <GaugeSegment skeleton seg={{ name: 'MOOD', value: '', percent: null }} segKey="skeleton-1" />
      </div>
    )
  }

  // Build the reading segment
  const readingSeg: Segment = readingSegments[0] ?? { name: '\u2014', value: '\u2014', percent: null }

  // Build the mood segment
  const moodPercent = moodIntensity != null ? Math.min(Math.max(Math.round(moodIntensity), 0), 100) : null
  const moodSeg: Segment = labMood
    ? { name: 'MOOD', value: `${formatMoodSlug(labMood)} ${moodPercent != null ? `${moodPercent}%` : ''}`.trim(), percent: moodPercent }
    : { name: 'MOOD', value: '\u2014', percent: null }

  return (
    <div className="instrument-strip" aria-live="polite">
      <GaugeSegment seg={readingSeg} segKey={`${judgmentKey}-0`} />
      <GaugeSegment seg={moodSeg} segKey={`${judgmentKey}-mood`} />
    </div>
  )
}
