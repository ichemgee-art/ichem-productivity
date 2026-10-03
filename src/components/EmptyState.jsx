import { Inbox, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EmptyState({
  title = 'لا توجد بيانات',
  description = 'لا توجد نتائج مطابقة في العرض الحالي.',
  actionLabel = '',
  actionTo = '',
  onAction,
  hint = '',
  icon: Icon = Inbox,
}) {
  return (
    <div className="empty-state smart-empty-state">
      <span className="empty-state__icon"><Icon size={25} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {hint ? <small className="smart-empty-hint"><Sparkles size={12} /> {hint}</small> : null}
      {actionLabel && actionTo ? <Link className="btn btn-primary btn-sm" to={actionTo}>{actionLabel}</Link> : null}
      {actionLabel && !actionTo && onAction ? <button className="btn btn-primary btn-sm" type="button" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  )
}
