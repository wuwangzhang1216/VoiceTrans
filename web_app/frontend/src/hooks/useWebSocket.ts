/**
 * Custom hook for WebSocket connection management
 * with automatic reconnection and heartbeat monitoring
 */
import { useState, useEffect, useCallback, useRef } from 'react'

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export function useWebSocket({
  url,
  onMessage,
  onError,
  onConnect,
  onDisconnect,
  autoReconnect = true,
  maxReconnectAttempts = 5,
  heartbeatInterval = 30000
}: UseWebSocketOptions) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastError, setLastError] = useState<string | null>(null)

  const reconnectAttempts = useRef(0)
  const heartbeatTimer = useRef<number | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const isManualClose = useRef(false)

  // Send message through WebSocket
  const sendMessage = useCallback((data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data))
      return true
    }
    return false
  }, [socket])

  // Start heartbeat monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      window.clearInterval(heartbeatTimer.current)
    }

    heartbeatTimer.current = window.setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' })
      }
    }, heartbeatInterval)
  }, [socket, heartbeatInterval, sendMessage])

  // Stop heartbeat monitoring
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      window.clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
  }, [])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    console.log(`Connecting to WebSocket: ${url}`)
    setStatus('connecting')
    setLastError(null)

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setStatus('connected')
        reconnectAttempts.current = 0
        startHeartbeat()
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle pong response
          if (data.type === 'pong') {
            return
          }

          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setLastError('Connection error occurred')
        setStatus('error')
        onError?.(error)
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setStatus('disconnected')
        stopHeartbeat()
        setSocket(null)
        onDisconnect?.()

        // Auto-reconnect with exponential backoff
        if (autoReconnect && !isManualClose.current && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`)

          reconnectTimer.current = window.setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setLastError('Max reconnection attempts reached')
          setStatus('error')
        }
      }

      setSocket(ws)
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setLastError('Failed to create connection')
      setStatus('error')
    }
  }, [url, autoReconnect, maxReconnectAttempts, onConnect, onMessage, onError, onDisconnect, startHeartbeat, stopHeartbeat, socket])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isManualClose.current = true
    stopHeartbeat()

    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }

    if (socket) {
      socket.close()
      setSocket(null)
    }

    setStatus('disconnected')
    reconnectAttempts.current = 0
  }, [socket, stopHeartbeat])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isManualClose.current = true
      stopHeartbeat()

      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current)
      }

      if (socket) {
        socket.close()
      }
    }
  }, [socket, stopHeartbeat])

  return {
    socket,
    status,
    lastError,
    connect,
    disconnect,
    sendMessage,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting'
  }
}
