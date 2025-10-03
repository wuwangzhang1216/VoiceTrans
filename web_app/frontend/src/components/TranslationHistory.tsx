import { TrashIcon } from '@heroicons/react/24/outline'
import type { Translation } from '../App'

interface TranslationHistoryProps {
  translations: Translation[]
  onClear: () => void
}

export function TranslationHistory({ translations, onClear }: TranslationHistoryProps) {
  if (translations.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          History
        </h3>
        <button
          onClick={onClear}
          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
          aria-label="Clear history"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {translations.slice(1).map((translation) => (
          <div
            key={translation.id}
            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  {translation.transcription}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {translation.translation}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(translation.timestamp).toLocaleTimeString()} • {translation.latency.toFixed(2)}s
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}