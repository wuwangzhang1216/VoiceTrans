import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ApiConfig } from '../App'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  apiConfig: ApiConfig
  onSave: (config: ApiConfig) => Promise<any>
}

export function SettingsModal({ isOpen, onClose, apiConfig, onSave }: SettingsModalProps) {
  const [config, setConfig] = useState(apiConfig)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      await onSave(config)
      onClose()
    } catch (err) {
      setError('Failed to save configuration. Please check your API keys.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1a1a1a] border border-[#d4af37]/30 p-6 text-left align-middle shadow-2xl shadow-black/50 transition-all">
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between mb-4"
                >
                  <h3 className="text-lg font-medium leading-6 text-[#d4af37]">
                    API Configuration
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-[#d4af37]/10 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-[#d4af37]/60 hover:text-[#d4af37]" />
                  </button>
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#ffd700] mb-1">
                      Fireworks API Key
                    </label>
                    <input
                      type="password"
                      value={config.fireworks_api_key}
                      onChange={(e) => setConfig({ ...config, fireworks_api_key: e.target.value })}
                      className="w-full px-3 py-2 border border-[#d4af37]/30 rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37]"
                      placeholder="fw_..."
                    />
                    <p className="mt-1 text-xs text-[#d4af37]/60">
                      Get your key at{' '}
                      <a
                        href="https://fireworks.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#d4af37] hover:text-[#ffd700] hover:underline"
                      >
                        fireworks.ai
                      </a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#ffd700] mb-1">
                      Google Gemini API Key
                    </label>
                    <input
                      type="password"
                      value={config.gemini_api_key}
                      onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
                      className="w-full px-3 py-2 border border-[#d4af37]/30 rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37]"
                      placeholder="AIza..."
                    />
                    <p className="mt-1 text-xs text-[#d4af37]/60">
                      Get your key at{' '}
                      <a
                        href="https://makersuite.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#d4af37] hover:text-[#ffd700] hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">
                        {error}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-lg border border-[#d4af37]/30 bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-[#d4af37]/80 hover:bg-[#d4af37]/10 hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-lg border border-transparent bg-gradient-to-r from-[#d4af37] to-[#ffd700] px-4 py-2 text-sm font-medium text-[#0a0a0a] hover:from-[#ffd700] hover:to-[#d4af37] shadow-lg shadow-[#d4af37]/30 hover:shadow-[#d4af37]/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}