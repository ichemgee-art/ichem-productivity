import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { appService } from '../services/appService'
import { date, number } from '../lib/format'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import ExportButtons from '../components/ExportButtons'

export default function ProjectsPage() {
  const { permissions } = useAuth()
  const queryClient = useQueryClient()
  const [queryText, setQueryText] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const exportRef = useRef(null)

  const query = useQuery({ queryKey: ['projects'], queryFn: appService.projects })
  const mutation = useMutation({ mutationFn: appService.saveProject, onSuccess: async () => { setEditing(null); await queryClient.invalidateQueries({ queryKey: ['projects'] }); await queryClient.invalidateQueries({ queryKey: ['references'] }) } })

  const rows = useMemo(() => (query.data || []).filter((item) => {
    if (activeFilter === 'active' && !item.active) return false
    if (activeFilter === 'inactive' && item.active) return false
    if (queryText.trim() && !item.name.toLowerCase().includes(queryText.trim().toLowerCase())) return false
    return true
  }), [query.data, activeFilter, queryText])

  const excelSheets = [{
    name: 'المشاريع',
    rows: rows.map((row) => ({
      'المشروع': row.name,
      'الحالة': row.active ? 'نشط' : 'معطل',
      'مرات الاستخدام': Number(row.use_count || 0),
      'آخر استخدام': date(row.last_used),
    })),
  }]

  if (query.isLoading) return <div className="page-loader">جاري تحميل المشاريع...</div>

  return (
    <div className="page-stack">
      <section className="panel" ref={exportRef}>
        <div className="filters-bar"><div className="input-with-icon grow"><Search size={16} /><input placeholder="بحث باسم المشروع..." value={queryText} onChange={(e) => setQueryText(e.target.value)} /></div><select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}><option value="">كل الحالات</option><option value="active">نشط</option><option value="inactive">معطل</option></select><ExportButtons filename="projects-filtered" excelSheets={excelSheets} pdfTarget={exportRef} compact />{permissions.canManageProjects ? <button className="btn btn-primary" onClick={() => setEditing({ id: null, name: '', active: true })}><Plus size={16} /> إضافة مشروع</button> : null}</div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>المشروع</th><th>الحالة</th><th>مرات الاستخدام</th><th>آخر استخدام</th>{permissions.canManageProjects ? <th>إدارة</th> : null}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="strong-cell">{row.name}</td><td><span className={`status-pill ${row.active ? 'success' : 'neutral'}`}>{row.active ? 'نشط' : 'معطل'}</span></td><td>{number(row.use_count)}</td><td>{date(row.last_used)}</td>{permissions.canManageProjects ? <td><button className="icon-btn small" onClick={() => setEditing(row)}><Pencil size={15} /></button></td> : null}</tr>)}</tbody></table>{!rows.length ? <EmptyState /> : null}</div>
      </section>
      <Modal open={Boolean(editing)} title={editing?.id ? 'تعديل المشروع' : 'إضافة مشروع'} onClose={() => setEditing(null)}>
        {editing ? <ProjectForm project={editing} saving={mutation.isPending} onSave={(payload) => mutation.mutateAsync(payload)} /> : null}
      </Modal>
    </div>
  )
}

function ProjectForm({ project, saving, onSave }) {
  const [name, setName] = useState(project.name || '')
  const [active, setActive] = useState(project.active !== false)
  const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); setError(''); try { await onSave({ id: project.id || null, name: name.trim(), active }) } catch (err) { setError(err.message || 'تعذر الحفظ') } }
  return <form className="modal-form" onSubmit={submit}><label className="field"><span>اسم المشروع</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="toggle-row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /><span>المشروع نشط</span></label>{error ? <div className="form-error">{error}</div> : null}<button className="btn btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button></form>
}
