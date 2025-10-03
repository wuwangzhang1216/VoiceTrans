import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Language } from '../App'

interface LanguageDropdownProps {
  languages: Language[]
  selectedLanguage: string
  onLanguageChange: (lang: string) => void
  disabled?: boolean
}

export function LanguageDropdown({
  languages,
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLang = languages.find((lang) => lang.code === selectedLanguage)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (code: string) => {
    onLanguageChange(code)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Selected Item Display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg
          bg-[#1a1a1a] text-white border border-[#d4af37]/30
          transition-all duration-300
          ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-[#d4af37]/50 cursor-pointer'
          }
          ${isOpen ? 'border-[#d4af37] shadow-lg shadow-[#d4af37]/20' : ''}
          min-w-[160px]
        `}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{selectedLang?.flag}</span>
          <span className="font-medium">{selectedLang?.name}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#d4af37] transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 right-0 mt-2
            bg-[#0a0a0a] border border-[#d4af37]/30 rounded-lg
            shadow-2xl shadow-black/50 overflow-hidden
            z-50 backdrop-blur-xl
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {languages.map((lang) => {
              const isSelected = lang.code === selectedLanguage
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3
                    text-left transition-all duration-200
                    ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-[#0a0a0a] font-bold'
                        : 'text-white hover:bg-[#1a1a1a] hover:bg-gradient-to-r hover:from-[#d4af37]/15 hover:to-[#ffd700]/15 hover:text-[#ffd700]'
                    }
                  `}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {isSelected && (
                    <span className="ml-auto">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #d4af37 0%, #ffd700 100%);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ffd700 0%, #d4af37 100%);
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-8px); }
          to { transform: translateY(0); }
        }

        .animate-in {
          animation: fade-in 200ms, slide-in-from-top-2 200ms;
        }
      `}</style>
    </div>
  )
}
