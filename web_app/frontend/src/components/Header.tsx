import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useEffect } from 'react'

interface HeaderProps {
  onSettingsClick: () => void
}

const BASE_LOGO_LEVELS = [0.25, 0.45, 0.85, 0.45, 0.25]

function VoiceTransLogo() {
  const sizeClasses = {
    circle: 'w-10 h-10',
    inner: 'w-8 h-8',
    wave: 'w-[3px]',
    baseHeights: [6, 10, 14, 10, 6],
  }

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes wave {
        0%, 100% { transform: scaleY(1); opacity: 0.6; }
        50% { transform: scaleY(1.4); opacity: 1; }
      }
      .animate-wave {
        animation: wave 1.2s ease-in-out infinite;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div
      className={`${sizeClasses.circle} relative rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] flex items-center justify-center shadow-2xl border-2 border-[#d4af37]/30`}
    >
      <div
        className={`${sizeClasses.inner} rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#d4af37]/20`}
      >
        <div className="flex gap-1.5 items-center">
          {BASE_LOGO_LEVELS.map((_, i) => {
            const baseHeight = sizeClasses.baseHeights[i] ?? sizeClasses.baseHeights[Math.floor(sizeClasses.baseHeights.length / 2)]

            return (
              <div
                key={i}
                className={`${sizeClasses.wave} bg-gradient-to-t from-[#d4af37] to-[#ffd700] rounded-full shadow-lg shadow-[#ffd700]/50 animate-wave`}
                style={{
                  height: `${baseHeight}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <VoiceTransLogo />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                VoiceTrans
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time Voice Translation
              </p>
            </div>
          </div>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Settings"
          >
            <Cog6ToothIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </header>
  )
}