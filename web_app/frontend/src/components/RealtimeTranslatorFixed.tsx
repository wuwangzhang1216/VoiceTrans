import { useState, useEffect, useRef, useCallback } from 'react'
import { Language } from '../App'
import { Mic, MicOff, Settings, Activity, Globe, Clock, Zap } from 'lucide-react'

interface RealtimeTranslatorProps {
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
  isProcessing?: boolean
}

// Audio recorder using Web Audio API for PCM data
class AudioRecorder {
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private stream: MediaStream | null = null
  private onDataCallback: ((data: ArrayBuffer) => void) | null = null

  async start(onData: (data: ArrayBuffer) => void) {
    this.onDataCallback = onData

    // Get microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    // Create audio context at 16kHz
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    this.source = this.audioContext.createMediaStreamSource(this.stream)

    // Create processor with 30ms chunks (480 samples at 16kHz)
    this.processor = this.audioContext.createScriptProcessor(512, 1, 1)

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)

      // Convert float32 to int16 PCM
      const pcmData = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]))
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // Send PCM data
      if (this.onDataCallback) {
        this.onDataCallback(pcmData.buffer)
      }
    }

    // Connect audio nodes
    this.source.connect(this.processor)
    this.processor.connect(this.audioContext.destination)
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
  }

  getAudioLevel(): number {
    // Simple audio level for visualization
    return Math.random() * 0.5 + 0.2
  }
}

export function RealtimeTranslator({
  languages,
  selectedLanguage,
  onLanguageChange,
  onSettingsClick,
  apiConfig
}: RealtimeTranslatorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [translations, setTranslations] = useState<TranslationEntry[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [status, setStatus] = useState('Disconnected')
  const [stats, setStats] = useState({
    latency: 0,
    speed: 0,
    total: 0
  })

  const wsRef = useRef<WebSocket | null>(null)
  const audioRecorderRef = useRef<AudioRecorder | null>(null)
  const translationsEndRef = useRef<HTMLDivElement>(null)
  const audioLevelIntervalRef = useRef<number | null>(null)

  // Auto-scroll to latest translation
  useEffect(() => {
    translationsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [translations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop()
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current)
      }
    }
  }, [])

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const wsUrl = `${protocol}//${host}:8001/ws/translate`

    console.log('Connecting to WebSocket:', wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setStatus('Connected - Ready')
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received message:', data.type)

          switch (data.type) {
            case 'connected':
              setStatus('Connected - Ready')
              break

            case 'recording_started':
              setStatus('Listening - Speech detected')
              setIsListening(true)
              break

            case 'processing':
              setStatus('Processing...')
              setIsListening(false)
              // Add processing entry
              const processingId = Date.now().toString()
              setTranslations(prev => [...prev, {
                id: processingId,
                transcription: '...',
                translation: '...',
                timestamp: new Date().toISOString(),
                latency: 0,
                processing_speed: 0,
                isProcessing: true
              }])
              break

            case 'translation':
              setStatus('Connected - Ready')
              console.log('Translation received:', data.transcription, '->', data.translation)

              // Update the last processing entry or add new one
              setTranslations(prev => {
                const newList = [...prev]
                const lastIndex = newList.findIndex(t => t.isProcessing)

                const newEntry = {
                  id: lastIndex >= 0 ? newList[lastIndex].id : Date.now().toString(),
                  transcription: data.transcription,
                  translation: data.translation,
                  timestamp: data.timestamp,
                  latency: data.latency,
                  processing_speed: data.processing_speed,
                  isProcessing: false
                }

                if (lastIndex >= 0) {
                  newList[lastIndex] = newEntry
                } else {
                  newList.push(newEntry)
                }

                return newList
              })

              // Update stats
              setStats(prev => ({
                latency: data.latency,
                speed: data.processing_speed,
                total: prev.total + 1
              }))
              break

            case 'error':
              console.error('Translation error:', data.message)
              setStatus(`Error: ${data.message}`)
              // Remove processing entry on error
              setTranslations(prev => prev.filter(t => !t.isProcessing))
              break
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('Connection error')
        setIsConnected(false)
      }

      ws.onclose = () => {
        setIsConnected(false)
        setStatus('Disconnected')
        console.log('WebSocket disconnected')
      }

    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setStatus('Failed to connect')
    }
  }, [])

  // Start recording and streaming
  const startRecording = async () => {
    try {
      // Connect WebSocket if not connected
      if (!isConnected) {
        connectWebSocket()
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Create audio recorder
      const recorder = new AudioRecorder()
      audioRecorderRef.current = recorder

      // Start recording with callback
      await recorder.start((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert ArrayBuffer to base64
          const bytes = new Uint8Array(audioData)
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
      })

      // Start audio level monitoring
      audioLevelIntervalRef.current = window.setInterval(() => {
        if (audioRecorderRef.current) {
          setAudioLevel(audioRecorderRef.current.getAudioLevel())
        }
      }, 100)

      setIsRecording(true)
      setStatus('Listening...')

    } catch (error) {
      console.error('Failed to start recording:', error)
      setStatus('Microphone access denied')
      alert('Failed to access microphone. Please check your permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    console.log('Stopping recording...')

    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop()
      audioRecorderRef.current = null
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
    setIsListening(false)
    setAudioLevel(0)
    setStatus('Disconnected')
  }

  // Clear history
  const clearHistory = () => {
    setTranslations([])
    setStats({ latency: 0, speed: 0, total: 0 })
  }

  // Check if API is configured
  const isConfigured = apiConfig.fireworks_api_key && apiConfig.gemini_api_key

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-cyan-400">VoiceTrans</h1>
            <span className="text-sm text-gray-400">Real-time Voice Translation</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-gray-700 text-gray-100 px-3 py-2 rounded-lg border border-gray-600 focus:border-cyan-400 focus:outline-none"
              disabled={isRecording}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>

            {/* Settings Button */}
            <button
              onClick={onSettingsClick}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className="text-gray-400">{status}</span>
          </div>

          {isRecording && (
            <>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-100"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
              </div>

              {isListening && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span>Speech Detected</span>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-4 ml-auto text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{stats.latency.toFixed(3)}s</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>{stats.speed.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>{stats.total} translations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Translation Display */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {translations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Click the microphone to start real-time translation</p>
                <p className="text-sm mt-2">Speech will be automatically detected and translated</p>
                {!isConfigured && (
                  <p className="text-yellow-400 text-sm mt-4">
                    ⚠️ Please configure API keys in settings first
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {translations.map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${
                    entry.isProcessing ? 'animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-cyan-400 mb-2">
                        {entry.isProcessing ? (
                          <span className="inline-block animate-pulse">Processing...</span>
                        ) : (
                          entry.transcription
                        )}
                      </div>
                      <div className="text-green-400 text-lg">
                        {entry.isProcessing ? (
                          <span className="inline-block animate-pulse">...</span>
                        ) : (
                          entry.translation
                        )}
                      </div>
                    </div>
                    {!entry.isProcessing && (
                      <div className="text-xs text-gray-500 text-right">
                        <div>{new Date(entry.timestamp).toLocaleTimeString()}</div>
                        <div className="mt-1">{entry.latency}s • {entry.processing_speed}x</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={translationsEndRef} />
            </>
          )}
        </div>

        {/* Control Bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Record Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConfigured}
                className={`p-4 rounded-full transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : isConfigured
                    ? 'bg-cyan-500 hover:bg-cyan-600'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                title={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>

              {!isConfigured && (
                <span className="text-yellow-400 text-sm">
                  Please configure API keys in settings
                </span>
              )}
            </div>

            {/* Clear Button */}
            {translations.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                Clear History
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}