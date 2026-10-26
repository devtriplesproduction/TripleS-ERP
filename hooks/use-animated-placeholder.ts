'use client'

import { useState, useEffect, useRef } from 'react'

export interface UseAnimatedPlaceholderOptions {
  typingSpeed?: number
  deletingSpeed?: number
  pauseDuration?: number
  deletePauseDuration?: number
  enabled?: boolean
}

/**
 * Custom hook that animates input placeholder text in a dynamic typewriter format,
 * cycling through an array of phrases continuously.
 *
 * @param phrases Array of strings to cycle through.
 * @param options Timing and enable options.
 * @returns The current animated placeholder string.
 */
export function useAnimatedPlaceholder(
  phrases: string[],
  options: UseAnimatedPlaceholderOptions = {}
): string {
  const {
    typingSpeed = 60,
    deletingSpeed = 35,
    pauseDuration = 1800,
    deletePauseDuration = 400,
    enabled = true,
  } = options

  // Default to the first phrase so SSR and initial mount render a meaningful placeholder
  const [displayText, setDisplayText] = useState<string>(phrases[0] || '')
  const phraseIndexRef = useRef<number>(0)
  const charIndexRef = useRef<number>(phrases[0]?.length || 0)
  const isDeletingRef = useRef<boolean>(true)

  useEffect(() => {
    if (!enabled || !phrases.length) {
      return
    }

    if (phrases.length === 1) {
      setDisplayText(phrases[0])
      return
    }

    // Respect user's motion preferences
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplayText(phrases[0] || '')
      return
    }

    let timeoutId: NodeJS.Timeout

    const tick = () => {
      const currentPhrase = phrases[phraseIndexRef.current] || ''

      if (isDeletingRef.current) {
        if (charIndexRef.current > 0) {
          charIndexRef.current -= 1
          setDisplayText(currentPhrase.substring(0, charIndexRef.current))
          timeoutId = setTimeout(tick, deletingSpeed)
        } else {
          isDeletingRef.current = false
          phraseIndexRef.current = (phraseIndexRef.current + 1) % phrases.length
          timeoutId = setTimeout(tick, deletePauseDuration)
        }
      } else {
        if (charIndexRef.current < currentPhrase.length) {
          charIndexRef.current += 1
          setDisplayText(currentPhrase.substring(0, charIndexRef.current))
          timeoutId = setTimeout(tick, typingSpeed)
        } else {
          isDeletingRef.current = true
          timeoutId = setTimeout(tick, pauseDuration)
        }
      }
    }

    // Start with a pause on the first full phrase before deleting
    timeoutId = setTimeout(tick, pauseDuration)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [phrases, typingSpeed, deletingSpeed, pauseDuration, deletePauseDuration, enabled])

  return displayText
}
