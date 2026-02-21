'use client'

export function SiteHeader({ fieldLogNumber }: { fieldLogNumber: number }) {
  return (
    <div className="site-header">
      <span className="field-log-id">FIELD LOG #{String(fieldLogNumber).padStart(4, '0')}</span>
      <span className="station-id">XENOBIOLOGY STATION 7</span>
    </div>
  )
}

export function ScenarioBar({ scenario, phase }: {
  scenario: string
  phase: string
}) {
  return (
    <div className="scenario-bar" data-phase={phase}>
      <span className="scenario-label">SPECIMEN CHALLENGE</span>
      <h2 className="scenario-text">{scenario}</h2>
    </div>
  )
}
