import { useState, useEffect } from 'react'
import axios from 'axios'
import { LuxuryTranslator } from './components/LuxuryTranslator'
import { SettingsModal } from './components/SettingsModal'

export interface Language {
  code: string
  name: string
  flag: string
}

export interface Translation {
  id: string
  transcription: string
  translation: string
  target_language: string
  latency: number
  processing_speed: number
  timestamp: string
}

export interface Stats {
  total_translations: number
  total_words: number
  avg_latency: number
  api_calls: number
  api_errors: number
}

export interface ApiConfig {
  fireworks_api_key: string
  gemini_api_key: string
}

function App() {
  const [languages, setLanguages] = useState<Language[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('zh')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    fireworks_api_key: '',
    gemini_api_key: ''
  })
  const [, setIsConfigured] = useState(false)

  // Load languages on mount
  useEffect(() => {
    fetchLanguages()
    checkConfiguration()
  }, [])

  const fetchLanguages = async () => {
    try {
      // Try the new streaming API first
      const response = await axios.get('http://localhost:8000/languages')
      setLanguages(response.data)
    } catch (error) {
      // Fallback to old API
      try {
        const response = await axios.get('/api/languages')
        setLanguages(response.data)
      } catch (err) {
        console.error('Failed to fetch languages:', err)
        // Set default languages
        setLanguages([
          { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
          { code: 'es', name: 'Spanish', flag: '🇪🇸' },
          { code: 'fr', name: 'French', flag: '🇫🇷' },
          { code: 'de', name: 'German', flag: '🇩🇪' },
          { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
          { code: 'ko', name: 'Korean', flag: '🇰🇷' }
        ])
      }
    }
  }

  const checkConfiguration = async () => {
    try {
      const response = await axios.get('http://localhost:8000/')
      setIsConfigured(response.data.initialized)

      // Load config from localStorage if exists
      const savedConfig = localStorage.getItem('voicetrans_config')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        setApiConfig(config)
        if (config.fireworks_api_key && config.gemini_api_key) {
          setIsConfigured(true)
        }
      }
    } catch (error) {
      console.error('Failed to check configuration:', error)

      // Check localStorage
      const savedConfig = localStorage.getItem('voicetrans_config')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        setApiConfig(config)
        if (config.fireworks_api_key && config.gemini_api_key) {
          setIsConfigured(true)
        }
      }
    }
  }

  const updateConfiguration = async (config: ApiConfig) => {
    try {
      // Save to localStorage
      localStorage.setItem('voicetrans_config', JSON.stringify(config))

      // Try to update backend config
      try {
        const response = await axios.post('http://localhost:8000/config', {
          fireworks_api_key: config.fireworks_api_key,
          gemini_api_key: config.gemini_api_key,
          default_target_language: selectedLanguage
        })

        setApiConfig(config)
        setIsConfigured(response.data.initialized)
        return response.data
      } catch (error) {
        // If backend fails, still save locally
        setApiConfig(config)
        if (config.fireworks_api_key && config.gemini_api_key) {
          setIsConfigured(true)
        }
        return { initialized: true }
      }
    } catch (error) {
      console.error('Failed to update configuration:', error)
      throw error
    }
  }

  return (
    <>
      {/* Luxury Translator Component */}
      <LuxuryTranslator
        languages={languages}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        onSettingsClick={() => setSettingsOpen(true)}
        apiConfig={apiConfig}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiConfig={apiConfig}
        onSave={updateConfiguration}
      />
    </>
  )
}

export default App