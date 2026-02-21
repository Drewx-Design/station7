'use client'

export function ScenarioBar({ scenario, fieldLogNumber, phase }: {
  scenario: string
  fieldLogNumber: number
  phase: string
}) {
  return (
    <div className="scenario-bar" data-phase={phase}>
      <div className="scenario-header">
        <span className="field-log-id">FIELD LOG #{String(fieldLogNumber).padStart(4, '0')}</span>
        <span className="station-id">XENOBIOLOGY STATION 7</span>
      </div>
      <span className="scenario-label">ACTIVE SCENARIO</span>
      <h2 className="scenario-text">{scenario}</h2>
    </div>
  )
}
