import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCycle } from '../context/CycleContext'
import { appService } from '../services/appService'
import { money, number } from '../lib/format'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

export default function SectionsPage() {
  const { permissions } = useAuth()
  const { monthKey } = useCycle()
  const queryClient = useQueryClient()
  const [queryText, setQueryText] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [editing, setEditing] = useState(null)

  const sectionsQuery = useQuery({ queryKey: ['sections'], queryFn: appService.sections })
  const dashboardQuery = useQuery({ queryKey: ['cycle-data', 'dashboard', monthKey], queryFn: () => appService.dashboard(monthKey), enabled: Boolean(monthKey) })
  const mutation = useMutation({ mutationFn: appService.saveSection, onSuccess: async () => { setEditing(null); await queryClient.invalidateQueries({ queryKey: ['sections'] }); await queryClient.invalidateQueries({ queryKey: ['references'] }); await queryClient.invalidateQueries({ queryKey: ['cycle-data'] }) } })

  const statMap = useMemo(() => new Map((dashboardQuery.data?.sections || []).map((item) => [item.name, item])), [dashboardQuery.data])
  const rows = useMemo(() => (sectionsQuery.data || []).filter((item) => {
    if (activeFilter === 'active' && !item.active) return false
    if (activeFilter === 'inactive' && item.active) return false
    if (queryText.trim() && !item.name.toLowerCase().includes(queryText.trim().toLowerCase())) return false
    return true
  }), [sectionsQuery.data, activeFilter, queryText])

  if (sectionsQuery.isLoading) return <div className="page-loader">جاري تحميل القطاعات...</div>

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="filters-bar"><div className="input-with-icon grow"><Search size={16} /><input placeholder="بحث باسم القطاع..." value={queryText} onChange={(e) => setQueryText(e.target.value)} /></div><select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}><option value="">كل الحالات</option><option value="active">نشط</option><option value="inactive">معطل</option></select>{permissions.canManageSections ? <button className="btn btn-primary" onClick={() => setEditing({ id: null, name: '', price_per_meter: 0, active: true })}><Plus size={16} /> إضافة قطاع</button> : null}</div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>القطاع</th><th>سعر المتر الحالي</th><th>الحالة</th><th>مهام الدورة</th><th>أمتار الدورة</th><th>إيراد الدورة</th>{permissions.canManageSections ? <th>إدارة</th> : null}</tr></thead><tbody>{rows.map((row) => { const stats = statMap.get(row.name) || {}; return <tr key={row.id}><td className="strong-cell">{row.name}</td><td>{money(row.price_per_meter)}</td><td><span className={`status-pill ${row.active ? 'success' : 'neutral'}`}>{row.active ? 'نشط' : 'معطل'}</span></td><td>{number(stats.tasks)}</td><td>{number(stats.meters)}</td><td>{money(stats.revenue)}</td>{permissions.canManageSections ? <td><button className="icon-btn small" onClick={() => setEditing(row)}><Pencil size={15} /></button></td> : null}</tr> })}</tbody></table>{!rows.length ? <EmptyState /> : null}</div>
      </section>
      <Modal open={Boolean(editing)} title={editing?.id ? 'تعديل القطاع' : 'إضافة قطاع'} onClose={() => setEditing(null)}>
        {editing ? <SectionForm section={editing} saving={mutation.isPending} onSave={(payload) => mutation.mutateAsync(payload)} /> : null}
      </Modal>
    </div>
  )
}

function SectionForm({ section, saving, onSave }) {
  const [name, setName] = useState(section.name || '')
  const [price, setPrice] = useState(section.price_per_meter ?? 0)
  const [active, setActive] = useState(section.active !== false)
  const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); setError(''); try { await onSave({ id: section.id || null, name: name.trim(), price: Number(price || 0), active }) } catch (err) { setError(err.message || 'تعذر الحفظ') } }
  return <form className="modal-form" onSubmit={submit}><label className="field"><span>اسم القطاع</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="field"><span>سعر المتر</span><input type="number" min="0" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} /></label><label className="toggle-row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /><span>القطاع نشط</span></label><div className="form-hint">تغيير السعر يؤثر على العمليات الجديدة فقط؛ السجلات القديمة تحتفظ بسعرها التاريخي.</div>{error ? <div className="form-error">{error}</div> : null}<button className="btn btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button></form>
}
