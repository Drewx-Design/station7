'use client'

import { useRef } from 'react'
import type { MotionState } from '@/lib/schemas'

const validHex = /^#[0-9a-fA-F]{6}$/

export function MoodBackground({
  motionState,
  phase,
  moodColor,
}: {
  motionState: MotionState
  phase: string
  moodColor?: string
}) {
  // Persist last valid color so background doesn't flash during streaming gaps
  const lastColorRef = useRef<string | null>(null)

  if (moodColor && validHex.test(moodColor)) {
    lastColorRef.current = moodColor
  }

  const color = lastColorRef.current

  return (
    <div
      className="mood-background"
      data-motion={motionState}
      data-phase={phase}
      style={color ? { background: color } : undefined}
    />
  )
}
