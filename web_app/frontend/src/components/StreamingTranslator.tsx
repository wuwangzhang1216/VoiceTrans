import { useState, useEffect, useRef, useCallback } from 'react'
import { Language } from '../App'
import { Mic, MicOff, Settings, Activity, Globe, Clock, Zap, Wifi, WifiOff } from 'lucide-react'

interface StreamingTranslatorProps {
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
}

export function StreamingTranslator({
  languages,
  selectedLanguage,
  onLanguageChange,
  onSettingsClick,
  apiConfig
}: StreamingTranslatorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentTranscription, setCurrentTranscription] = useState('')
  const [currentTranslation, setCurrentTranslation] = useState('')
  const [recentTranslations, setRecentTranslations] = useState<TranslationEntry[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [status, setStatus] = useState('Disconnected')
  const [isProcessing, setIsProcessing] = useState(false)
  const [stats, setStats] = useState({
    latency: 0,
    speed: 0,
    total: 0,
    avgLatency: 0
  })

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioLevelIntervalRef = useRef<number | null>(null)

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
              setStatus('Ready for streaming')
              break

            case 'processing':
              setIsProcessing(true)
              break

            case 'translation':
              setIsProcessing(false)

              // Update current display
              setCurrentTranscription(data.transcription)
              setCurrentTranslation(data.translation)

              // Add to recent history
              const entry: TranslationEntry = {
                id: Date.now().toString(),
                transcription: data.transcription,
                translation: data.translation,
                timestamp: data.timestamp,
                latency: data.latency,
                processing_speed: data.processing_speed
              }

              setRecentTranslations(prev => {
                const newList = [...prev, entry]
                // Keep only last 5 entries
                return newList.slice(-5)
              })

              // Update stats
              setStats(prev => ({
                latency: data.latency,
                speed: data.processing_speed,
                total: prev.total + 1,
                avgLatency: ((prev.avgLatency * prev.total) + data.latency) / (prev.total + 1)
              }))

              console.log(`Translation #${stats.total + 1}:`, data.transcription, '->', data.translation)
              break

            case 'error':
              console.error('Stream error:', data.message)
              setStatus(`Error: ${data.message}`)
              setIsProcessing(false)
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
      // Use larger buffer for more stable streaming (4096 samples = 256ms at 16kHz)
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
      setStatus('Streaming...')

    } catch (error) {
      console.error('Failed to start recording:', error)
      setStatus('Microphone access denied')
      alert('Failed to access microphone. Please check your permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    console.log('Stopping recording...')

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
    setRecentTranslations([])
    setCurrentTranscription('')
    setCurrentTranslation('')
    setStats({ latency: 0, speed: 0, total: 0, avgLatency: 0 })
  }

  // Check if API is configured
  const isConfigured = apiConfig.fireworks_api_key && apiConfig.gemini_api_key

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-mono">
      {/* Header */}
      <div className="bg-black border-b border-cyan-900 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-cyan-400">
              ▶ VoiceTrans <span className="text-xs text-gray-500">v3.0</span>
            </h1>
            <div className="flex items-center gap-2 text-xs">
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">STREAMING</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-500">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-black text-cyan-400 px-2 py-1 rounded border border-cyan-900 text-sm focus:outline-none focus:border-cyan-400"
              disabled={isRecording}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>

            <button
              onClick={onSettingsClick}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex">
        {/* Live Translation Panel */}
        <div className="flex-1 flex flex-col">
          {/* Current Translation Display */}
          <div className="flex-1 p-6">
            <div className="h-full flex flex-col justify-center">
              {currentTranscription || currentTranslation ? (
                <div className="space-y-6">
                  {/* Original Text */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Original</div>
                    <div className="text-2xl text-white leading-relaxed">
                      {currentTranscription || (
                        <span className="text-gray-600">Listening...</span>
                      )}
                    </div>
                  </div>

                  {/* Translated Text */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Translation</div>
                    <div className="text-3xl text-cyan-400 leading-relaxed font-medium">
                      {currentTranslation || (
                        isProcessing ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : (
                          <span className="text-gray-600">...</span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Globe className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">Ready for real-time translation</p>
                  <p className="text-sm">Click the microphone to start streaming</p>
                  {!isConfigured && (
                    <p className="text-yellow-400 text-sm mt-4">
                      ⚠️ Configure API keys in settings first
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Audio Level Meter */}
          {isRecording && (
            <div className="px-6 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-cyan-400" />
                <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-100"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{Math.round(audioLevel * 100)}%</span>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Latency: {stats.latency.toFixed(3)}s</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>Speed: {stats.speed.toFixed(1)}x</span>
              </div>
              <div>
                Total: {stats.total} | Avg: {stats.avgLatency.toFixed(3)}s
              </div>
            </div>
            <div className="text-gray-600">
              {status}
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="w-96 border-l border-gray-800 bg-black p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recent History</h3>
            {recentTranslations.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {recentTranslations.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                No translations yet
              </div>
            ) : (
              recentTranslations.map((entry) => (
                <div key={entry.id} className="p-3 bg-gray-900 rounded border border-gray-800">
                  <div className="text-gray-400 mb-1">
                    {entry.transcription}
                  </div>
                  <div className="text-cyan-400 mb-2">
                    → {entry.translation}
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span>{entry.latency}s</span>
                    <span>{entry.processing_speed}x</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-black border-t border-cyan-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Record Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isConfigured}
              className={`p-3 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : isConfigured
                  ? 'bg-cyan-600 hover:bg-cyan-700'
                  : 'bg-gray-700 cursor-not-allowed'
              }`}
              title={isRecording ? 'Stop streaming' : 'Start streaming'}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-white" />
              )}
            </button>

            <div className="text-sm">
              {isRecording ? (
                <span className="text-red-400">● Recording & Streaming</span>
              ) : (
                <span className="text-gray-500">Press to start</span>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-600">
            <kbd>Space</kbd> Start/Stop | <kbd>C</kbd> Clear | <kbd>L</kbd> Language | <kbd>Q</kbd> Quit
          </div>
        </div>
      </div>
    </div>
  )
}