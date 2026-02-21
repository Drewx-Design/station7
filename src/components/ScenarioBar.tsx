'use client'

export function ScenarioBar({ scenario, fieldLogNumber }: {
  scenario: string
  fieldLogNumber: number
}) {
  return (
    <div className="scenario-bar">
      <div className="scenario-header">
        <span className="field-log-id">FIELD LOG #{String(fieldLogNumber).padStart(4, '0')}</span>
        <span className="station-id">XENOBIOLOGY STATION 7</span>
      </div>
      <h2 className="scenario-text">{scenario}</h2>
    </div>
  )
}
