'use client'

import { useRef } from 'react'
import type { MotionState } from '@/lib/schemas'

export function MoodBackground({
  motionState,
  phase,
  orbColors,
}: {
  motionState: MotionState
  phase: string
  orbColors?: string[]
}) {
  // Persist last valid colors so background doesn't flash during streaming gaps
  const lastColorsRef = useRef<string[]>([])
  const validHex = /^#[0-9a-fA-F]{6}$/

  if (orbColors && orbColors.length >= 2 && orbColors.every(c => validHex.test(c))) {
    lastColorsRef.current = orbColors
  }

  const colors = lastColorsRef.current
  const hasColors = colors.length >= 2

  // Build radial gradient layers from orb colors
  const orbStyle: React.CSSProperties = hasColors ? {
    background: [
      `radial-gradient(ellipse 80% 60% at 20% 30%, ${colors[0]}44 0%, transparent 70%)`,
      `radial-gradient(ellipse 70% 80% at 80% 70%, ${colors[1]}44 0%, transparent 70%)`,
      ...(colors[2] ? [`radial-gradient(ellipse 60% 50% at 50% 50%, ${colors[2]}33 0%, transparent 60%)`] : []),
      'var(--background)',
    ].join(', '),
  } : {}

  return (
    <div
      className="mood-background"
      data-motion={motionState}
      data-phase={phase}
      style={orbStyle}
    />
  )
}
