/**
 * Custom hook for audio recording with PCM processing
 */
import { useState, useCallback, useRef, useEffect } from 'react'

interface UseAudioRecorderOptions {
  onAudioData?: (pcmData: Int16Array) => void
  onAudioLevel?: (level: number) => void
  sampleRate?: number
  updateInterval?: number
}

export function useAudioRecorder({
  onAudioData,
  onAudioLevel,
  sampleRate = 16000,
  updateInterval = 150
}: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorNodeRef = useRef<AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const levelUpdateTimerRef = useRef<number | null>(null)

  // Initialize audio level monitoring
  const startLevelMonitoring = useCallback(() => {
    if (levelUpdateTimerRef.current) {
      window.clearInterval(levelUpdateTimerRef.current)
    }

    levelUpdateTimerRef.current = window.setInterval(() => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate RMS level
        const sum = dataArray.reduce((acc, val) => acc + val * val, 0)
        const rms = Math.sqrt(sum / dataArray.length)
        const level = Math.min(rms / 128, 1) // Normalize to 0-1

        setAudioLevel(level)
        onAudioLevel?.(level)
      }
    }, updateInterval)
  }, [updateInterval, onAudioLevel])

  // Stop level monitoring
  const stopLevelMonitoring = useCallback(() => {
    if (levelUpdateTimerRef.current) {
      window.clearInterval(levelUpdateTimerRef.current)
      levelUpdateTimerRef.current = null
    }
    setAudioLevel(0)
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: sampleRate }
        }
      })

      mediaStreamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext

      // Create source node
      const source = audioContext.createMediaStreamSource(stream)
      sourceNodeRef.current = source

      // Create analyser for level monitoring
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      // Connect to analyser
      source.connect(analyser)

      // Create AudioWorklet processor
      await audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
              class PCMProcessor extends AudioWorkletProcessor {
                constructor() {
                  super()
                  this.bufferSize = 0
                }

                process(inputs, outputs, parameters) {
                  const input = inputs[0]
                  if (input.length > 0) {
                    const channelData = input[0]

                    // Convert Float32Array to Int16Array (PCM)
                    const pcmData = new Int16Array(channelData.length)
                    for (let i = 0; i < channelData.length; i++) {
                      const s = Math.max(-1, Math.min(1, channelData[i]))
                      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
                    }

                    // Send PCM data to main thread
                    this.port.postMessage({ pcmData: pcmData.buffer }, [pcmData.buffer])
                  }

                  return true
                }
              }

              registerProcessor('pcm-processor', PCMProcessor)
              `
            ],
            { type: 'application/javascript' }
          )
        )
      )

      const processorNode = new AudioWorkletNode(audioContext, 'pcm-processor')
      processorNodeRef.current = processorNode

      // Handle PCM data from processor
      processorNode.port.onmessage = (event) => {
        const pcmData = new Int16Array(event.data.pcmData)
        onAudioData?.(pcmData)
      }

      // Connect audio nodes
      source.connect(processorNode)
      processorNode.connect(audioContext.destination)

      // Start level monitoring
      startLevelMonitoring()

      setIsRecording(true)
      console.log('Audio recording started')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      console.error('Failed to start recording:', err)
      setError(errorMessage)
      throw err
    }
  }, [sampleRate, onAudioData, startLevelMonitoring])

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      // Stop level monitoring
      stopLevelMonitoring()

      // Disconnect and cleanup audio nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect()
        sourceNodeRef.current = null
      }

      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect()
        processorNodeRef.current = null
      }

      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      setIsRecording(false)
      console.log('Audio recording stopped')
    } catch (err) {
      console.error('Error stopping recording:', err)
    }
  }, [stopLevelMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
    }
  }, [isRecording, stopRecording])

  return {
    isRecording,
    audioLevel,
    error,
    startRecording,
    stopRecording
  }
}
