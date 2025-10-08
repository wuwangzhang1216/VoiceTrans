/**
 * AudioVisualizer - Real-time audio level visualization
 */
import React from 'react'

interface AudioVisualizerProps {
  level: number
  isActive?: boolean
  className?: string
}

export const AudioVisualizer = React.memo<AudioVisualizerProps>(
  ({ level, className = '' }) => {
    const normalizedLevel = Math.max(0, Math.min(1, level))
    const height = normalizedLevel * 100

    return (
      <div className={`flex items-end gap-1 h-12 ${className}`}>
        {[...Array(20)].map((_, i) => {
          const barThreshold = i / 20
          const isBarActive = normalizedLevel > barThreshold

          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all duration-150 ${
                isBarActive
                  ? 'bg-gradient-to-t from-[#d4af37] to-[#ffd700] shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                  : 'bg-gray-700'
              }`}
              style={{
                height: isBarActive ? `${Math.max(10, (i + 1) / 20 * height)}%` : '10%',
              }}
            />
          )
        })}
      </div>
    )
  },
  (prevProps, nextProps) => {
    return (
      Math.abs(prevProps.level - nextProps.level) < 0.02 &&
      prevProps.isActive === nextProps.isActive
    )
  }
)

AudioVisualizer.displayName = 'AudioVisualizer'
