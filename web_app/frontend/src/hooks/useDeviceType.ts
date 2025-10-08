import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

interface DeviceInfo {
  type: DeviceType
  orientation: Orientation
  width: number
  height: number
  isTouchDevice: boolean
}

/**
 * Hook to detect device type and orientation
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 */
export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        type: 'desktop',
        orientation: 'landscape',
        width: 1920,
        height: 1080,
        isTouchDevice: false,
      }
    }

    return getDeviceInfo()
  })

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo())
    }

    const handleOrientationChange = () => {
      // Small delay to allow viewport to update
      setTimeout(() => {
        setDeviceInfo(getDeviceInfo())
      }, 100)
    }

    // Initial check
    handleResize()

    // Event listeners
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return deviceInfo
}

function getDeviceInfo(): DeviceInfo {
  const width = window.innerWidth
  const height = window.innerHeight
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  let type: DeviceType = 'desktop'
  if (width < 768) {
    type = 'mobile'
  } else if (width < 1024) {
    type = 'tablet'
  }

  const orientation: Orientation = width > height ? 'landscape' : 'portrait'

  return {
    type,
    orientation,
    width,
    height,
    isTouchDevice,
  }
}

/**
 * Hook for responsive values based on device type
 * @example
 * const padding = useResponsiveValue({ mobile: 4, tablet: 6, desktop: 8 })
 */
export function useResponsiveValue<T>(values: {
  mobile: T
  tablet?: T
  desktop: T
}): T {
  const { type } = useDeviceType()

  if (type === 'mobile') return values.mobile
  if (type === 'tablet') return values.tablet ?? values.desktop
  return values.desktop
}
