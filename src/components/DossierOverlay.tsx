'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { BestiaryEntry } from '@/lib/schemas'
import { CreatureCard } from './CreatureCard'

export function DossierOverlay({ entry, imageLoading, onDismiss, onPlayAgain }: {
  entry: BestiaryEntry
  imageLoading: boolean
  onDismiss: () => void
  onPlayAgain: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  // Capture focus origin and lock body scroll
  useEffect(() => {
    previousFocusRef.current = document.activeElement
    document.documentElement.style.overflow = 'hidden'
    // Focus the close button on mount
    closeButtonRef.current?.focus()

    return () => {
      document.documentElement.style.overflow = ''
      // Restore focus to triggering element
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [])

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return

    const overlay = overlayRef.current
    if (!overlay) return

    const focusable = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  // Backdrop click — only dismiss if clicking the backdrop itself
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onDismiss()
    }
  }, [onDismiss])

  return (
    <div
      className="dossier-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-overlay-title"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div className="dossier-overlay-content">
        <button
          ref={closeButtonRef}
          className="dossier-overlay-close"
          onClick={onDismiss}
          aria-label="Close specimen dossier"
        >
          &times;
        </button>

        <CreatureCard
          creature={entry.creature}
          isStreaming={false}
          imageUrl={entry.imageUrl}
          imageLoading={imageLoading}
          fieldLogNumber={entry.fieldLogNumber}
          selections={entry.selections}
          titleId="dossier-overlay-title"
        />

        <div className="dossier-overlay-actions">
          <button className="play-again-button" onClick={onPlayAgain}>
            NEW SPECIMEN
          </button>
          <button className="dossier-overlay-dismiss" onClick={onDismiss}>
            BACK TO LAB
          </button>
        </div>
      </div>
    </div>
  )
}
