import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Trash2, X, XCircle } from 'lucide-react'

const FeedbackContext = createContext(null)

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [dialog, setDialog] = useState(null)
  const timerRef = useRef(null)
  const resolverRef = useRef(null)

  const notify = useCallback(({ type = 'success', title, message }) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setToast({ type, title, message })
    timerRef.current = window.setTimeout(() => setToast(null), 4200)
  }, [])

  const success = useCallback((title, message) => notify({ type: 'success', title, message }), [notify])
  const error = useCallback((title, message) => notify({ type: 'error', title, message }), [notify])
  const info = useCallback((title, message) => notify({ type: 'info', title, message }), [notify])

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
    : toast?.type === 'info'
      ? <Info size={21} />
      : <CheckCircle2 size={21} />

  return (
    <FeedbackContext.Provider value={{ notify, success, error, info, confirm }}>
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
