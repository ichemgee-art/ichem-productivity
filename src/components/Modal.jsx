import { X } from 'lucide-react'

export default function Modal({ open, title, children, onClose, width = 'md' }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className={`modal-card modal-${width}`}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}
