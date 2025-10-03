import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import type { Language } from '../App'

interface LanguageSelectorProps {
  languages: Language[]
  selectedLanguage: string
  onLanguageChange: (language: string) => void
}

export function LanguageSelector({
  languages,
  selectedLanguage,
  onLanguageChange
}: LanguageSelectorProps) {
  const selected = languages.find(l => l.code === selectedLanguage)

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Target Language
      </label>

      <Listbox value={selectedLanguage} onChange={onLanguageChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-gray-700 py-3 pl-4 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
            <span className="block truncate">
              {selected ? (
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{selected.flag}</span>
                  <span className="text-gray-900 dark:text-white">{selected.name}</span>
                </span>
              ) : (
                'Select a language'
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {languages.map((language) => (
                <Listbox.Option
                  key={language.code}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                        : 'text-gray-900 dark:text-white'
                    }`
                  }
                  value={language.code}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`flex items-center gap-2 ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        <span className="text-2xl">{language.flag}</span>
                        <span>{language.name}</span>
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600 dark:text-amber-300">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}