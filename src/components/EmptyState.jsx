import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'لا توجد بيانات', description = 'لا توجد نتائج مطابقة في الدورة المختارة.' }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Inbox size={24} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}
