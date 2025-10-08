/**
 * VoiceTransLogo - Audio-reactive logo component
 * Displays a circular logo with animated bars that react to audio levels
 */

const BASE_LOGO_LEVELS = [0.25, 0.45, 0.85, 0.45, 0.25]

interface VoiceTransLogoProps {
  size?: 'small' | 'medium' | 'large' | 'hero'
  animated?: boolean
  levels?: number[]
}

export function VoiceTransLogo({
  size = 'medium',
  animated = true,
  levels,
}: VoiceTransLogoProps) {
  const sizeClasses = {
    small: {
      circle: 'w-10 h-10',
      inner: 'w-8 h-8',
      wave: 'w-[3px]',
      maxHeight: 18,
      baseHeights: [6, 10, 14, 10, 6],
    },
    medium: {
      circle: 'w-16 h-16',
      inner: 'w-14 h-14',
      wave: 'w-1',
      maxHeight: 22,
      baseHeights: [8, 12, 16, 12, 8],
    },
    large: {
      circle: 'w-32 h-32',
      inner: 'w-28 h-28',
      wave: 'w-2',
      maxHeight: 40,
      baseHeights: [16, 24, 32, 24, 16],
    },
    hero: {
      circle: 'w-48 h-48',
      inner: 'w-44 h-44',
      wave: 'w-3',
      maxHeight: 56,
      baseHeights: [24, 40, 56, 40, 24],
    },
  }

  const sizes = sizeClasses[size] ?? sizeClasses.medium
  const hasLevels = Array.isArray(levels) && levels.length === 5
  const resolvedLevels = hasLevels ? levels : BASE_LOGO_LEVELS
  const shouldAnimateWithLevels = animated && hasLevels
  const shouldWave = animated && !hasLevels

  return (
    <div
      className={`${sizes.circle} relative rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] flex items-center justify-center shadow-2xl border-2 border-[#d4af37]/30`}
    >
      <div
        className={`${sizes.inner} rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#d4af37]/20`}
      >
        <div className="flex gap-1.5 items-center">
          {resolvedLevels.map((level, i) => {
            const normalized = Math.max(0, Math.min(1, level))
            const baseHeight =
              sizes.baseHeights[i] ??
              sizes.baseHeights[Math.floor(sizes.baseHeights.length / 2)]

            const targetHeight = shouldAnimateWithLevels
              ? Math.max(baseHeight * 0.35, normalized * sizes.maxHeight)
              : baseHeight

            return (
              <div
                key={i}
                className={`${sizes.wave} bg-gradient-to-t from-[#d4af37] to-[#ffd700] rounded-full shadow-lg shadow-[#ffd700]/50 ${
                  shouldAnimateWithLevels
                    ? 'transition-[height] duration-150 ease-out'
                    : ''
                } ${shouldWave ? 'animate-wave' : ''}`}
                style={{
                  height: `${targetHeight}px`,
                  animationDelay: shouldWave ? `${i * 0.15}s` : undefined,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
