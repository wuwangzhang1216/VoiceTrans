declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor,
): void

class PCMProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]) {
    const [input] = inputs
    if (!input || input.length === 0) {
      return true
    }

    const channelData = input[0]
    if (!channelData) {
      return true
    }

    const buffer = new ArrayBuffer(channelData.length * 2)
    const view = new DataView(buffer)

    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }

    this.port.postMessage({ buffer }, [buffer])
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)

export {}
