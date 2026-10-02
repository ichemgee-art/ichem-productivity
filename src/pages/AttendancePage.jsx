import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Save } from 'lucide-react'
import { useCycle } from '../context/CycleContext'
import { useAuth } from '../context/AuthContext'
import { appService } from '../services/appService'
import { date, roleLabels } from '../lib/format'
import EmptyState from '../components/EmptyState'
import ExportButtons from '../components/ExportButtons'
import { smartIncludes } from '../lib/smartSearch'
import { useFeedback } from '../context/FeedbackContext'

export default function AttendancePage() {
  const { monthKey } = useCycle()
  const { permissions } = useAuth()
  const queryClient = useQueryClient()
  const feedback = useFeedback()
  const [role, setRole] = useState('')
  const [person, setPerson] = useState('')
  const [status, setStatus] = useState('')
  const [queryText, setQueryText] = useState('')
  const [draftNotes, setDraftNotes] = useState({})
  const [error, setError] = useState('')
  const exportRef = useRef(null)

  const query = useQuery({ queryKey: ['cycle-data', 'attendance', monthKey], queryFn: () => appService.attendance(monthKey), enabled: Boolean(monthKey) })
  const rows = query.data || []

  const people = useMemo(() => [...new Map(rows.filter((row) => !role || row.role === role).map((row) => [row.person_id, { id: row.person_id, name: row.person_name }])).values()].sort((a, b) => a.name.localeCompare(b.name, 'ar')), [rows, role])
  const filtered = useMemo(() => rows.filter((row) => {
    if (role && row.role !== role) return false
    if (person && row.person_id !== person) return false
    if (status && row.status !== status) return false
    if (!smartIncludes(queryText, row.person_name, row.attendance_date, row.status, row.absence_type, row.note)) return false
    return true
  }), [rows, role, person, status, queryText])

  const absenceMutation = useMutation({
    mutationFn: ({ personId, attendanceDate, type }) => appService.saveAbsence(personId, attendanceDate, type),
    onSuccess: async (_data, variables) => {
      setError('')
      await queryClient.invalidateQueries({ queryKey: ['cycle-data', 'attendance'] })
      const label = variables.type === 'excused' ? 'غياب بإذن' : variables.type === 'unexcused' ? 'غياب بدون إذن' : 'غير محدد'
      feedback.success('تم تحديث نوع الغياب', `تم حفظ الحالة: ${label}.`)
    },
    onError: (err) => {
      const message = err.message || 'تعذر تحديث نوع الغياب'
      setError(message)
      feedback.error('تعذر تحديث الغياب', message)
    },
  })
  const noteMutation = useMutation({
    mutationFn: ({ personId, attendanceDate, note }) => appService.saveAttendanceNote(personId, attendanceDate, note),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['cycle-data', 'attendance'] })
      const key = `${variables.personId}-${variables.attendanceDate}`
      setDraftNotes((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      feedback.success('تم حفظ الملاحظة', 'تم تحديث ملاحظة الحضور بنجاح.')
    },
    onError: (err) => {
      const message = err.message || 'تعذر حفظ الملاحظة'
      setError(message)
      feedback.error('تعذر حفظ الملاحظة', message)
    },
  })

  const saveNote = async (row) => {
    setError('')
    try {
      const key = `${row.person_id}-${row.attendance_date}`
      await noteMutation.mutateAsync({ personId: row.person_id, attendanceDate: row.attendance_date, note: draftNotes[key] ?? row.note ?? '' })
    } catch (err) { setError(err.message || 'تعذر حفظ الملاحظة') }
  }

  const excelSheets = [{
    name: 'الحضور والغياب',
    rows: filtered.map((row) => ({
      'الشخص': row.person_name,
      'الدور': roleLabels[row.role],
      'التاريخ': date(row.attendance_date),
      'الحالة': row.status === 'present' ? 'حاضر' : row.status === 'absent' ? 'غياب' : 'قادم',
      'نوع الغياب': row.absence_type === 'excused' ? 'غياب بإذن' : row.absence_type === 'unexcused' ? 'غياب بدون إذن' : '—',
      'الجمعة': row.is_friday ? 'نعم' : 'لا',
      'الملاحظة': row.note || '',
    })),
  }]

  if (query.isLoading) return <div className="page-loader">جاري تحميل الحضور والغياب...</div>
  if (query.isError) return <div className="page-error">{query.error?.message || 'تعذر تحميل الحضور والغياب'}</div>

  return (
    <div className="page-stack">
      <section className="panel" ref={exportRef}>
        <div className="filters-bar attendance-filters">
          <div className="input-with-icon grow"><Search size={16} /><input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="بحث بالاسم أو التاريخ..." /></div>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPerson('') }}><option value="">كل الأدوار</option><option value="engineer">المهندسين</option><option value="technician">الفنيين</option><option value="assistant">المساعدين</option><option value="worker">العمال</option></select>
          <select value={person} onChange={(e) => setPerson(e.target.value)}><option value="">كل الأشخاص</option>{people.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">كل الحالات</option><option value="present">حاضر</option><option value="absent">غياب</option><option value="upcoming">قادم</option></select>
          <ExportButtons filename={`attendance-${monthKey}`} excelSheets={excelSheets} pdfTarget={exportRef} compact />
        </div>
        {error ? <div className="inline-error">{error}</div> : null}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>الشخص</th><th>الدور</th><th>التاريخ</th><th>الحالة</th><th>نوع الغياب</th><th>الملاحظة</th>{permissions.canManageAttendance ? <th>حفظ</th> : null}</tr></thead>
            <tbody>{filtered.map((row) => {
              const key = `${row.person_id}-${row.attendance_date}`
              return <tr key={key}><td className="strong-cell">{row.person_name}</td><td>{roleLabels[row.role]}</td><td>{date(row.attendance_date)} {row.is_friday ? <span className="count-chip">جمعة</span> : null}</td><td><span className={`status-pill ${row.status === 'present' ? 'success' : row.status === 'absent' ? 'danger' : 'neutral'}`}>{row.status === 'present' ? 'حاضر' : row.status === 'absent' ? 'غياب' : 'قادم'}</span></td><td><select disabled={!permissions.canManageAttendance || row.status !== 'absent' || absenceMutation.isPending} value={row.absence_type || ''} onChange={(e) => absenceMutation.mutate({ personId: row.person_id, attendanceDate: row.attendance_date, type: e.target.value })}><option value="">غير محدد</option><option value="excused">غياب بإذن</option><option value="unexcused">غياب بدون إذن</option></select></td><td><input className="table-input" disabled={!permissions.canManageAttendance} value={draftNotes[key] ?? row.note ?? ''} onChange={(e) => setDraftNotes((current) => ({ ...current, [key]: e.target.value }))} /></td>{permissions.canManageAttendance ? <td><button className="icon-btn small" disabled={noteMutation.isPending} onClick={() => saveNote(row)}><Save size={15} /></button></td> : null}</tr>
            })}</tbody>
          </table>
          {!filtered.length ? <EmptyState /> : null}
        </div>
      </section>
    </div>
  )
}
