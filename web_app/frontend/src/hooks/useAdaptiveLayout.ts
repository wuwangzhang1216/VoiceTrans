import { useState, useEffect, useMemo } from 'react'

interface AdaptiveLayoutConfig {
  screenHeight: number
  contentLength: number
  hasHistory: boolean
  deviceType: 'mobile' | 'tablet' | 'desktop'
}

interface AdaptiveLayoutResult {
  // 容器定位
  containerPosition: string // CSS class for positioning
  verticalAlign: 'top' | 'center' | 'bottom'
  topOffset: number // px

  // 字体大小（根据内容长度动态调整）
  originalFontSize: string
  translationFontSize: string

  // 间距
  spacing: {
    marginBottom: string
    dividerMargin: string
  }

  // 是否需要滚动
  needsScroll: boolean
}

/**
 * Hook for adaptive layout based on screen height and content length
 * 根据屏幕高度和内容长度动态调整布局
 */
export function useAdaptiveLayout({
  screenHeight,
  contentLength,
  hasHistory,
  deviceType,
}: AdaptiveLayoutConfig): AdaptiveLayoutResult {
  const [layout, setLayout] = useState<AdaptiveLayoutResult>(() =>
    calculateLayout({ screenHeight, contentLength, hasHistory, deviceType })
  )

  useEffect(() => {
    const newLayout = calculateLayout({
      screenHeight,
      contentLength,
      hasHistory,
      deviceType,
    })
    setLayout(newLayout)
  }, [screenHeight, contentLength, hasHistory, deviceType])

  return layout
}

function calculateLayout(config: AdaptiveLayoutConfig): AdaptiveLayoutResult {
  const { screenHeight, contentLength, hasHistory, deviceType } = config

  // 定义屏幕高度阈值
  const SMALL_HEIGHT = 667 // iPhone SE, iPhone 8
  // const MEDIUM_HEIGHT = 844 // iPhone 14
  // const LARGE_HEIGHT = 926 // iPhone 14 Pro Max (reserved for future use)

  // 历史记录占用的高度
  const historyHeight = hasHistory
    ? deviceType === 'mobile'
      ? 220
      : deviceType === 'tablet'
        ? 250
        : 280
    : 0

  // 头部高度
  const headerHeight = deviceType === 'mobile' ? 180 : 160

  // 可用内容高度
  const availableHeight = screenHeight - headerHeight - historyHeight

  // 根据内容长度确定基础字体大小
  let originalFontSize: string
  let translationFontSize: string

  if (deviceType === 'mobile') {
    // 移动端：根据内容长度和屏幕高度动态调整
    if (contentLength > 100) {
      // 长内容
      originalFontSize = availableHeight < SMALL_HEIGHT ? 'text-lg' : 'text-xl'
      translationFontSize = availableHeight < SMALL_HEIGHT ? 'text-2xl' : 'text-3xl'
    } else if (contentLength > 50) {
      // 中等内容
      originalFontSize = availableHeight < SMALL_HEIGHT ? 'text-xl' : 'text-2xl'
      translationFontSize = availableHeight < SMALL_HEIGHT ? 'text-2xl' : 'text-3xl'
    } else {
      // 短内容
      originalFontSize = 'text-2xl'
      translationFontSize = availableHeight < SMALL_HEIGHT ? 'text-3xl' : 'text-4xl'
    }
  } else if (deviceType === 'tablet') {
    // 平板
    originalFontSize = contentLength > 80 ? 'text-3xl' : 'text-4xl'
    translationFontSize = contentLength > 80 ? 'text-4xl' : 'text-5xl'
  } else {
    // 桌面
    originalFontSize = contentLength > 100 ? 'text-4xl' : 'text-5xl'
    translationFontSize = contentLength > 100 ? 'text-5xl' : 'text-6xl'
  }

  // 确定垂直对齐方式和偏移
  let verticalAlign: 'top' | 'center' | 'bottom' = 'center'
  let topOffset = 0
  let containerPosition = ''

  if (deviceType === 'mobile') {
    if (hasHistory) {
      // 移动端有历史记录时：居中但略微靠上，避免与历史记录挤在一起
      verticalAlign = 'center'
      topOffset = -60
      containerPosition = 'justify-center'
    } else {
      // 没有历史记录：完全居中
      verticalAlign = 'center'
      containerPosition = 'justify-center'
    }
  } else {
    // 平板和桌面：保持居中
    containerPosition = 'justify-center'
  }

  // 间距调整
  const spacing = {
    marginBottom: deviceType === 'mobile'
      ? screenHeight < SMALL_HEIGHT
        ? 'mb-4'
        : 'mb-6'
      : 'mb-8',
    dividerMargin: deviceType === 'mobile'
      ? screenHeight < SMALL_HEIGHT
        ? 'my-4'
        : 'my-6'
      : 'my-8',
  }

  // 是否需要滚动
  const needsScroll = availableHeight < 400 && contentLength > 100

  return {
    containerPosition,
    verticalAlign,
    topOffset,
    originalFontSize,
    translationFontSize,
    spacing,
    needsScroll,
  }
}

/**
 * Hook to detect screen height changes
 */
export function useScreenHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 844
  )

  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', () => {
      // Delay to allow viewport to update
      setTimeout(handleResize, 100)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return height
}

/**
 * Calculate text length for adaptive sizing
 */
export function useTextLength(text: string): number {
  return useMemo(() => {
    // Count characters, but weight CJK characters more heavily
    const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u{2f800}-\u{2fa1f}]/u

    let length = 0
    for (const char of text) {
      // CJK characters count as 1.5 due to wider display
      length += cjkRegex.test(char) ? 1.5 : 1
    }

    return Math.floor(length)
  }, [text])
}
