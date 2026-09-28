import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Pencil, Search, Trash2, XCircle } from 'lucide-react'
import { useCycle } from '../context/CycleContext'
import { useAuth } from '../context/AuthContext'
import { appService } from '../services/appService'
import { date, money, number } from '../lib/format'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import SubmissionForm from '../components/SubmissionForm'
import ExportButtons from '../components/ExportButtons'

export default function ProductivityPage() {
  const { selectedCycle, monthKey } = useCycle()
  const { permissions } = useAuth()
  const queryClient = useQueryClient()
  const [queryText, setQueryText] = useState('')
  const [project, setProject] = useState('')
  const [section, setSection] = useState('')
  const [review, setReview] = useState('')
  const [editing, setEditing] = useState(null)
  const [editInitial, setEditInitial] = useState(null)
  const [error, setError] = useState('')
  const exportRef = useRef(null)

  const rowsQuery = useQuery({
    queryKey: ['cycle-data', 'productivity', monthKey],
    queryFn: () => appService.productivityRows(selectedCycle.cycle_start, selectedCycle.cycle_end),
    enabled: Boolean(selectedCycle),
  })

  const refsQuery = useQuery({ queryKey: ['references'], queryFn: appService.references })
  const rows = rowsQuery.data || []

  const projects = useMemo(() => [...new Set(rows.map((row) => row.project).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')), [rows])
  const sections = useMemo(() => [...new Set(rows.map((row) => row.section).filter(Boolean))].sort(), [rows])

  const filtered = useMemo(() => rows.filter((row) => {
    if (project && row.project !== project) return false
    if (section && row.section !== section) return false
    if (review && row.review_status !== review) return false
    if (queryText.trim()) {
      const haystack = [row.project, row.section, row.engineers, row.technicians, row.assistants, row.workers, row.work_date].join(' ').toLowerCase()
      if (!haystack.includes(queryText.trim().toLowerCase())) return false
    }
    return true
  }), [rows, project, section, review, queryText])

  const totals = useMemo(() => filtered.reduce((acc, row) => ({
    meters: acc.meters + Number(row.meters || 0),
    total: acc.total + Number(row.total || 0),
  }), { meters: 0, total: 0 }), [filtered])

  const excelSheets = [{
    name: 'البيانات المحسوبة',
    rows: filtered.map((row) => ({
      'التاريخ': date(row.work_date),
      'المشروع': row.project || '—',
      'المهندسين': row.engineers || '—',
      'الفنيين': row.technicians || '—',
      'المساعدين': row.assistants || '—',
      'العمال': row.workers || '—',
      'القطاع': row.section || '—',
      'الأمتار': Number(row.meters || 0),
      'سعر المتر': Number(row.price_per_meter || 0),
      'الإجمالي': Number(row.total || 0),
      'المراجعة': row.review_status === 'reviewed' ? 'تمت المراجعة' : 'لم تتم',
    })),
  }]

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['cycle-data'] })
    await queryClient.invalidateQueries({ queryKey: ['references'] })
  }

  const reviewMutation = useMutation({ mutationFn: ({ id, reviewed }) => appService.setReview(id, reviewed), onSuccess: invalidate })
  const deleteMutation = useMutation({ mutationFn: appService.deleteSubmission, onSuccess: invalidate })
  const updateMutation = useMutation({ mutationFn: appService.updateSubmission, onSuccess: async () => { setEditing(null); setEditInitial(null); await invalidate() } })

  const beginEdit = async (row) => {
    setError('')
    setEditing(row)
    try {
      const teamRows = await appService.submissionTeam(row.id)
      const team = { engineer: [], technician: [], assistant: [], worker: [] }
      teamRows.forEach((person) => team[person.role]?.push(person.person_id))
      setEditInitial({ work_date: row.work_date, project: row.project, section: row.section, meters: row.meters, team })
    } catch (err) {
      setEditing(null)
      setError(err.message || 'تعذر تحميل بيانات العملية')
    }
  }

  const update = async ({ form, team }) => {
    await updateMutation.mutateAsync({
      p_submission_id: editing.id,
      p_work_date: form.work_date,
      p_project_name: form.project.trim(),
      p_section_name: form.section,
      p_meters: Number(form.meters || 0),
      p_engineer_ids: team.engineer,
      p_technician_ids: team.technician,
      p_assistant_ids: team.assistant,
      p_worker_ids: team.worker,
    })
  }

  const remove = async (row) => {
    if (!window.confirm(`حذف عملية ${row.project} بتاريخ ${date(row.work_date)}؟`)) return
    try { await deleteMutation.mutateAsync(row.id) } catch (err) { setError(err.message) }
  }

  if (!selectedCycle || rowsQuery.isLoading) return <div className="page-loader">جاري تحميل البيانات المحسوبة...</div>

  return (
    <div className="page-stack">
      <section className="summary-line">
        <div><span>النتائج المعروضة</span><strong>{number(filtered.length)} عملية</strong></div>
        <div><span>إجمالي الأمتار</span><strong>{number(totals.meters)} م</strong></div>
        <div><span>إجمالي الإنتاجية</span><strong>{money(totals.total)}</strong></div>
      </section>

      <section className="panel" ref={exportRef}>
        <div className="filters-bar">
          <div className="input-with-icon grow"><Search size={16} /><input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="بحث في المشروع، القطاع، المهندس أو الفريق..." /></div>
          <select value={project} onChange={(e) => setProject(e.target.value)}><option value="">كل المشاريع</option>{projects.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={section} onChange={(e) => setSection(e.target.value)}><option value="">كل القطاعات</option>{sections.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={review} onChange={(e) => setReview(e.target.value)}><option value="">كل حالات المراجعة</option><option value="reviewed">تمت المراجعة</option><option value="not_reviewed">لم تتم المراجعة</option></select>
          <ExportButtons filename={`productivity-${monthKey}`} excelSheets={excelSheets} pdfTarget={exportRef} compact />
        </div>
        {error ? <div className="inline-error">{error}</div> : null}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>التاريخ</th><th>المشروع</th><th>المهندسين</th><th>الفنيين</th><th>المساعدين</th><th>العمال</th><th>القطاع</th><th>الأمتار</th><th>سعر المتر</th><th>الإجمالي</th><th>المراجعة</th>{permissions.isAdmin ? <th>إدارة</th> : null}</tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{date(row.work_date)}</td><td className="strong-cell">{row.project}</td><td>{row.engineers || '—'}</td>
                  <td>{row.technicians || '—'}{row.technician_count ? <small className="count-chip">{row.technician_count}</small> : null}</td>
                  <td>{row.assistants || '—'}{row.assistant_count ? <small className="count-chip">{row.assistant_count}</small> : null}</td>
                  <td>{row.workers || '—'}{row.worker_count ? <small className="count-chip">{row.worker_count}</small> : null}</td>
                  <td>{row.section}</td><td>{number(row.meters)}</td><td>{money(row.price_per_meter)}</td><td className="strong-cell">{money(row.total)}</td>
                  <td><span className={`status-pill ${row.review_status === 'reviewed' ? 'success' : 'warning'}`}>{row.review_status === 'reviewed' ? 'تمت المراجعة' : 'لم تتم'}</span></td>
                  {permissions.isAdmin ? <td><div className="row-actions"><button className="icon-btn small" title="تعديل" onClick={() => beginEdit(row)}><Pencil size={15} /></button><button className="icon-btn small" title={row.review_status === 'reviewed' ? 'إلغاء المراجعة' : 'اعتماد المراجعة'} onClick={() => reviewMutation.mutate({ id: row.id, reviewed: row.review_status !== 'reviewed' })}>{row.review_status === 'reviewed' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}</button><button className="icon-btn small danger" title="حذف" onClick={() => remove(row)}><Trash2 size={15} /></button></div></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <EmptyState /> : null}
        </div>
      </section>

      <Modal open={Boolean(editing)} title="تعديل عملية الإنتاجية" onClose={() => { setEditing(null); setEditInitial(null) }} width="xl">
        {!editInitial || refsQuery.isLoading ? <div className="page-loader">جاري تحميل بيانات العملية...</div> : <SubmissionForm references={refsQuery.data} initial={editInitial} onSubmit={update} submitting={updateMutation.isPending} mode="edit" />}
      </Modal>
    </div>
  )
}
