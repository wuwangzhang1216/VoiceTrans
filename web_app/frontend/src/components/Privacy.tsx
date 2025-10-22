import React from 'react'

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy for VoiceTrans</h1>
          <p className="text-gray-300">Last Updated: October 22, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-white space-y-6">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Introduction</h2>
            <p className="text-gray-200">
              VoiceTrans ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our voice translation service through the OpenAI GPT Store.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Information We Collect</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">Audio Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
                  <li><strong>What we collect:</strong> Audio files you upload for translation</li>
                  <li><strong>How we use it:</strong> To transcribe and translate your audio</li>
                  <li><strong>Storage:</strong> Audio files are processed in real-time and are NOT stored permanently on our servers</li>
                  <li><strong>Retention:</strong> Audio data is temporarily cached during processing and automatically deleted after the translation is complete</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Transcription and Translation Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
                  <li><strong>What we collect:</strong> The text transcription and translation results</li>
                  <li><strong>How we use it:</strong> To provide you with translation results and improve our service quality</li>
                  <li><strong>Storage:</strong> Transcriptions may be temporarily logged for debugging purposes</li>
                  <li><strong>Retention:</strong> Logs are retained for a maximum of 30 days</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Usage Statistics</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
                  <li><strong>What we collect:</strong> Anonymous usage metrics including:
                    <ul className="list-circle list-inside ml-6 mt-1">
                      <li>Number of translations processed</li>
                      <li>Average processing latency</li>
                      <li>Language pairs used</li>
                      <li>Error rates</li>
                    </ul>
                  </li>
                  <li><strong>How we use it:</strong> To monitor service performance and improve user experience</li>
                  <li><strong>Storage:</strong> Aggregated anonymously with no personally identifiable information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">Technical Information</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
                  <li><strong>What we collect:</strong>
                    <ul className="list-circle list-inside ml-6 mt-1">
                      <li>IP address (automatically collected)</li>
                      <li>Browser type and version</li>
                      <li>Device information</li>
                      <li>Timestamp of requests</li>
                    </ul>
                  </li>
                  <li><strong>How we use it:</strong> For security, troubleshooting, and service optimization</li>
                  <li><strong>Storage:</strong> Server logs retained for 7 days</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">How We Use Your Information</h2>
            <p className="text-gray-200 mb-2">We use your information solely for the following purposes:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-200 ml-4">
              <li><strong>Service Delivery:</strong> To transcribe and translate your audio files</li>
              <li><strong>Service Improvement:</strong> To analyze performance and enhance accuracy</li>
              <li><strong>Technical Support:</strong> To troubleshoot issues and provide customer support</li>
              <li><strong>Security:</strong> To detect and prevent abuse, fraud, or security threats</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
            </ol>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Third-Party Services</h2>
            <p className="text-gray-200 mb-3">VoiceTrans uses the following third-party AI services to process your data:</p>

            <div className="space-y-3">
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-xl font-medium mb-2">Fireworks AI</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
                  <li><strong>Purpose:</strong> Audio transcription using Whisper model</li>
                  <li><strong>Data Shared:</strong> Audio files</li>
                  <li><strong>Privacy Policy:</strong> <a href="https://fireworks.ai/privacy-policy" className="text-blue-300 hover:text-blue-200 underline" target="_blank" rel="noopener noreferrer">https://fireworks.ai/privacy-policy</a></li>
                  <li><strong>Data Processing:</strong> Audio is processed through Fireworks AI's secure API</li>
                </ul>
              </div>

              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-xl font-medium mb-2">Google Gemini</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
                  <li><strong>Purpose:</strong> Text translation</li>
                  <li><strong>Data Shared:</strong> Transcribed text</li>
                  <li><strong>Privacy Policy:</strong> <a href="https://policies.google.com/privacy" className="text-blue-300 hover:text-blue-200 underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
                  <li><strong>Data Processing:</strong> Text is processed through Google's secure API</li>
                </ul>
              </div>

              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-xl font-medium mb-2">OpenAI</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
                  <li><strong>Purpose:</strong> Hosting the GPT interface</li>
                  <li><strong>Data Shared:</strong> Your conversations with the GPT</li>
                  <li><strong>Privacy Policy:</strong> <a href="https://openai.com/privacy" className="text-blue-300 hover:text-blue-200 underline" target="_blank" rel="noopener noreferrer">https://openai.com/privacy</a></li>
                  <li><strong>Note:</strong> OpenAI may use conversations to improve their models unless you opt out</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Data Security</h2>
            <p className="text-gray-200 mb-2">We implement industry-standard security measures to protect your data:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
              <li><strong>Encryption in Transit:</strong> All data transmitted to and from our servers uses HTTPS/TLS encryption</li>
              <li><strong>Encryption at Rest:</strong> Temporary data storage uses encrypted file systems</li>
              <li><strong>Access Control:</strong> Limited access to data with role-based permissions</li>
              <li><strong>Secure APIs:</strong> All third-party API calls use secure, encrypted connections</li>
              <li><strong>Regular Audits:</strong> Periodic security reviews and vulnerability assessments</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Data Retention</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
              <li><strong>Audio Files:</strong> Deleted immediately after processing (within seconds)</li>
              <li><strong>Transcriptions:</strong> Temporarily logged, deleted after 30 days</li>
              <li><strong>Usage Statistics:</strong> Retained indefinitely in aggregated, anonymous form</li>
              <li><strong>Server Logs:</strong> Deleted after 7 days</li>
              <li><strong>Error Logs:</strong> Deleted after 30 days</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Your Rights</h2>
            <p className="text-gray-200 mb-2">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-200 ml-4">
              <li><strong>Right to Access:</strong> Request access to the personal data we hold about you</li>
              <li><strong>Right to Deletion:</strong> Request deletion of your personal data (note: most data is already automatically deleted)</li>
              <li><strong>Right to Correction:</strong> Request correction of inaccurate personal data</li>
              <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
              <li><strong>Right to Data Portability:</strong> Request your data in a portable format</li>
            </ul>
            <p className="text-gray-200 mt-3">
              To exercise these rights, contact us at: <a href="mailto:info@nexmind.com" className="text-blue-300 hover:text-blue-200 underline">info@nexmind.com</a>
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Children's Privacy</h2>
            <p className="text-gray-200">
              VoiceTrans is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
            <p className="text-gray-200">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:info@nexmind.com" className="text-blue-300 hover:text-blue-200 underline">info@nexmind.com</a>
            </p>
          </section>

          {/* Quick Summary */}
          <section className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6 rounded-xl border border-white/10">
            <h2 className="text-2xl font-semibold mb-3">Quick Summary (TL;DR)</h2>
            <ul className="space-y-2 text-gray-100">
              <li>✅ Your audio is processed in real-time and NOT stored</li>
              <li>✅ We use Fireworks AI and Google Gemini for translation</li>
              <li>✅ Minimal data collection, maximum privacy</li>
              <li>✅ Industry-standard security measures</li>
              <li>✅ You can request deletion of any data</li>
              <li>✅ We do NOT sell your data</li>
              <li>✅ Full transparency about our practices</li>
            </ul>
            <p className="text-white font-medium mt-4">
              Your privacy matters to us. We process your audio to provide translations and nothing more.
            </p>
          </section>
        </div>

        {/* Back to Home Button */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
