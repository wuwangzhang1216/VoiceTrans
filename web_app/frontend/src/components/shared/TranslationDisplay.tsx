/**
 * TranslationDisplay - Display current translation with smooth animations
 */
import React from 'react'
import { Zap } from 'lucide-react'

interface Translation {
  transcription: string
  translation: string
  latency?: number
  processing_speed?: number
}

interface TranslationDisplayProps {
  translation: Translation | null
  isActive?: boolean
  className?: string
}

export const TranslationDisplay = React.memo<TranslationDisplayProps>(
  ({ translation, isActive = false, className = '' }) => {
    if (!translation) {
      return (
        <div className={`text-center ${className}`}>
          <p className="text-gray-500 text-lg">
            {isActive ? 'Listening...' : 'Start recording to see translations'}
          </p>
        </div>
      )
    }

    return (
      <div
        className={`space-y-6 animate-fade-in-up ${className}`}
      >
        {/* Original Text */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">
              Original
            </span>
          </div>
          <p className="text-white text-lg leading-relaxed">
            {translation.transcription}
          </p>
        </div>

        {/* Translation */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-2xl p-6 border-2 border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span className="text-[#d4af37] text-sm font-medium uppercase tracking-wide">
              Translation
            </span>
          </div>
          <p className="text-white text-xl font-medium leading-relaxed">
            {translation.translation}
          </p>

          {/* Metrics */}
          {(translation.latency !== undefined || translation.processing_speed !== undefined) && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#d4af37]/20">
              {translation.latency !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-gray-400">
                    <span className="text-[#d4af37] font-medium">
                      {translation.latency.toFixed(2)}s
                    </span>
                    {' '}latency
                  </span>
                </div>
              )}
              {translation.processing_speed !== undefined && (
                <div className="text-sm text-gray-400">
                  <span className="text-[#d4af37] font-medium">
                    {translation.processing_speed.toFixed(1)}
                  </span>
                  {' '}words/s
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.translation?.transcription === nextProps.translation?.transcription &&
      prevProps.translation?.translation === nextProps.translation?.translation &&
      prevProps.isActive === nextProps.isActive
    )
  }
)

TranslationDisplay.displayName = 'TranslationDisplay'
