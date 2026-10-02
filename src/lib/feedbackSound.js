let audioContext = null

const getContext = () => {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioContext) audioContext = new AudioContextClass()
  return audioContext
}

export const unlockFeedbackAudio = async () => {
  try {
    const context = getContext()
    if (context?.state === 'suspended') await context.resume()
  } catch {
    // Audio feedback is progressive enhancement; actions must never fail because sound is unavailable.
  }
}

const tone = (context, frequency, start, duration, volume = 0.055, type = 'sine') => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export const playFeedbackSound = async (kind = 'info') => {
  try {
    const context = getContext()
    if (!context) return
    if (context.state === 'suspended') await context.resume()
    if (context.state !== 'running') return

    const now = context.currentTime + 0.015

    if (kind === 'success') {
      tone(context, 659, now, 0.13, 0.05, 'sine')
      tone(context, 880, now + 0.12, 0.18, 0.06, 'sine')
      return
    }

    if (kind === 'error') {
      tone(context, 260, now, 0.16, 0.06, 'square')
      tone(context, 185, now + 0.14, 0.24, 0.055, 'square')
      return
    }

    if (kind === 'delete') {
      tone(context, 520, now, 0.1, 0.045, 'triangle')
      tone(context, 350, now + 0.09, 0.12, 0.05, 'triangle')
      tone(context, 220, now + 0.2, 0.2, 0.055, 'triangle')
      return
    }

    if (kind === 'alert') {
      tone(context, 784, now, 0.11, 0.05, 'sine')
      tone(context, 988, now + 0.13, 0.11, 0.055, 'sine')
      tone(context, 784, now + 0.28, 0.18, 0.05, 'sine')
      return
    }

    tone(context, 523, now, 0.14, 0.045, 'sine')
  } catch {
    // Sound must never block user feedback or business actions.
  }
}
