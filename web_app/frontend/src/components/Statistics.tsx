import { ChartBarIcon, ClockIcon, BoltIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import type { Stats } from '../App'

interface StatisticsProps {
  stats: Stats
}

export function Statistics({ stats }: StatisticsProps) {
  const statItems = [
    {
      name: 'Total Translations',
      value: stats.total_translations,
      icon: DocumentTextIcon,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      name: 'Total Words',
      value: stats.total_words,
      icon: ChartBarIcon,
      color: 'text-green-600 bg-green-100'
    },
    {
      name: 'Avg Latency',
      value: `${stats.avg_latency.toFixed(2)}s`,
      icon: ClockIcon,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      name: 'API Calls',
      value: stats.api_calls,
      icon: BoltIcon,
      color: 'text-orange-600 bg-orange-100'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Statistics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item) => (
          <div
            key={item.name}
            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className={`inline-flex p-2 rounded-lg ${item.color} mb-2`}>
              <item.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {item.value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.name}
            </p>
          </div>
        ))}
      </div>

      {stats.api_errors > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            API Errors: {stats.api_errors}
          </p>
        </div>
      )}
    </div>
  )
}