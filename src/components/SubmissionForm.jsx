import { useMemo, useRef, useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import PeoplePicker from './PeoplePicker'
import { number, today } from '../lib/format'
import { useFeedback } from '../context/FeedbackContext'

const emptyTeam = { engineer: [], technician: [], assistant: [], worker: [] }

export default function SubmissionForm({ references, initial, onSubmit, submitting, mode = 'create' }) {
  const feedback = useFeedback()
  const successTimer = useRef(null)
  const [saveVisual, setSaveVisual] = useState('idle')
  const [form, setForm] = useState({
    work_date: initial?.work_date || today(),
    project: initial?.project || '',
    section: initial?.section || '',
    meters: initial?.meters ?? '',
  })
  const [team, setTeam] = useState(initial?.team || emptyTeam)
  const [submitMode, setSubmitMode] = useState('save')
  const [formError, setFormError] = useState('')

  const section = references.sections.find((item) => item.name === form.section)
  const preview = useMemo(() => {
    const meters = Number(form.meters || 0)
    const price = Number(section?.price_per_meter || 0)
    const total = Math.round(meters * price * 100) / 100
    const nt = team.technician.length
    const na = team.assistant.length
    const nw = team.worker.length
    let techTotal = 0
    let assistantTotal = 0
    if (nt && na) {
      techTotal = total * 0.7
      assistantTotal = total * 0.3
    } else if (nt) techTotal = total
    else if (na) assistantTotal = total
    return {
      price,
      total,
      tech: nt ? techTotal / nt : 0,
      assistant: na ? assistantTotal / na : 0,
      worker: nw ? (meters * 10) / nw : 0,
    }
  }, [form.meters, section?.price_per_meter, team])

  const personName = (id) => references.people.find((person) => person.id === id)?.name || '—'
  const teamNames = useMemo(() => ({
    engineer: team.engineer.map(personName),
    technician: team.technician.map(personName),
    assistant: team.assistant.map(personName),
    worker: team.worker.map(personName),
  }), [team, references.people])

  const ready = Boolean(form.work_date && form.project.trim() && form.section && form.meters !== '' && Number(form.meters) >= 0 && team.engineer.length)

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setRole = (role, value) => setTeam((current) => ({ ...current, [role]: value }))

  const fail = (message) => {
    setFormError(message)
    feedback.error('راجع بيانات العملية', message)
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.work_date) return fail('اختار تاريخ العملية')
    if (!form.project.trim()) return fail('اسم المشروع مطلوب')
    if (!form.section) return fail('اختار القطاع')
    if (form.meters === '' || Number(form.meters) < 0) return fail('اكتب عدد الأمتار بشكل صحيح')
    if (!team.engineer.length) return fail('اختار مهندس واحد على الأقل')

    try {
      setSaveVisual('saving')
      await onSubmit({ form, team, submitMode })
      setSaveVisual('success')
      if (successTimer.current) window.clearTimeout(successTimer.current)
      successTimer.current = window.setTimeout(() => setSaveVisual('idle'), 1500)

      if (mode === 'create' && submitMode === 'saveAnother') {
        setForm((current) => ({ ...current, meters: '' }))
        setTeam(emptyTeam)
      }
    } catch (error) {
      setSaveVisual('idle')
      const message = error.message || 'تعذر حفظ العملية'
      setFormError(message)
      feedback.error('تعذر حفظ العملية', message)
    }
  }

  return (
    <form className="submission-form" onSubmit={submit} noValidate>
      <div className="entry-flow" aria-label="ترتيب إدخال الإنتاجية">
        <span><b>1</b> التاريخ</span>
        <span><b>2</b> المشروع</span>
        <span><b>3</b> القطاع</span>
        <span><b>4</b> الأمتار</span>
        <span><b>5</b> فريق العمل</span>
        <span><b>6</b> مراجعة وحفظ</span>
      </div>
      <section className="form-section">
        <div className="section-heading">
          <div><span className="section-kicker">01</span><h3>بيانات العملية</h3></div>
          <p>التاريخ والمشروع والقطاع وحجم التنفيذ.</p>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>التاريخ</span>
            <input type="date" required value={form.work_date} onChange={(e) => setField('work_date', e.target.value)} />
          </label>
          <label className="field">
            <span>المشروع</span>
            <input list="project-options" required value={form.project} onChange={(e) => setField('project', e.target.value)} placeholder="اختار أو اكتب مشروع جديد" />
            <datalist id="project-options">
              {references.projects.filter((item) => item.active).map((project) => <option key={project.id} value={project.name} />)}
            </datalist>
          </label>
          <label className="field">
            <span>القطاع</span>
            <select required value={form.section} onChange={(e) => setField('section', e.target.value)}>
              <option value="">اختار القطاع</option>
              {references.sections.filter((item) => item.active).map((item) => (
                <option key={item.id} value={item.name}>{item.name} — {number(item.price_per_meter)} ج.م/م</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>عدد الأمتار</span>
            <input type="number" min="0" step="0.01" required value={form.meters} onChange={(e) => setField('meters', e.target.value)} placeholder="0.00" />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="section-heading">
          <div><span className="section-kicker">02</span><h3>فريق التنفيذ — بالترتيب: مهندسين، فنيين، مساعدين، عمال</h3></div>
          <p>مسموح باختيار أكثر من مهندس وأكثر من فرد في كل دور.</p>
        </div>
        <div className="picker-grid">
          <PeoplePicker title="المهندسين" role="engineer" people={references.people} selected={team.engineer} onChange={(v) => setRole('engineer', v)} />
          <PeoplePicker title="الفنيين" role="technician" people={references.people} selected={team.technician} onChange={(v) => setRole('technician', v)} />
          <PeoplePicker title="المساعدين" role="assistant" people={references.people} selected={team.assistant} onChange={(v) => setRole('assistant', v)} />
          <PeoplePicker title="العمال" role="worker" people={references.people} selected={team.worker} onChange={(v) => setRole('worker', v)} />
        </div>
      </section>

      <section className="calc-preview">
        <div><span>سعر المتر</span><strong>{number(preview.price)}</strong></div>
        <div><span>إجمالي العملية</span><strong>{number(preview.total)}</strong></div>
        <div><span>نصيب كل فني</span><strong>{number(preview.tech)}</strong></div>
        <div><span>نصيب كل مساعد</span><strong>{number(preview.assistant)}</strong></div>
        <div><span>نصيب كل عامل</span><strong>{number(preview.worker)}</strong></div>
      </section>

      <section className={`submission-review-card ${ready ? 'is-ready' : ''}`}>
        <div className="review-card-head">
          <div><span className="section-kicker">03</span><div><h3>راجع العملية قبل الحفظ</h3><p>{ready ? 'البيانات الأساسية مكتملة — راجع الأسماء والأرقام ثم احفظ.' : 'أكمل البيانات المطلوبة ليصبح الملخص جاهزًا للحفظ.'}</p></div></div>
          <span className={`status-pill ${ready ? 'success' : 'warning'}`}>{ready ? 'جاهزة للحفظ' : 'غير مكتملة'}</span>
        </div>
        <div className="review-grid">
          <div><span>التاريخ</span><strong>{form.work_date || '—'}</strong></div>
          <div><span>المشروع</span><strong>{form.project.trim() || '—'}</strong></div>
          <div><span>القطاع</span><strong>{form.section || '—'}</strong></div>
          <div><span>الأمتار</span><strong>{form.meters === '' ? '—' : number(form.meters)}</strong></div>
          <div><span>سعر المتر</span><strong>{number(preview.price)} ج.م</strong></div>
          <div className="highlight"><span>إجمالي العملية</span><strong>{number(preview.total)} ج.م</strong></div>
        </div>
        <div className="review-team-grid">
          <div><span>المهندسين · {team.engineer.length}</span><p>{teamNames.engineer.join('، ') || 'لم يتم الاختيار'}</p></div>
          <div><span>الفنيين · {team.technician.length}</span><p>{teamNames.technician.join('، ') || 'لا يوجد'}</p></div>
          <div><span>المساعدين · {team.assistant.length}</span><p>{teamNames.assistant.join('، ') || 'لا يوجد'}</p></div>
          <div><span>العمال · {team.worker.length}</span><p>{teamNames.worker.join('، ') || 'لا يوجد'}</p></div>
        </div>
      </section>

      {formError ? <div className="form-error">{formError}</div> : null}
      <footer className="form-actions">
        <button className={`btn save-operation-btn ${saveVisual === 'success' ? 'is-success' : 'btn-primary'}`} disabled={submitting || saveVisual === 'saving'} type="submit" onClick={() => setSubmitMode('save')}>
          {saveVisual === 'saving' || submitting ? <><LoaderCircle className="spin-icon" size={18} /> جاري الحفظ...</> : saveVisual === 'success' ? <><Check size={18} /> تم الحفظ</> : mode === 'edit' ? 'حفظ التعديلات' : 'حفظ العملية'}
        </button>
        {mode === 'create' ? (
          <button className="btn btn-secondary" disabled={submitting} type="submit" onClick={() => setSubmitMode('saveAnother')}>
            حفظ وإضافة عملية أخرى
          </button>
        ) : null}
      </footer>
    </form>
  )
}
