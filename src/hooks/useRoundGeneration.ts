import { useState, useRef, useEffect } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { RoundSchema } from '@/lib/schemas'
import type { Round } from '@/lib/schemas'
import { FALLBACK_ROUND } from '@/lib/fallback-round'

export function useRoundGeneration(
  onRoundReady: () => void,
) {
  const [round, setRound] = useState<Round>(FALLBACK_ROUND)

  const roundStream = useObject({
    api: '/api/generate-round',
    schema: RoundSchema,
    onFinish({ object }) {
      if (object) {
        setRound(object as Round)
        onRoundReady()
      }
    },
  })

  // Fetch first round on mount
  const hasInitialFetch = useRef(false)
  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true
      roundStream.submit({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { round, roundStream }
}
