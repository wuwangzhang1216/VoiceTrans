import { useState, useEffect, useRef, useCallback } from 'react'
import { Language } from '../App'
import { Mic, MicOff, Settings, Activity, Globe, Clock, Zap, Volume2, Languages, Maximize2 } from 'lucide-react'

interface RealtimeSubtitlesProps {
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

export function RealtimeSubtitles({
  languages,
  selectedLanguage,
  onLanguageChange,
  onSettingsClick,
  apiConfig
}: RealtimeSubtitlesProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [translations, setTranslations] = useState<TranslationEntry[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [status, setStatus] = useState('Disconnected')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [stats, setStats] = useState({
    latency: 0,
    speed: 0,
    total: 0
  })

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioLevelIntervalRef = useRef<number | null>(null)
  const translationsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest
  useEffect(() => {
    if (translationsEndRef.current) {
      translationsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [translations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const wsUrl = `${protocol}//${host}:8002/ws/stream`

    console.log('Connecting to streaming WebSocket:', wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setStatus('Connected')
        console.log('WebSocket connected')
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
                isActive: true
              }

              setTranslations(prev => {
                // Mark previous entries as inactive
                const updated = prev.map(t => ({ ...t, isActive: false }))
                // Add new entry as active
                return [...updated, entry].slice(-20) // Keep last 20
              })

              // Update stats
              setStats(prev => ({
                latency: data.latency,
                speed: data.processing_speed,
                total: prev.total + 1
              }))

              console.log(`Translation #${stats.total + 1}:`, data.transcription, '->', data.translation)
              break

            case 'error':
              console.error('Stream error:', data.message)
              setIsProcessing(false)
              break
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('Error')
        setIsConnected(false)
      }

      ws.onclose = () => {
        setIsConnected(false)
        setStatus('Disconnected')
        console.log('WebSocket disconnected')
      }

    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setStatus('Failed')
    }
  }, [stats.total])

  // Start recording and streaming
  const startRecording = async () => {
    try {
      // Connect WebSocket first
      connectWebSocket()
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      streamRef.current = stream

      // Create audio context at 16kHz
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)

      // Create processor for continuous streaming
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)

      // Audio level analyzer
      const analyser = audioContextRef.current.createAnalyser()
      sourceRef.current.connect(analyser)
      analyser.fftSize = 256

      // Monitor audio level
      audioLevelIntervalRef.current = window.setInterval(() => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(average / 255)
      }, 100)

      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)

          // Convert float32 to int16 PCM
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }

          // Convert to base64
          const bytes = new Uint8Array(pcmData.buffer)
          let binary = ''
          bytes.forEach(byte => binary += String.fromCharCode(byte))
          const base64 = btoa(binary)

          // Send to WebSocket
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64,
            target_language: selectedLanguage
          }))
        }
      }

      // Connect audio nodes
      sourceRef.current.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)

      setIsRecording(true)
      setStatus('Streaming')

    } catch (error) {
      console.error('Failed to start recording:', error)
      setStatus('Mic denied')
      alert('Failed to access microphone. Please check your permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
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
    setStatus('Stopped')
  }

  // Clear history
  const clearHistory = () => {
    setTranslations([])
    setStats({ latency: 0, speed: 0, total: 0 })
  }

  // Check if API is configured
  const isConfigured = apiConfig.fireworks_api_key && apiConfig.gemini_api_key

  // Get active translation (most recent)
  const activeTranslation = translations.find(t => t.isActive) || translations[translations.length - 1]

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            VoiceTrans
          </h1>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              isRecording ? 'bg-red-500 animate-pulse' :
              isConnected ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            <span className="text-gray-400">{status}</span>
          </div>

          {/* Audio Level */}
          {isRecording && (
            <div className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-gray-400" />
              <div className="w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1">
            <Languages className="w-4 h-4 text-gray-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-gray-800 text-sm text-white px-2 py-1 rounded border border-gray-700 focus:outline-none focus:border-cyan-500"
              disabled={isRecording}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{stats.latency.toFixed(2)}s</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{stats.speed.toFixed(1)}x</span>
            </div>
            <span className="text-gray-600">#{stats.total}</span>
          </div>

          {/* Controls */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
            title="Toggle history"
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={onSettingsClick}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>

          {/* Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isConfigured}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm font-medium ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : isConfigured
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Primary Display - Current Translation */}
        <div className="flex-1 flex flex-col justify-center p-8 relative">
          {activeTranslation ? (
            <div className="max-w-6xl mx-auto w-full space-y-6">
              {/* Original Text */}
              <div className="text-center">
                <div className="text-4xl leading-relaxed text-gray-300 mb-4">
                  {activeTranslation.transcription}
                </div>

                {/* Divider */}
                <div className="flex items-center justify-center gap-4 my-4">
                  <div className="h-px bg-gray-700 flex-1" />
                  <Activity className="w-4 h-4 text-cyan-500" />
                  <div className="h-px bg-gray-700 flex-1" />
                </div>

                {/* Translation */}
                <div className="text-5xl leading-relaxed font-medium text-cyan-400">
                  {activeTranslation.translation}
                </div>
              </div>

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
                    Processing...
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <Globe className="w-20 h-20 mx-auto mb-4 opacity-20" />
              <p className="text-xl mb-2">实时字幕翻译</p>
              <p className="text-sm">Click Start to begin real-time translation</p>
              {!isConfigured && (
                <p className="text-yellow-400 text-sm mt-4">
                  ⚠️ Configure API keys in settings first
                </p>
              )}
            </div>
          )}
        </div>

        {/* History Panel (Collapsible) */}
        {showHistory && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">History</h3>
                {translations.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {translations.length === 0 ? (
                  <div className="text-center text-gray-600 py-4 text-sm">
                    No translations yet
                  </div>
                ) : (
                  translations.slice().reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        entry.isActive
                          ? 'bg-cyan-900/20 border-cyan-800'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}
                    >
                      <div className="text-gray-400 line-clamp-1">
                        {entry.transcription}
                      </div>
                      <div className="text-cyan-400 font-medium mt-1 line-clamp-1">
                        {entry.translation}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>{entry.latency}s</span>
                        <span>•</span>
                        <span>{entry.processing_speed}x</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={translationsEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}