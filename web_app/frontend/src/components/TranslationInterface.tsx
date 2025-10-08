import { useState, useEffect } from 'react'
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid'
import { LanguageSelector } from './LanguageSelector'
import { AudioWaveform } from './AudioWaveform'
import type { Language, Translation } from '../App'

interface TranslationInterfaceProps {
  languages: Language[]
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  isRecording: boolean
  isProcessing: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  currentTranslation?: Translation
}

export function TranslationInterface({
  languages,
  selectedLanguage,
  onLanguageChange,
  isRecording,
  isProcessing,
  onStartRecording,
  onStopRecording,
  currentTranslation
}: TranslationInterfaceProps) {
  const [audioLevel, setAudioLevel] = useState(0)

  useEffect(() => {
    if (isRecording) {
      // Simulate audio level changes
      const interval = setInterval(() => {
        setAudioLevel(Math.random())
      }, 100)
      return () => clearInterval(interval)
    } else {
      setAudioLevel(0)
    }
  }, [isRecording])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Voice Translation
      </h2>

      {/* Language Selector */}
      <div className="mb-8">
        <LanguageSelector
          languages={languages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-6">
        {/* Audio Waveform */}
        {isRecording && (
          <AudioWaveform audioLevel={audioLevel} />
        )}

        {/* Record Button */}
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isProcessing}
          className={`
            relative w-24 h-24 rounded-full transition-all duration-300
            ${isRecording
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : 'bg-blue-500 hover:bg-blue-600'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            shadow-lg hover:shadow-xl
          `}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {isRecording ? (
              <StopIcon className="w-10 h-10 text-white" />
            ) : (
              <MicrophoneIcon className="w-10 h-10 text-white" />
            )}
          </div>

          {/* Pulse animation when recording */}
          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
          )}
        </button>

        {/* Status Text */}
        <div className="text-center">
          {isProcessing ? (
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Processing audio...
            </p>
          ) : isRecording ? (
            <p className="text-lg text-red-600 dark:text-red-400 font-medium">
              Recording... Click to stop
            </p>
          ) : (
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Click to start recording
            </p>
          )}
        </div>
      </div>

      {/* Current Translation Display */}
      {currentTranslation && (
        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Original
              </h3>
              <p className="text-lg text-gray-900 dark:text-white">
                {currentTranslation.transcription}
              </p>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Translation
              </h3>
              <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                {currentTranslation.translation}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Latency: {currentTranslation.latency.toFixed(2)}s</span>
              <span>Speed: {currentTranslation.processing_speed.toFixed(1)}x</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}