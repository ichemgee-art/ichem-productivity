import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Trash2, X, XCircle } from 'lucide-react'
import { playFeedbackSound, unlockFeedbackAudio } from '../lib/feedbackSound'

const FeedbackContext = createContext(null)
const VOICE_KEY = 'stc_voice_feedback_enabled'

const getInitialVoiceState = () => {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(VOICE_KEY) !== 'off'
}

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [voiceEnabled, setVoiceEnabled] = useState(getInitialVoiceState)
  const timerRef = useRef(null)
  const resolverRef = useRef(null)

  useEffect(() => {
    const unlock = () => unlockFeedbackAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(VOICE_KEY, voiceEnabled ? 'on' : 'off')
    if (!voiceEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [voiceEnabled])

  const speak = useCallback((title, message) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return
    try {
      const text = [title, message].filter(Boolean).join('. ').slice(0, 260)
      if (!text) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ar-EG'
      utterance.rate = 0.96
      utterance.pitch = 1
      utterance.volume = 0.9
      window.speechSynthesis.speak(utterance)
    } catch {
      // Voice feedback is optional and must never block a user action.
    }
  }, [voiceEnabled])

  const toggleVoice = useCallback(() => setVoiceEnabled((current) => !current), [])

  const notify = useCallback(({ type = 'success', title, message, duration = 4200, sound = true, voice = true }) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setToast({ type, title, message })
    if (sound) playFeedbackSound(type)
    if (voice) speak(title, message)
    timerRef.current = window.setTimeout(() => setToast(null), duration)
  }, [speak])

  const success = useCallback((title, message, duration) => notify({ type: 'success', title, message, duration }), [notify])
  const error = useCallback((title, message, duration) => notify({ type: 'error', title, message, duration }), [notify])
  const info = useCallback((title, message, duration) => notify({ type: 'info', title, message, duration }), [notify])
  const deleted = useCallback((title, message, duration) => notify({ type: 'delete', title, message, duration }), [notify])
  const alert = useCallback((title, message, duration = 12000) => notify({ type: 'alert', title, message, duration }), [notify])

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolverRef.current = resolve
    setDialog({
      title: options.title || 'تأكيد الإجراء',
      message: options.message || 'هل تريد المتابعة؟',
      confirmLabel: options.confirmLabel || 'تأكيد',
      cancelLabel: options.cancelLabel || 'إلغاء',
      tone: options.tone || 'primary',
      details: options.details || null,
    })
  }), [])

  const finishConfirm = (accepted) => {
    resolverRef.current?.(accepted)
    resolverRef.current = null
    setDialog(null)
  }

  const icon = toast?.type === 'error'
    ? <XCircle size={21} />
    : toast?.type === 'delete'
      ? <Trash2 size={21} />
      : toast?.type === 'alert'
        ? <AlertTriangle size={21} />
        : toast?.type === 'info'
          ? <Info size={21} />
          : <CheckCircle2 size={21} />

  return (
    <FeedbackContext.Provider value={{ notify, success, error, info, deleted, alert, confirm, voiceEnabled, toggleVoice }}>
      {children}

      {toast ? (
        <div className={`app-toast toast-${toast.type}`} role="status">
          <span className="app-toast__icon">{icon}</span>
          <div className="app-toast__copy">
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <button className="toast-close" type="button" onClick={() => setToast(null)} aria-label="إغلاق"><X size={16} /></button>
        </div>
      ) : null}

      {dialog ? (
        <div className="confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && finishConfirm(false)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true">
            <div className={`confirm-icon tone-${dialog.tone}`}>
              {dialog.tone === 'danger' ? <Trash2 size={25} /> : <AlertTriangle size={25} />}
            </div>
            <div className="confirm-copy">
              <h3>{dialog.title}</h3>
              <p>{dialog.message}</p>
              {dialog.details ? <div className="confirm-details">{dialog.details}</div> : null}
            </div>
            <div className="confirm-actions">
              <button className="btn btn-ghost" type="button" onClick={() => finishConfirm(false)}>{dialog.cancelLabel}</button>
              <button className={`btn ${dialog.tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`} type="button" onClick={() => finishConfirm(true)}>{dialog.confirmLabel}</button>
            </div>
          </section>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  )
}

export const useFeedback = () => useContext(FeedbackContext)
