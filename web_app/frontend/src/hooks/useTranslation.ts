/**
 * Custom hook for managing translation state and history
 */
import { useState, useCallback, useMemo } from 'react'

export interface TranslationEntry {
  id: string
  transcription: string
  translation: string
  timestamp: string
  latency: number
  processing_speed: number
  source_language?: string
  target_language?: string
  isActive?: boolean
}

export interface TranslationStats {
  totalTranslations: number
  totalWords: number
  avgLatency: number
  avgSpeed: number
  cacheHits: number
}

export function useTranslation() {
  const [translations, setTranslations] = useState<TranslationEntry[]>([])
  const [activeTranslation, setActiveTranslation] = useState<TranslationEntry | null>(null)

  // Add new translation
  const addTranslation = useCallback((entry: Omit<TranslationEntry, 'id' | 'isActive'>) => {
    const newEntry: TranslationEntry = {
      ...entry,
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isActive: false
    }

    setTranslations(prev => [newEntry, ...prev])
    setActiveTranslation(newEntry)

    // Clear active state after a delay
    setTimeout(() => {
      setActiveTranslation(null)
    }, 3000)

    return newEntry
  }, [])

  // Update translation
  const updateTranslation = useCallback((id: string, updates: Partial<TranslationEntry>) => {
    setTranslations(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry))
    )
  }, [])

  // Remove translation
  const removeTranslation = useCallback((id: string) => {
    setTranslations(prev => prev.filter(entry => entry.id !== id))
  }, [])

  // Clear all translations
  const clearTranslations = useCallback(() => {
    setTranslations([])
    setActiveTranslation(null)
  }, [])

  // Export translations as JSON
  const exportTranslations = useCallback((format: 'json' | 'text' = 'json') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(translations, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `translations-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else {
      const textContent = translations
        .map(
          (entry, index) =>
            `[${index + 1}] ${new Date(entry.timestamp).toLocaleString()}\n` +
            `Original: ${entry.transcription}\n` +
            `Translation: ${entry.translation}\n` +
            `Latency: ${entry.latency.toFixed(2)}s | Speed: ${entry.processing_speed.toFixed(1)} words/s\n`
        )
        .join('\n---\n\n')

      const blob = new Blob([textContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `translations-${new Date().toISOString().split('T')[0]}.txt`
      link.click()
      URL.revokeObjectURL(url)
    }
  }, [translations])

  // Calculate statistics
  const stats = useMemo<TranslationStats>(() => {
    if (translations.length === 0) {
      return {
        totalTranslations: 0,
        totalWords: 0,
        avgLatency: 0,
        avgSpeed: 0,
        cacheHits: 0
      }
    }

    const totalWords = translations.reduce(
      (sum, entry) => sum + entry.transcription.split(/\s+/).length,
      0
    )

    const totalLatency = translations.reduce((sum, entry) => sum + entry.latency, 0)
    const avgLatency = totalLatency / translations.length

    const totalSpeed = translations.reduce((sum, entry) => sum + entry.processing_speed, 0)
    const avgSpeed = totalSpeed / translations.length

    return {
      totalTranslations: translations.length,
      totalWords,
      avgLatency,
      avgSpeed,
      cacheHits: 0 // Would need to track this from API responses
    }
  }, [translations])

  // Search translations
  const searchTranslations = useCallback((query: string) => {
    if (!query.trim()) return translations

    const lowerQuery = query.toLowerCase()
    return translations.filter(
      entry =>
        entry.transcription.toLowerCase().includes(lowerQuery) ||
        entry.translation.toLowerCase().includes(lowerQuery)
    )
  }, [translations])

  return {
    translations,
    activeTranslation,
    stats,
    addTranslation,
    updateTranslation,
    removeTranslation,
    clearTranslations,
    exportTranslations,
    searchTranslations
  }
}
