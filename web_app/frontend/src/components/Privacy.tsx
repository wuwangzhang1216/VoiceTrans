import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

// VoiceTrans Logo Component
const BASE_LOGO_LEVELS = [0.25, 0.45, 0.85, 0.45, 0.25]

function VoiceTransLogo() {
  const sizeClasses = {
    circle: 'w-12 h-12',
    inner: 'w-10 h-10',
    wave: 'w-[3px]',
    baseHeights: [7, 11, 15, 11, 7],
  }

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes wave {
        0%, 100% { transform: scaleY(1); opacity: 0.6; }
        50% { transform: scaleY(1.4); opacity: 1; }
      }
      .animate-wave {
        animation: wave 1.2s ease-in-out infinite;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div
      className={`${sizeClasses.circle} relative rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] flex items-center justify-center shadow-xl border-2 border-[#d4af37]/30`}
    >
      <div
        className={`${sizeClasses.inner} rounded-full bg-[#0a0a0a] flex items-center justify-center border border-[#d4af37]/20`}
      >
        <div className="flex gap-1 items-center">
          {BASE_LOGO_LEVELS.map((_, i) => {
            const baseHeight = sizeClasses.baseHeights[i] ?? sizeClasses.baseHeights[2]

            return (
              <div
                key={i}
                className={`${sizeClasses.wave} bg-gradient-to-t from-[#d4af37] to-[#ffd700] rounded-full shadow-md shadow-[#ffd700]/50 animate-wave`}
                style={{
                  height: `${baseHeight}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#d4af37]/20 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VoiceTransLogo />
              <div>
                <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  VoiceTrans
                </h1>
                <p className="text-[10px] text-[#d4af37] tracking-[3px] uppercase mt-0.5">
                  Luxury AI Translation
                </p>
              </div>
            </div>

            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#d4af37]/30 hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 transition-all duration-300 group"
            >
              <ArrowLeft className="w-4 h-4 text-[#d4af37]/60 group-hover:text-[#d4af37] transition-colors" />
              <span className="text-sm text-[#d4af37]/60 group-hover:text-[#d4af37] uppercase tracking-wider font-medium transition-colors">
                Back
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#d4af37]/50" />
            <Shield className="w-8 h-8 text-[#d4af37]" />
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#d4af37]/50" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wider mb-2 bg-gradient-to-r from-white via-[#ffd700] to-white bg-clip-text text-transparent">
            Privacy Policy
          </h2>
          <p className="text-[#d4af37]/80 text-sm uppercase tracking-[3px]">Last Updated: October 22, 2025</p>
        </div>

        {/* Content Card */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl border-2 border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/20 p-6 sm:p-8 space-y-8">

          {/* Introduction */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Introduction
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              VoiceTrans ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our voice translation service through the OpenAI GPT Store.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Information We Collect
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0a0a0a]/50 p-4 rounded-lg border border-[#d4af37]/10">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-3">Audio Data</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><span className="text-[#d4af37] font-medium">What we collect:</span> Audio files you upload for translation</li>
                  <li><span className="text-[#d4af37] font-medium">How we use it:</span> To transcribe and translate your audio</li>
                  <li><span className="text-[#d4af37] font-medium">Storage:</span> Audio files are processed in real-time and are NOT stored permanently on our servers</li>
                  <li><span className="text-[#d4af37] font-medium">Retention:</span> Audio data is temporarily cached during processing and automatically deleted after the translation is complete</li>
                </ul>
              </div>

              <div className="bg-[#0a0a0a]/50 p-4 rounded-lg border border-[#d4af37]/10">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-3">Transcription and Translation Data</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><span className="text-[#d4af37] font-medium">What we collect:</span> The text transcription and translation results</li>
                  <li><span className="text-[#d4af37] font-medium">How we use it:</span> To provide you with translation results and improve our service quality</li>
                  <li><span className="text-[#d4af37] font-medium">Storage:</span> Transcriptions may be temporarily logged for debugging purposes</li>
                  <li><span className="text-[#d4af37] font-medium">Retention:</span> Logs are retained for a maximum of 30 days</li>
                </ul>
              </div>

              <div className="bg-[#0a0a0a]/50 p-4 rounded-lg border border-[#d4af37]/10">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-3">Usage Statistics</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><span className="text-[#d4af37] font-medium">What we collect:</span> Anonymous usage metrics including:
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>Number of translations processed</li>
                      <li>Average processing latency</li>
                      <li>Language pairs used</li>
                      <li>Error rates</li>
                    </ul>
                  </li>
                  <li><span className="text-[#d4af37] font-medium">How we use it:</span> To monitor service performance and improve user experience</li>
                  <li><span className="text-[#d4af37] font-medium">Storage:</span> Aggregated anonymously with no personally identifiable information</li>
                </ul>
              </div>

              <div className="bg-[#0a0a0a]/50 p-4 rounded-lg border border-[#d4af37]/10">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-3">Technical Information</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><span className="text-[#d4af37] font-medium">What we collect:</span>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>IP address (automatically collected)</li>
                      <li>Browser type and version</li>
                      <li>Device information</li>
                      <li>Timestamp of requests</li>
                    </ul>
                  </li>
                  <li><span className="text-[#d4af37] font-medium">How we use it:</span> For security, troubleshooting, and service optimization</li>
                  <li><span className="text-[#d4af37] font-medium">Storage:</span> Server logs retained for 7 days</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                How We Use Your Information
              </h3>
            </div>
            <p className="text-gray-300 mb-3 leading-relaxed">We use your information solely for the following purposes:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
              <li><span className="text-[#d4af37] font-medium">Service Delivery:</span> To transcribe and translate your audio files</li>
              <li><span className="text-[#d4af37] font-medium">Service Improvement:</span> To analyze performance and enhance accuracy</li>
              <li><span className="text-[#d4af37] font-medium">Technical Support:</span> To troubleshoot issues and provide customer support</li>
              <li><span className="text-[#d4af37] font-medium">Security:</span> To detect and prevent abuse, fraud, or security threats</li>
              <li><span className="text-[#d4af37] font-medium">Legal Compliance:</span> To comply with applicable laws and regulations</li>
            </ol>
          </section>

          {/* Third-Party Services */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Third-Party Services
              </h3>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">VoiceTrans uses the following third-party AI services to process your data:</p>

            <div className="space-y-3">
              <div className="bg-[#0a0a0a]/50 p-4 rounded-lg border border-[#d4af37]/20">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-3">Fireworks AI</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><span className="text-[#d4af37] font-medium">Purpose:</span> Audio transcription using Whisper model</li>
                  <li><span className="text-[#d4af37] font-medium">Data Shared:</span> Audio files</li>
                  <li><span className="text-[#d4af37] font-medium">Privacy Policy:</span> <a href="https://fireworks.ai/privacy-policy" className="text-[#ffd700] hover:text-[#d4af37] underline transition-colors" target="_blank" rel="noopener noreferrer">fireworks.ai/privacy-policy</a></li>
                  <li><span className="text-[#d4af37] font-medium">Data Processing:</span> Audio is processed through Fireworks AI's secure API</li>
                </ul>
              </div>

              <div className="bg-[#0a0a0a]/50 p-4 rounded-lg border border-[#d4af37]/20">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-3">Google Gemini</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><span className="text-[#d4af37] font-medium">Purpose:</span> Text translation</li>
                  <li><span className="text-[#d4af37] font-medium">Data Shared:</span> Transcribed text</li>
                  <li><span className="text-[#d4af37] font-medium">Privacy Policy:</span> <a href="https://policies.google.com/privacy" className="text-[#ffd700] hover:text-[#d4af37] underline transition-colors" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a></li>
                  <li><span className="text-[#d4af37] font-medium">Data Processing:</span> Text is processed through Google's secure API</li>
                </ul>
              </div>

              <div className="bg-[#0a0a0a]/50 p-4 rounded-lg border border-[#d4af37]/20">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-3">OpenAI</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                  <li><span className="text-[#d4af37] font-medium">Purpose:</span> Hosting the GPT interface</li>
                  <li><span className="text-[#d4af37] font-medium">Data Shared:</span> Your conversations with the GPT</li>
                  <li><span className="text-[#d4af37] font-medium">Privacy Policy:</span> <a href="https://openai.com/privacy" className="text-[#ffd700] hover:text-[#d4af37] underline transition-colors" target="_blank" rel="noopener noreferrer">openai.com/privacy</a></li>
                  <li><span className="text-[#d4af37] font-medium">Note:</span> OpenAI may use conversations to improve their models unless you opt out</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Data Security
              </h3>
            </div>
            <p className="text-gray-300 mb-3 leading-relaxed">We implement industry-standard security measures to protect your data:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><span className="text-[#d4af37] font-medium">Encryption in Transit:</span> All data transmitted to and from our servers uses HTTPS/TLS encryption</li>
              <li><span className="text-[#d4af37] font-medium">Encryption at Rest:</span> Temporary data storage uses encrypted file systems</li>
              <li><span className="text-[#d4af37] font-medium">Access Control:</span> Limited access to data with role-based permissions</li>
              <li><span className="text-[#d4af37] font-medium">Secure APIs:</span> All third-party API calls use secure, encrypted connections</li>
              <li><span className="text-[#d4af37] font-medium">Regular Audits:</span> Periodic security reviews and vulnerability assessments</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Data Retention
              </h3>
            </div>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><span className="text-[#d4af37] font-medium">Audio Files:</span> Deleted immediately after processing (within seconds)</li>
              <li><span className="text-[#d4af37] font-medium">Transcriptions:</span> Temporarily logged, deleted after 30 days</li>
              <li><span className="text-[#d4af37] font-medium">Usage Statistics:</span> Retained indefinitely in aggregated, anonymous form</li>
              <li><span className="text-[#d4af37] font-medium">Server Logs:</span> Deleted after 7 days</li>
              <li><span className="text-[#d4af37] font-medium">Error Logs:</span> Deleted after 30 days</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Your Rights
              </h3>
            </div>
            <p className="text-gray-300 mb-3 leading-relaxed">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li><span className="text-[#d4af37] font-medium">Right to Access:</span> Request access to the personal data we hold about you</li>
              <li><span className="text-[#d4af37] font-medium">Right to Deletion:</span> Request deletion of your personal data (note: most data is already automatically deleted)</li>
              <li><span className="text-[#d4af37] font-medium">Right to Correction:</span> Request correction of inaccurate personal data</li>
              <li><span className="text-[#d4af37] font-medium">Right to Object:</span> Object to processing of your personal data</li>
              <li><span className="text-[#d4af37] font-medium">Right to Data Portability:</span> Request your data in a portable format</li>
            </ul>
            <p className="text-gray-300 mt-4 leading-relaxed">
              To exercise these rights, contact us at: <a href="mailto:info@nexmind.com" className="text-[#ffd700] hover:text-[#d4af37] underline transition-colors">info@nexmind.com</a>
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Children's Privacy
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              VoiceTrans is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Contact Us
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:info@nexmind.com" className="text-[#ffd700] hover:text-[#d4af37] underline transition-colors">info@nexmind.com</a>
            </p>
          </section>

          {/* Quick Summary */}
          <section className="bg-gradient-to-br from-[#d4af37]/10 to-[#ffd700]/5 p-6 rounded-xl border-2 border-[#d4af37]/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-3 bg-gradient-to-r from-[#d4af37]/50 to-transparent" />
              <h3 className="text-xl font-bold tracking-wide bg-gradient-to-r from-[#ffd700] to-[#d4af37] bg-clip-text text-transparent">
                Quick Summary (TL;DR)
              </h3>
            </div>
            <ul className="space-y-2 text-gray-200">
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">✓</span>
                <span>Your audio is processed in real-time and NOT stored</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">✓</span>
                <span>We use Fireworks AI and Google Gemini for translation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">✓</span>
                <span>Minimal data collection, maximum privacy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">✓</span>
                <span>Industry-standard security measures</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">✓</span>
                <span>You can request deletion of any data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">✓</span>
                <span>We do NOT sell your data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">✓</span>
                <span>Full transparency about our practices</span>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-[#d4af37]/20">
              <p className="text-white font-medium text-center">
                Your privacy matters to us. We process your audio to provide translations and nothing more.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
