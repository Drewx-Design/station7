'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1rem',
      color: '#e0e0e8',
      fontFamily: 'monospace',
    }}>
      <h2 style={{ fontSize: '1rem', letterSpacing: '0.15em', opacity: 0.6 }}>
        STATION 7 CONTAINMENT BREACH
      </h2>
      <p style={{ opacity: 0.4, fontSize: '0.85rem' }}>
        {error.message || 'Something unexpected occurred.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.5rem 1.5rem',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '4px',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          letterSpacing: '0.1em',
        }}
      >
        REINITIALIZE
      </button>
    </div>
  )
}
