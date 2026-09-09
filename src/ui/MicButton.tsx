import { useVoice } from '../hooks/useVoice'

interface MicButtonProps {
  onText: (t: string) => void
  small?: boolean
}

/** 🎤 push-to-talk button that appends recognized text via `onText`. */
export default function MicButton({ onText, small }: MicButtonProps) {
  const { listening, toggle } = useVoice(onText)
  return (
    <button
      type="button"
      className={'mic-btn' + (listening ? ' listening' : '')}
      style={small ? { width: 40, height: 40 } : undefined}
      title="语音输入"
      onClick={toggle}
    >
      {listening ? '⏺' : '🎤'}
    </button>
  )
}
