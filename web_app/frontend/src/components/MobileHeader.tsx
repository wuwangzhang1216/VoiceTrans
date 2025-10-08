import { Mic, MicOff, Settings, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Language } from '../App'
import { LanguageDropdown } from './LanguageDropdown'

interface VoiceTransLogoProps {
  size?: 'small' | 'medium'
  animated?: boolean
  levels?: number[]
}

const BASE_LOGO_LEVELS = [0.25, 0.45, 0.85, 0.45, 0.25]

function VoiceTransLogo({ size = 'small', animated = true, levels }: VoiceTransLogoProps) {
  const sizeClasses = {
    small: {
      circle: 'w-10 h-10',
      inner: 'w-8 h-8',
      wave: 'w-[3px]',
      maxHeight: 18,
      baseHeights: [6, 10, 14, 10, 6],
    },
    medium: {
      circle: 'w-12 h-12',
      inner: 'w-10 h-10',
      wave: 'w-1',
      maxHeight: 20,
      baseHeights: [7, 11, 15, 11, 7],
    },
  }

  const sizes = sizeClasses[size]
  const hasLevels = Array.isArray(levels) && levels.length === 5
  const resolvedLevels: number[] = hasLevels ? levels! : BASE_LOGO_LEVELS
  const shouldAnimateWithLevels = animated && hasLevels
  const shouldWave = animated && !hasLevels

  return (
    <div
      className={`${sizes.circle} relative rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] flex items-center justify-center shadow-xl border-2 border-[#d4af37]/30`}
    >
      <div
        className={`${sizes.inner} rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#d4af37]/20`}
      >
        <div className="flex gap-1 items-center">
          {resolvedLevels.map((level, i) => {
            const normalized = Math.max(0, Math.min(1, level))
            const baseHeight = sizes.baseHeights[i] ?? sizes.baseHeights[2]
            const targetHeight = shouldAnimateWithLevels
              ? Math.max(baseHeight * 0.35, normalized * sizes.maxHeight)
              : baseHeight

            return (
              <div
                key={i}
                className={`${sizes.wave} bg-gradient-to-t from-[#d4af37] to-[#ffd700] rounded-full shadow-md shadow-[#ffd700]/50 ${
                  shouldAnimateWithLevels ? 'transition-[height] duration-150 ease-out' : ''
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

interface MobileHeaderProps {
  languages: Language[]
  selectedLanguage: string
  onLanguageChange: (lang: string) => void
  onSettingsClick: () => void
  isRecording: boolean
  isConfigured: boolean
  onRecordingToggle: () => void
  status: string
  audioLevel: number
  logoLevels: number[]
}

export function MobileHeader({
  languages,
  selectedLanguage,
  onLanguageChange,
  onSettingsClick,
  isRecording,
  isConfigured,
  onRecordingToggle,
  status,
  audioLevel,
  logoLevels,
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-[100] border-b border-[#d4af37]/20 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      <div className="px-4 py-3">
        {/* Top Row - Logo, Title, Menu */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <VoiceTransLogo
              size="small"
              animated={true}
              levels={isRecording ? logoLevels : undefined}
            />
            <div>
              <h1 className="text-lg font-bold tracking-wider">VoiceTrans</h1>
              <p className="text-[8px] text-[#d4af37] tracking-[3px] uppercase mt-0.5">
                Luxury AI Translation
              </p>
            </div>
          </div>

          {/* Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg bg-[#1a1a1a] border border-[#d4af37]/30 hover:border-[#d4af37] transition-all active:scale-95"
            aria-label="Menu"
          >
            {menuOpen ? (
              <X className="w-5 h-5 text-[#d4af37]" />
            ) : (
              <Menu className="w-5 h-5 text-[#d4af37]" />
            )}
          </button>
        </div>

        {/* Controls Row - Collapsible Menu */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            menuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-2 pb-3">
            {/* Language Selector */}
            <div className="w-full">
              <LanguageDropdown
                languages={languages}
                selectedLanguage={selectedLanguage}
                onLanguageChange={onLanguageChange}
              />
            </div>

            {/* Settings Button */}
            <button
              onClick={() => {
                onSettingsClick()
                setMenuOpen(false)
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#d4af37]/30 hover:border-[#d4af37] transition-all active:scale-98"
            >
              <Settings className="w-4 h-4 text-[#d4af37]" />
              <span className="text-sm text-[#d4af37]">Settings</span>
            </button>
          </div>
        </div>

        {/* Record Button - Always Visible */}
        <button
          onClick={onRecordingToggle}
          disabled={!isConfigured}
          className={`w-full py-3 rounded-full font-medium tracking-wider uppercase transition-all flex items-center justify-center gap-2 active:scale-98 ${
            isRecording
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 animate-pulse'
              : isConfigured
                ? 'bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-[#0a0a0a] shadow-lg shadow-[#d4af37]/30'
                : 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed border border-gray-700'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-5 h-5" />
              <span className="text-sm font-semibold">Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span className="text-sm font-semibold">Start Recording</span>
            </>
          )}
        </button>

        {/* Status Bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#d4af37]/10">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isRecording
                  ? 'bg-[#ffd700] animate-pulse'
                  : 'bg-gray-600'
              }`}
            />
            <span className="text-xs text-[#d4af37]/80">{status}</span>
          </div>

          {/* Audio Level */}
          {isRecording && (
            <div className="flex items-center gap-2 flex-1 max-w-[120px] ml-3">
              <span className="text-[9px] text-[#d4af37]/60 uppercase tracking-wider">
                Level
              </span>
              <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#d4af37]/20">
                <div
                  className="h-full bg-gradient-to-r from-[#d4af37] to-[#ffd700] transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
