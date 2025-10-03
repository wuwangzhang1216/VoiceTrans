interface AudioWaveformProps {
  audioLevel: number
}

export function AudioWaveform({ audioLevel }: AudioWaveformProps) {
  const bars = Array.from({ length: 20 }, (_, i) => {
    const height = Math.random() * audioLevel * 100
    const delay = i * 50
    return { height, delay, id: i }
  })

  return (
    <div className="flex items-center justify-center h-20 gap-1">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full transition-all duration-100"
          style={{
            height: `${bar.height}%`,
            animationDelay: `${bar.delay}ms`
          }}
        />
      ))}
    </div>
  )
}