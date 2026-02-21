'use client'

import type { MotionState } from '@/lib/schemas'

const DEFAULT_ORB_COLORS = ['#1a2a3a', '#0d1f0d']
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

export function MoodBackground({
  orbColors,
  motionState,
  phase,
}: {
  orbColors: string[] | undefined
  motionState: MotionState
  phase: string
}) {
  const validColors = orbColors?.filter(c => HEX_REGEX.test(c))
  const colors = validColors && validColors.length >= 2 ? validColors : DEFAULT_ORB_COLORS

  return (
    <div
      className="mood-background"
      data-motion={motionState}
      data-phase={phase}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="mood-orb"
          style={colors[i] ? {
            background: `radial-gradient(circle, ${colors[i]} 0%, transparent 70%)`,
          } : undefined}
        />
      ))}
    </div>
  )
}
