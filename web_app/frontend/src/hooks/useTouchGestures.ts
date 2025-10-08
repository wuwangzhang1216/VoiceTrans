import { useEffect, useRef, RefObject } from 'react'

interface SwipeCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
}

interface SwipeOptions {
  minSwipeDistance?: number
  maxSwipeTime?: number
  doubleTapDelay?: number
  longPressDelay?: number
}

const DEFAULT_OPTIONS: Required<SwipeOptions> = {
  minSwipeDistance: 50,
  maxSwipeTime: 300,
  doubleTapDelay: 300,
  longPressDelay: 500,
}

/**
 * Hook for handling touch gestures (swipe, double-tap, long-press)
 */
export function useTouchGestures<T extends HTMLElement>(
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
): RefObject<T> {
  const elementRef = useRef<T>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTapRef = useRef<number>(0)
  const longPressTimerRef = useRef<number | null>(null)

  const opts = { ...DEFAULT_OPTIONS, ...options }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }

      // Setup long press
      if (callbacks.onLongPress) {
        longPressTimerRef.current = window.setTimeout(() => {
          callbacks.onLongPress?.()
        }, opts.longPressDelay)
      }
    }

    const handleTouchMove = () => {
      // Cancel long press on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel long press
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const touchEnd = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }

      const diffX = touchEnd.x - touchStartRef.current.x
      const diffY = touchEnd.y - touchStartRef.current.y
      const diffTime = touchEnd.time - touchStartRef.current.time

      const absX = Math.abs(diffX)
      const absY = Math.abs(diffY)

      // Check for swipe
      if (diffTime < opts.maxSwipeTime) {
        if (absX > opts.minSwipeDistance && absX > absY) {
          // Horizontal swipe
          if (diffX > 0) {
            callbacks.onSwipeRight?.()
          } else {
            callbacks.onSwipeLeft?.()
          }
        } else if (absY > opts.minSwipeDistance && absY > absX) {
          // Vertical swipe
          if (diffY > 0) {
            callbacks.onSwipeDown?.()
          } else {
            callbacks.onSwipeUp?.()
          }
        }
      }

      // Check for double tap
      if (callbacks.onDoubleTap) {
        const now = Date.now()
        const timeSinceLastTap = now - lastTapRef.current

        if (
          timeSinceLastTap < opts.doubleTapDelay &&
          absX < 10 &&
          absY < 10
        ) {
          callbacks.onDoubleTap()
          lastTapRef.current = 0 // Reset
        } else {
          lastTapRef.current = now
        }
      }

      touchStartRef.current = null
    }

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchmove', handleTouchMove)
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [callbacks, opts])

  return elementRef
}
