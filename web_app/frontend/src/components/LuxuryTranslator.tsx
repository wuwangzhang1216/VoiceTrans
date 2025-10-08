import { useState, useEffect, useRef, useCallback } from 'react'

import { Language } from '../App'

import { Mic, MicOff, Settings, Globe, Zap, Download, Trash2 } from 'lucide-react'
import { LanguageDropdown } from './LanguageDropdown'
import { useDeviceType, useResponsiveValue } from '../hooks/useDeviceType'
import { useTouchGestures } from '../hooks/useTouchGestures'
import { useAdaptiveLayout, useScreenHeight, useTextLength } from '../hooks/useAdaptiveLayout'
import { MobileHeader } from './MobileHeader'
import { MobileTranslationCard } from './MobileTranslationCard'

interface LuxuryTranslatorProps {
  languages: Language[]

  selectedLanguage: string

  onLanguageChange: (lang: string) => void

  onSettingsClick: () => void

  apiConfig: { fireworks_api_key: string; gemini_api_key: string }
}

interface TranslationEntry {
  id: string

  transcription: string

  translation: string

  timestamp: string

  latency: number

  processing_speed: number

  isActive?: boolean
}

// Logo component with audio-reactive bars

const BASE_LOGO_LEVELS = [0.25, 0.45, 0.85, 0.45, 0.25]

interface VoiceTransLogoProps {
  size?: 'small' | 'medium' | 'large' | 'hero'

  animated?: boolean

  levels?: number[]
}

function VoiceTransLogo({
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

  const sizes =
    sizeClasses[size as keyof typeof sizeClasses] ?? sizeClasses.medium

  const hasLevels = Array.isArray(levels) && levels.length === 5

  const resolvedLevels: number[] = hasLevels ? levels! : BASE_LOGO_LEVELS

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

export function LuxuryTranslator({
  languages,

  selectedLanguage,

  onLanguageChange,

  onSettingsClick,

  apiConfig: _apiConfig, // Not used - backend handles API keys
}: LuxuryTranslatorProps) {
  const [isConnected, setIsConnected] = useState(false)

  const [isRecording, setIsRecording] = useState(false)

  const [translations, setTranslations] = useState<TranslationEntry[]>([])

  const [audioLevel, setAudioLevel] = useState(0)

  const [logoLevels, setLogoLevels] = useState<number[]>(BASE_LOGO_LEVELS)

  const [status, setStatus] = useState('Disconnected')

  const [isProcessing, setIsProcessing] = useState(false)

  const [stats, setStats] = useState({
    latency: 0,

    speed: 0,

    total: 0,
  })

  const [showClearModal, setShowClearModal] = useState(false)

  // Responsive design
  const { type: deviceType } = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'

  // Screen height for adaptive layout
  const screenHeight = useScreenHeight()

  // Calculate active translation and content length
  const activeTranslation = translations.find((t) => t.isActive) || translations[translations.length - 1]
  const translationLength = useTextLength(activeTranslation?.translation || '')
  const transcriptionLength = useTextLength(activeTranslation?.transcription || '')
  const totalContentLength = translationLength + transcriptionLength

  // Adaptive layout based on screen height and content
  const adaptiveLayout = useAdaptiveLayout({
    screenHeight,
    contentLength: totalContentLength,
    hasHistory: translations.length > 0,
    deviceType,
  })

  // Responsive values
  const logoSize = useResponsiveValue({
    mobile: 'small' as const,
    tablet: 'medium' as const,
    desktop: 'medium' as const,
  })

  const padding = useResponsiveValue({
    mobile: 'px-4 py-3',
    tablet: 'px-6 py-4',
    desktop: 'px-6 py-4',
  })

  const maxVisibleTranslations = useResponsiveValue({
    mobile: 3,
    tablet: 4,
    desktop: 5,
  })

  // Touch gestures for mobile
  const historyRef = useTouchGestures<HTMLDivElement>({
    onSwipeUp: () => {
      if (isMobile && translations.length > 0) {
        // Expand history on swipe up
        console.log('Swipe up detected')
      }
    },
    onSwipeDown: () => {
      if (isMobile && translations.length > 0) {
        // Collapse history on swipe down
        console.log('Swipe down detected')
      }
    },
  })

  const wsRef = useRef<WebSocket | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)

  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const workletUrlRef = useRef<string | null>(null)

  const silentGainRef = useRef<GainNode | null>(null)

  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const streamRef = useRef<MediaStream | null>(null)

  const audioLevelIntervalRef = useRef<number | null>(null)

  const selectedLanguageRef = useRef<string>(selectedLanguage)

  // Keep the ref updated with the latest selected language
  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage
  }, [selectedLanguage])

  // Cleanup on unmount

  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  // Add wave animation styles and scrollbar styles

  useEffect(() => {
    const style = document.createElement('style')

    style.textContent = `

      @keyframes wave {

        0%, 100% { transform: scaleY(1); opacity: 0.6; }

        50% { transform: scaleY(1.4); opacity: 1; }

      }

      @keyframes luxuryPulse {

        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }

        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }

      }

      @keyframes heroGlow {

        0%, 100% {

          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.8), 0 0 100px rgba(212, 175, 55, 0.2);

        }

        50% {

          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.8), 0 0 150px rgba(212, 175, 55, 0.4);

        }

      }

      @keyframes recordPulse {

        0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(212, 175, 55, 0.6); }

        50% { transform: scale(1.1); box-shadow: 0 0 60px rgba(212, 175, 55, 0.9); }

      }

      /* Luxury Select Dropdown Styling */
      .luxury-select {
        color-scheme: dark;
        accent-color: #d4af37;
      }

      .luxury-select option {
        background-color: #0a0a0a !important;
        background: #0a0a0a !important;
        color: white !important;
        padding: 10px 16px !important;
        border: none !important;
      }

      /* Override browser default hover/focus styles */
      .luxury-select option:hover,
      .luxury-select option:focus,
      .luxury-select option:active {
        background-color: #1a1a1a !important;
        background: #1a1a1a !important;
        background-image: linear-gradient(90deg, rgba(212, 175, 55, 0.25) 0%, rgba(255, 215, 0, 0.25) 100%) !important;
        color: #ffd700 !important;
        outline: none !important;
        box-shadow: inset 0 0 0 100px rgba(212, 175, 55, 0.15) !important;
      }

      .luxury-select option:checked,
      .luxury-select option[selected] {
        background: #d4af37 !important;
        background-color: #d4af37 !important;
        color: #0a0a0a !important;
        font-weight: 700 !important;
      }

      /* Force dark theme for select dropdown in all browsers */
      select.luxury-select {
        background-color: #1a1a1a;
        color: white;
      }

      /* Attempt to override system dropdown colors */
      @media (prefers-color-scheme: dark) {
        .luxury-select option {
          background-color: #0a0a0a;
        }
        .luxury-select option:hover {
          background-color: #d4af37;
          color: #0a0a0a;
        }
      }

      .animate-wave {

        animation: wave 1.2s ease-in-out infinite;

      }

      .animate-pulse-custom {

        animation: luxuryPulse 4s ease-in-out infinite;

      }

      .animate-hero-glow {

        animation: heroGlow 3s ease-in-out infinite;

      }

      .animate-record-pulse {

        animation: recordPulse 2s ease-in-out infinite;

      }

      /* Custom scrollbar styles */

      ::-webkit-scrollbar {

        width: 6px;

        height: 6px;

      }

      ::-webkit-scrollbar-track {

        background: #1a1a1a;

        border-radius: 3px;

      }

      ::-webkit-scrollbar-thumb {

        background: linear-gradient(180deg, #d4af37 0%, #ffd700 100%);

        border-radius: 3px;

        border: 1px solid #0a0a0a;

      }

      ::-webkit-scrollbar-thumb:hover {

        background: linear-gradient(180deg, #ffd700 0%, #d4af37 100%);

        box-shadow: 0 0 8px rgba(212, 175, 55, 0.4);

      }

      /* Firefox scrollbar */

      * {

        scrollbar-width: thin;

        scrollbar-color: #d4af37 #1a1a1a;

      }

      /* Hide default scrollbar for history panel */

      .custom-scrollbar::-webkit-scrollbar {

        height: 4px;

      }

      .custom-scrollbar::-webkit-scrollbar-track {

        background: rgba(26, 26, 26, 0.5);

        border-radius: 2px;

      }

      .custom-scrollbar::-webkit-scrollbar-thumb {

        background: linear-gradient(90deg, #d4af37 0%, #ffd700 100%);

        border-radius: 2px;

      }

    `

    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Connect to WebSocket

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

    const wsHost = import.meta.env.VITE_WS_HOST || window.location.hostname

    const wsPort = import.meta.env.VITE_WS_PORT || '8000'

    const customUrl = import.meta.env.VITE_WS_URL

    const wsUrl =
      customUrl ||
      `${protocol}//${wsHost}${wsPort ? `:${wsPort}` : ''}/ws/stream`

    try {
      const ws = new WebSocket(wsUrl)

      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)

        setStatus('Connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'connected':
              setStatus('Ready')

              break

            case 'processing':
              setIsProcessing(true)

              break

            case 'translation':
              setIsProcessing(false)

              const entry: TranslationEntry = {
                id: Date.now().toString(),

                transcription: data.transcription,

                translation: data.translation,

                timestamp: data.timestamp,

                latency: data.latency,

                processing_speed: data.processing_speed,

                isActive: true,
              }

              setTranslations((prev) => {
                const updated = prev.map((t) => ({ ...t, isActive: false }))

                return [...updated, entry].slice(-10)
              })

              setStats((prev) => ({
                latency: data.latency,

                speed: data.processing_speed,

                total: prev.total + 1,
              }))

              break

            case 'error':
              setIsProcessing(false)

              break
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }

      ws.onerror = () => {
        setStatus('Error')

        setIsConnected(false)
      }

      ws.onclose = () => {
        setIsConnected(false)

        setStatus('Disconnected')
      }
    } catch (error) {
      setStatus('Failed')
    }
  }, [])

  // Start recording and streaming

  const startRecording = async () => {
    try {
      console.log('Starting recording...')
      connectWebSocket()

      await new Promise((resolve) => setTimeout(resolve, 500))

      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      console.log('Microphone access granted')
      streamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const sourceNode = audioContext.createMediaStreamSource(stream)
      sourceRef.current = sourceNode

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      sourceNode.connect(analyser)

      audioLevelIntervalRef.current = window.setInterval(() => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalizedLevel = Math.min(1, average / 255)

        setAudioLevel(normalizedLevel)
        setLogoLevels((prev) => {
          if (!prev.length) {
            return BASE_LOGO_LEVELS
          }

          return prev.map((value, index) => {
            const bandPosition =
              prev.length === 1 ? 0 : index / (prev.length - 1)
            const centerWeight = 1 - Math.abs(0.5 - bandPosition) * 2
            const bandFactor = 0.55 + centerWeight * 0.45
            const base =
              BASE_LOGO_LEVELS[index] ??
              BASE_LOGO_LEVELS[Math.floor(BASE_LOGO_LEVELS.length / 2)]
            const jitter = (Math.random() - 0.5) * 0.2 * (0.5 + normalizedLevel)
            const dynamic = normalizedLevel * bandFactor
            const target = Math.min(1, Math.max(base * 0.6, dynamic + jitter))

            return value * 0.5 + target * 0.5
          })
        })
      }, 100)

      console.log('Loading audio worklet...')

      // Create inline worklet to avoid bundling issues
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (!input || input.length === 0) {
              return true;
            }

            const channelData = input[0];
            if (!channelData) {
              return true;
            }

            const buffer = new ArrayBuffer(channelData.length * 2);
            const view = new DataView(buffer);

            for (let i = 0; i < channelData.length; i++) {
              const sample = Math.max(-1, Math.min(1, channelData[i]));
              view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            }

            this.port.postMessage({ buffer }, [buffer]);
            return true;
          }
        }

        registerProcessor('pcm-processor', PCMProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      workletUrlRef.current = workletUrl;

      await audioContext.audioWorklet.addModule(workletUrl)

      console.log('Creating audio worklet node...')
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      })
      workletNodeRef.current = workletNode

      workletNode.port.onmessage = (
        event: MessageEvent<{ buffer: ArrayBuffer }>,
      ) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          return
        }

        const { buffer } = event.data
        const bytes = new Uint8Array(buffer)
        let binary = ''

        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }

        const base64 = btoa(binary)

        wsRef.current.send(
          JSON.stringify({
            type: 'audio',
            data: base64,
            target_language: selectedLanguageRef.current,
          }),
        )
      }

      sourceNode.connect(workletNode)

      const silentGain = audioContext.createGain()
      silentGain.gain.value = 0
      workletNode.connect(silentGain)
      silentGain.connect(audioContext.destination)
      silentGainRef.current = silentGain

      console.log('Setting recording state to true')
      setIsRecording(true)
      setStatus('Streaming')
      console.log('Recording started successfully')
    } catch (error) {
      console.error('Error starting recording:', error)
      setStatus('Mic denied')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    if (workletUrlRef.current) {
      URL.revokeObjectURL(workletUrlRef.current)
      workletUrlRef.current = null
    }

    if (silentGainRef.current) {
      silentGainRef.current.disconnect()
      silentGainRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current)
      audioLevelIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsRecording(false)
    setIsConnected(false)
    setAudioLevel(0)
    setLogoLevels(BASE_LOGO_LEVELS)
    setStatus('Stopped')
  }

  // Backend now handles API keys via Heroku config vars - always configured
  const isConfigured = true

  // Export translations to txt file
  const exportTranslations = () => {
    if (translations.length === 0) return

    const content = translations
      .map((entry, index) => {
        const timestamp = new Date(entry.timestamp).toLocaleString()
        return `[${index + 1}] ${timestamp}
Original: ${entry.transcription}
Translation: ${entry.translation}
Latency: ${entry.latency.toFixed(2)}s | Speed: ${entry.processing_speed.toFixed(1)}x
${'─'.repeat(60)}`
      })
      .join('\n\n')

    const header = `VoiceTrans - Translation History
Generated: ${new Date().toLocaleString()}
Total Translations: ${translations.length}
${'═'.repeat(60)}

`

    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `voicetrans-history-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Clear all translations
  const clearTranslations = () => {
    if (translations.length === 0) return
    setShowClearModal(true)
  }

  const confirmClear = () => {
    setTranslations([])
    setStats({
      latency: 0,
      speed: 0,
      total: 0,
    })
    setShowClearModal(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d4af37]/5 to-transparent pointer-events-none" />

      {/* Conditionally render Mobile or Desktop Header */}
      {isMobile ? (
        <MobileHeader
          languages={languages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
          onSettingsClick={onSettingsClick}
          isRecording={isRecording}
          isConfigured={isConfigured}
          onRecordingToggle={isRecording ? stopRecording : startRecording}
          status={status}
          audioLevel={audioLevel}
          logoLevels={logoLevels}
        />
      ) : (
        <header className="relative z-20 border-b border-[#d4af37]/20 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
          <div className={padding}>
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <VoiceTransLogo
                size={logoSize}
                animated={true}
                levels={isRecording ? logoLevels : undefined}
              />
              <div>
                <h1 className="text-2xl font-bold tracking-wider">
                  VoiceTrans
                </h1>
                <p className="text-xs text-[#d4af37] tracking-[4px] uppercase mt-1">
                  Luxury AI Translation
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <LanguageDropdown
                languages={languages}
                selectedLanguage={selectedLanguage}
                onLanguageChange={onLanguageChange}
              />

              {/* Settings */}
              <button
                onClick={onSettingsClick}
                className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#d4af37]/30 hover:border-[#d4af37] transition-all"
              >
                <Settings className="w-5 h-5 text-[#d4af37]" />
              </button>

              {/* Record Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConfigured}
                className={`px-6 py-2.5 rounded-full font-medium tracking-wider uppercase transition-all inline-flex items-center justify-center gap-2 ${
                  isRecording
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 animate-pulse'
                    : isConfigured
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-[#0a0a0a] shadow-lg shadow-[#d4af37]/30 hover:shadow-[#d4af37]/50'
                      : 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed border border-gray-700'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span className="text-sm font-semibold">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span className="text-sm font-semibold">Start</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#d4af37]/10">
            <div className="flex items-center gap-6 text-sm">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isRecording
                      ? 'bg-[#ffd700] animate-pulse'
                      : isConnected
                        ? 'bg-green-500'
                        : 'bg-gray-600'
                  }`}
                />
                <span className="text-[#d4af37]/80">{status}</span>
              </div>

              {/* Audio Level */}
              {isRecording && (
                <div className="flex items-center gap-2">
                  <span className="text-[#d4af37]/60 text-xs uppercase tracking-wider">
                    Level
                  </span>
                  <div className="w-32 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#d4af37]/20">
                    <div
                      className="h-full bg-gradient-to-r from-[#d4af37] to-[#ffd700] transition-all duration-100"
                      style={{ width: `${audioLevel * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-xs text-[#d4af37]/60 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3" />
                <span>{stats.latency.toFixed(2)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                <span>{stats.speed.toFixed(1)}x</span>
              </div>
              <div>
                <span>#{stats.total}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Main Content - Hero Style with Adaptive Layout */}
      <main className={`relative flex flex-col items-center ${
        adaptiveLayout.containerPosition
      } ${
        isMobile ? 'min-h-[calc(100vh-220px)]' : 'min-h-[calc(100vh-160px)]'
      }`}>
        {/* Pulse effect background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-[#d4af37]/10 to-transparent animate-pulse-custom blur-3xl" />
        </div>

        {/* Desktop/Tablet: Show large translation display */}
        {activeTranslation && !isMobile && (
          <div className={`relative z-10 mx-auto text-center ${
            isTablet ? 'max-w-3xl px-6' : 'max-w-5xl px-8'
          } ${
            adaptiveLayout.needsScroll ? 'overflow-y-auto max-h-[calc(100vh-300px)]' : ''
          }`}>
            {/* Original Text */}
            <div className={adaptiveLayout.spacing.marginBottom}>
              <p className="text-[#d4af37] uppercase mb-2 text-xs tracking-[6px]">
                Original
              </p>
              <h2 className={`font-light text-white/80 leading-relaxed ${
                isTablet ? 'text-4xl' : 'text-5xl'
              }`}>
                {activeTranslation.transcription}
              </h2>
            </div>

            {/* Divider with Logo */}
            <div className={`flex items-center justify-center ${adaptiveLayout.spacing.dividerMargin}`}>
              <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent flex-1" />
              <div className="mx-6">
                <VoiceTransLogo
                  size="small"
                  animated={true}
                  levels={logoLevels}
                />
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent flex-1" />
            </div>

            {/* Translation */}
            <div>
              <p className="text-[#d4af37] uppercase mb-2 text-xs tracking-[6px]">
                Translation
              </p>
              <h1 className={`font-bold bg-gradient-to-r from-[#d4af37] to-[#ffd700] bg-clip-text text-transparent leading-relaxed ${
                isTablet ? 'text-5xl' : 'text-6xl'
              }`}>
                {activeTranslation.translation}
              </h1>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-3 text-sm text-[#d4af37]/60">
                  <div className="w-2 h-2 bg-[#ffd700] rounded-full animate-ping" />
                  <span className="uppercase tracking-wider">Processing</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial state: No translations yet */}
        {!activeTranslation && (
          <div className="relative z-10 text-center flex flex-col items-center justify-center min-h-[60vh]">
            <VoiceTransLogo size="hero" animated={true} />
            <h1 className="text-5xl font-bold mt-8 mb-4">VoiceTrans</h1>
            <p className="text-[#d4af37] uppercase tracking-[6px] text-sm">
              Luxury AI Translation System
            </p>
            {!isConfigured && (
              <p className="text-yellow-500 text-sm mt-8 bg-yellow-500/10 inline-block px-6 py-3 rounded-lg border border-yellow-500/30">
                Please configure API keys in settings
              </p>
            )}
          </div>
        )}

        {/* History Panel - Elegant Timeline */}
        {translations.length > 0 && (
          <div className={`${
            isMobile
              ? 'absolute inset-0 bg-[#0a0a0a] pt-4 pb-6'
              : 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent pt-12 pb-6'
          }`} ref={historyRef}>
            <div className={`mx-auto ${
              isMobile ? 'max-w-sm px-4' : isTablet ? 'max-w-4xl px-6' : 'max-w-6xl px-8'
            }`}>
              {/* Header */}
              <div className={`flex items-center mb-4 ${
                isMobile ? 'flex-wrap gap-2' : 'justify-between'
              }`}>
                <div className={`flex items-center ${isMobile ? 'gap-2 flex-1 min-w-full' : 'gap-3 flex-1'}`}>
                  <div className={`h-px bg-gradient-to-r from-transparent to-[#d4af37]/50 ${
                    isMobile ? 'w-4' : 'w-8'
                  }`} />
                  <span className={`text-[#d4af37]/80 uppercase font-medium ${
                    isMobile ? 'text-[10px] tracking-[1px]' : 'text-xs tracking-[3px]'
                  }`}>
                    Recent Translations
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
                </div>
                <div className={`flex items-center ${isMobile ? 'gap-2 ml-auto' : 'gap-3'}`}>
                  {!isMobile && (
                    <span className="text-xs text-[#d4af37]/60">
                      {translations.length} total
                    </span>
                  )}
                  <button
                    onClick={clearTranslations}
                    className={`group flex items-center rounded-lg bg-[#1a1a1a]/80 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 transition-all duration-300 ${
                      isMobile
                        ? 'gap-1 px-2 py-1.5 min-w-touch min-h-touch'
                        : 'gap-1.5 px-3 py-1.5'
                    }`}
                    title="Clear all translations"
                  >
                    <Trash2 className={`text-red-500/70 group-hover:text-red-500 transition-colors ${
                      isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    }`} />
                    {!isMobile && (
                      <span className="text-xs text-red-500/70 group-hover:text-red-500 uppercase tracking-wider font-medium transition-colors">
                        Clear
                      </span>
                    )}
                  </button>
                  <button
                    onClick={exportTranslations}
                    className={`group flex items-center rounded-lg bg-[#1a1a1a]/80 border border-[#d4af37]/30 hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 transition-all duration-300 ${
                      isMobile
                        ? 'gap-1 px-2 py-1.5 min-w-touch min-h-touch'
                        : 'gap-1.5 px-3 py-1.5'
                    }`}
                    title="Export to TXT"
                  >
                    <Download className={`text-[#d4af37]/70 group-hover:text-[#d4af37] transition-colors ${
                      isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'
                    }`} />
                    {!isMobile && (
                      <span className="text-xs text-[#d4af37]/70 group-hover:text-[#d4af37] uppercase tracking-wider font-medium transition-colors">
                        Export
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className={`space-y-3 overflow-y-auto custom-scrollbar ${
                isMobile ? 'max-h-[calc(100vh-180px)] pr-1 pb-2' : 'max-h-[200px] pr-2'
              }`}>
                {translations.slice(-maxVisibleTranslations).reverse().map((entry, index) => (
                  isMobile ? (
                    <MobileTranslationCard
                      key={entry.id}
                      entry={entry}
                      isActive={entry.isActive ?? false}
                    />
                  ) : (
                  <div
                    key={entry.id}
                    className={`group relative transition-all duration-300 ${
                      entry.isActive ? 'scale-100' : 'scale-95 hover:scale-98'
                    }`}
                  >
                    {/* Timeline connector */}
                    {index < translations.slice(-maxVisibleTranslations).length - 1 && (
                      <div className="absolute left-[7px] top-8 w-px h-full bg-gradient-to-b from-[#d4af37]/30 to-transparent" />
                    )}

                    <div
                      className={`relative flex gap-4 p-4 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                        entry.isActive
                          ? 'bg-[#d4af37]/10 border-2 border-[#d4af37]/40 shadow-lg shadow-[#d4af37]/20'
                          : 'bg-[#1a1a1a]/60 border border-[#d4af37]/15 hover:bg-[#1a1a1a]/80 hover:border-[#d4af37]/30'
                      }`}
                    >
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 pt-1">
                        <div
                          className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                            entry.isActive
                              ? 'bg-gradient-to-br from-[#d4af37] to-[#ffd700] border-[#ffd700] shadow-lg shadow-[#d4af37]/50 animate-pulse'
                              : 'bg-[#0a0a0a] border-[#d4af37]/50 group-hover:border-[#d4af37]'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Original Text */}
                        <div>
                          <div className="text-[10px] text-[#d4af37]/60 uppercase tracking-wider mb-1 font-medium">
                            Original
                          </div>
                          <p className={`text-sm leading-relaxed ${
                            entry.isActive ? 'text-white font-medium' : 'text-white/70'
                          }`}>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <div className="h-px flex-1 bg-gradient-to-l from-[#d4af37]/20 to-transparent" />
                        </div>

                        {/* Translation */}
                        <div>
                          <div className="text-[10px] text-[#d4af37]/80 uppercase tracking-wider mb-1 font-medium">
                            Translation
                          </div>
                          <p className={`text-sm leading-relaxed bg-gradient-to-r from-[#d4af37] to-[#ffd700] bg-clip-text ${
                            entry.isActive ? 'text-transparent font-semibold' : 'text-transparent'
                          }`}>
                            {entry.translation}
                          </p>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-[10px] text-[#d4af37]/40 pt-1">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {entry.latency.toFixed(2)}s
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {entry.processing_speed.toFixed(1)}x
                          </span>
                          <span className="flex-1 text-right opacity-60">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowClearModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl border-2 border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/20 max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[#d4af37]/50 rounded-tl-2xl" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[#d4af37]/50 rounded-br-2xl" />

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500/40 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Clear All Translations?
            </h3>

            {/* Description */}
            <p className="text-center text-gray-400 mb-2 leading-relaxed">
              This will permanently delete all {translations.length} translation{translations.length !== 1 ? 's' : ''} from your history.
            </p>
            <p className="text-center text-red-500/80 text-sm mb-8">
              This action cannot be undone.
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-6 py-3 rounded-lg bg-[#1a1a1a] border border-[#d4af37]/30 text-[#d4af37] hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 transition-all duration-300 font-medium uppercase tracking-wider text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 transition-all duration-300 font-medium uppercase tracking-wider text-sm shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
