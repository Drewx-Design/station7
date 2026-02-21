'use client'

import type { MotionState } from '@/lib/schemas'

export function MoodBackground({
  motionState,
  phase,
}: {
  motionState: MotionState
  phase: string
}) {
  return (
    <div
      className="mood-background"
      data-motion={motionState}
      data-phase={phase}
    />
  )
}
