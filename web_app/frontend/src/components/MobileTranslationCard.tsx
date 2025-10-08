import { useState } from 'react'

interface TranslationEntry {
  id: string
  transcription: string
  translation: string
  timestamp: string
  latency: number
  processing_speed: number
  isActive?: boolean
}

interface MobileTranslationCardProps {
  entry: TranslationEntry
  isActive: boolean
  onExpand?: () => void
}

export function MobileTranslationCard({
  entry,
  isActive,
  onExpand,
}: MobileTranslationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
    onExpand?.()
  }

  return (
    <div
      className={`
        relative p-3 rounded-xl backdrop-blur-sm transition-all duration-300
        ${
          isActive
            ? 'bg-[#d4af37]/10 border-2 border-[#d4af37]/40 shadow-lg shadow-[#d4af37]/20'
            : 'bg-[#1a1a1a]/60 border border-[#d4af37]/15 active:bg-[#1a1a1a]/80'
        }
      `}
      onClick={toggleExpand}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -left-1 top-3 w-1 h-8 bg-gradient-to-b from-[#d4af37] to-[#ffd700] rounded-r-full animate-pulse" />
      )}

      <div className="space-y-2">
        {/* Original Text */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[#d4af37]/60 uppercase tracking-wider font-medium">
              Original
            </span>
            {!isExpanded && (
              <svg
                className="w-3 h-3 text-[#d4af37]/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
          <p
            className={`text-sm leading-relaxed transition-all ${
              isActive ? 'text-white font-medium' : 'text-white/70'
            } ${!isExpanded ? 'line-clamp-2' : ''}`}
          >
            {entry.transcription}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/20 to-transparent" />
          <svg
            className="w-3 h-3 text-[#d4af37]/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
          <div className="h-px flex-1 bg-gradient-to-l from-[#d4af37]/20 to-transparent" />
        </div>

        {/* Translation */}
        <div>
          <div className="text-[9px] text-[#d4af37]/80 uppercase tracking-wider mb-1 font-medium">
            Translation
          </div>
          <p
            className={`text-sm leading-relaxed bg-gradient-to-r from-[#d4af37] to-[#ffd700] bg-clip-text text-transparent transition-all ${
              isActive ? 'font-semibold' : 'font-normal'
            } ${!isExpanded ? 'line-clamp-2' : ''}`}
          >
            {entry.translation}
          </p>
        </div>

        {/* Metadata - Always visible on mobile */}
        <div className="flex items-center justify-between text-[9px] text-[#d4af37]/40 pt-1 border-t border-[#d4af37]/10">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {entry.latency.toFixed(2)}s
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {entry.processing_speed.toFixed(1)}x
          </span>
          <span className="opacity-60">
            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
