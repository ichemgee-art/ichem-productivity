import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Activity, CalendarCheck2, CalendarX2, CircleDollarSign, Pencil, Plus, Ruler } from 'lucide-react'
import { appService } from '../services/appService'
import { useCycle } from '../context/CycleContext'
import { useAuth } from '../context/AuthContext'
import { money, number, roleLabels, rolePlural } from '../lib/format'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import PersonDetailsModal from '../components/PersonDetailsModal'

export default function PeoplePage() {
  const { role = 'engineer' } = useParams()
  const { monthKey, selectedCycle } = useCycle()
  const { permissions } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [details, setDetails] = useState(null)

  const statsQuery = useQuery({ queryKey: ['cycle-data', 'people-stats', monthKey, role], queryFn: () => appService.personStats(monthKey, role), enabled: Boolean(monthKey) })
  const peopleQuery = useQuery({ queryKey: ['people', role], queryFn: () => appService.people(role) })

  const rows = useMemo(() => {
    const statsMap = new Map((statsQuery.data || []).map((row) => [row.person_id, row]))
    return (peopleQuery.data || []).map((person) => ({
      ...person,
      ...(statsMap.get(person.id) || { tasks: 0, meters: 0, earnings: 0, present_days: 0, absent_days: 0, upcoming_days: 0, pool_percent: 0 }),
    }))
  }, [statsQuery.data, peopleQuery.data])

  const saveMutation = useMutation({
    mutationFn: appService.savePerson,
    onSuccess: async () => {
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['people'] })
      await queryClient.invalidateQueries({ queryKey: ['references'] })
      await queryClient.invalidateQueries({ queryKey: ['cycle-data'] })
    },
  })

  const showDetails = (person) => setDetails(person)

  const loading = statsQuery.isLoading || peopleQuery.isLoading
  if (loading) return <div className="page-loader">جاري تحميل بيانات {rolePlural[role] || 'الأفراد'}...</div>

  return (
    <div className="page-stack">
      <section className="people-headline">
        <div><span className="eyebrow">TEAM PERFORMANCE</span><h2>{rolePlural[role]}</h2><p>أداء كل شخص في الدورة المعروضة مع الحضور والغياب والمستحقات.</p></div>
        {permissions.canManagePeople ? <button className="btn btn-primary" onClick={() => setEditing({ id: null, name: '', role, active: true })}><Plus size={17} /> إضافة اسم</button> : null}
      </section>
      <section className="people-grid">
        {rows.map((person) => (
          <article className={`person-card-v2 ${!person.active ? 'inactive' : ''}`} key={person.id}>
            <div className="person-card-head"><div className="person-avatar">{person.name.slice(0, 1)}</div><div className="person-identity"><strong>{person.name}</strong><span>{roleLabels[role]} · {person.active ? 'نشط' : 'معطل'}</span></div>{permissions.canManagePeople ? <button className="icon-btn small" onClick={() => setEditing(person)}><Pencil size={15} /></button> : null}</div>
            <div className="person-metrics">
              <div><Activity size={15} /><span>المهام</span><strong>{number(person.tasks)}</strong></div>
              <div><Ruler size={15} /><span>الأمتار</span><strong>{number(person.meters)}</strong></div>
              <div><CircleDollarSign size={15} /><span>المستحق</span><strong>{money(person.earnings)}</strong></div>
              <div><CalendarCheck2 size={15} /><span>حضور</span><strong>{number(person.present_days)}</strong></div>
              <div><CalendarX2 size={15} /><span>غياب</span><strong>{number(person.absent_days)}</strong></div>
            </div>
            <div className="person-footer"><span>نسبة من Pool الدور: <b>{number(person.pool_percent)}%</b></span><button className="btn btn-ghost btn-sm" onClick={() => showDetails(person)}>تفاصيل العمليات والحضور</button></div>
          </article>
        ))}
        {!rows.length ? <EmptyState /> : null}
      </section>

      <Modal open={Boolean(editing)} title={editing?.id ? 'تعديل بيانات الشخص' : 'إضافة اسم جديد'} onClose={() => setEditing(null)}>
        {editing ? <PersonForm person={editing} saving={saveMutation.isPending} onSave={(payload) => saveMutation.mutateAsync(payload)} /> : null}
      </Modal>

      <PersonDetailsModal person={details} selectedCycle={selectedCycle} monthKey={monthKey} onClose={() => setDetails(null)} />
    </div>
  )
}

function PersonForm({ person, saving, onSave }) {
  const [name, setName] = useState(person.name || '')
  const [active, setActive] = useState(person.active !== false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try { await onSave({ id: person.id || null, name: name.trim(), role: person.role, active }) } catch (err) { setError(err.message || 'تعذر الحفظ') }
  }

  return <form className="modal-form" onSubmit={submit}><label className="field"><span>الاسم</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="toggle-row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /><span>الاسم نشط ويمكن اختياره في العمليات الجديدة</span></label>{error ? <div className="form-error">{error}</div> : null}<button className="btn btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button></form>
}
