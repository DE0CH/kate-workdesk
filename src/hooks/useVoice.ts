import { useCallback, useRef, useState } from 'react'
import { useToast } from '../ui/toast'

/* Minimal typings for the Web Speech API (not in lib.dom by default). */
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

/** Push-to-talk voice input. Appends recognized text via `onText`. */
export function useVoice(onText: (t: string) => void) {
  const toast = useToast()
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  const toggle = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      toast('此浏览器不支持语音,建议 iPad 的 Safari 或电脑 Chrome 🎤')
      return
    }
    if (recRef.current) {
      recRef.current.stop()
      return
    }
    let rec: SpeechRecognitionLike
    try {
      rec = new SR()
    } catch {
      return
    }
    recRef.current = rec
    rec.lang = 'zh-CN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    setListening(true)
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript
      onText(t)
    }
    const done = () => {
      recRef.current = null
      setListening(false)
    }
    rec.onend = done
    rec.onerror = done
    rec.start()
  }, [onText, toast])

  return { listening, toggle }
}
