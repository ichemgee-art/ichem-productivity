import { Copy, QrCode, X } from 'lucide-react'
import { useFeedback } from '../context/FeedbackContext'

export default function ShareQrModal({ open, onClose, url }) {
  const feedback = useFeedback()
  if (!open) return null

  const safeUrl = url || window.location.origin
  const qrSrc = `https://quickchart.io/qr?text=${encodeURIComponent(safeUrl)}&size=320&margin=2&dark=253A55&light=ffffff&finderColor=F3B820&dotStyle=rounded&finderStyle=rounded`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(safeUrl)
      feedback.success('تم نسخ الرابط', 'تقدر تبعته لأي شخص عنده صلاحية على النظام.')
    } catch {
      feedback.error('تعذر نسخ الرابط', 'انسخ الرابط يدويًا من الحقل.')
    }
  }

  return (
    <div className="confirm-backdrop qr-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="qr-dialog" role="dialog" aria-modal="true" aria-label="QR Code">
        <header>
          <div className="qr-dialog__title">
            <span><QrCode size={20} /></span>
            <div><strong>QR Code</strong><small>يفتح نفس الصفحة الحالية داخل STC Productivity</small></div>
          </div>
          <button className="icon-btn small" type="button" onClick={onClose} aria-label="إغلاق"><X size={17} /></button>
        </header>

        <div className="qr-dialog__body">
          <div className="qr-code-frame">
            <img src={qrSrc} alt="QR Code للرابط الحالي" width="250" height="250" />
          </div>
          <div className="qr-link-box">
            <span>الرابط المشفّر</span>
            <code>{safeUrl}</code>
          </div>
          <button className="btn btn-primary" type="button" onClick={copy}><Copy size={16} /> نسخ الرابط</button>
        </div>
      </section>
    </div>
  )
}
