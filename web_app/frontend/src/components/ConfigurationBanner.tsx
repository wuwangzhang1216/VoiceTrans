import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfigurationBannerProps {
  onConfigure: () => void
}

export function ConfigurationBanner({ onConfigure }: ConfigurationBannerProps) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            API keys not configured. Please{' '}
            <button
              type="button"
              onClick={onConfigure}
              className="font-medium underline text-yellow-700 hover:text-yellow-600"
            >
              configure your API keys
            </button>{' '}
            to enable translation.
          </p>
        </div>
      </div>
    </div>
  )
}