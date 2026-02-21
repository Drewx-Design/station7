import { useState, useRef, useEffect } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { RoundSchema } from '@/lib/schemas'
import type { Round, Selections } from '@/lib/schemas'
import { FALLBACK_ROUND } from '@/lib/fallback-round'

export function useRoundGeneration(
  selectionsRef: React.RefObject<Selections>,
  onRoundReady: () => void,
) {
  const [round, setRound] = useState<Round>(FALLBACK_ROUND)

  const roundStream = useObject({
    api: '/api/generate-round',
    schema: RoundSchema,
    onFinish({ object }) {
      if (object) {
        const hasSelections = Object.values(selectionsRef.current).some(s => s !== null)
        if (!hasSelections) {
          setRound(object as Round)
        }
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
