import { useState } from 'react'
import { BarChart3, Database, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signIn, error: authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual">
        <div className="login-brand-row"><span className="brand-tile">iC</span><strong>iChem Productivity</strong></div>
        <div className="login-copy">
          <span className="eyebrow"><Sparkles size={15} /> ENGINEERING OPERATIONS PLATFORM</span>
          <h1>إدارة الإنتاجية<br />بصورة أوضح وأسرع.</h1>
          <p>متابعة التشغيل، الفرق، الحضور، المشاريع والقطاعات في نظام واحد متصل مباشرة بقاعدة بيانات Supabase.</p>
          <div className="login-feature-grid">
            <div><BarChart3 /><strong>Dashboard</strong><span>قراءة أقوى للدورة</span></div>
            <div><Database /><strong>Live Data</strong><span>بيانات تاريخية موحدة</span></div>
            <div><ShieldCheck /><strong>Role Based</strong><span>Admin / User</span></div>
          </div>
        </div>
        <small>Internal Engineering Operations System · دورة 26 → 25</small>
      </section>

      <section className="login-form-side">
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="mobile-brand"><span className="brand-tile">iC</span><strong>iChem Productivity</strong></div>
          <span className="login-overline">SECURE ACCESS</span>
          <h2>تسجيل الدخول</h2>
          <p>ادخل بحسابك المسجل في النظام، وسيتم تحميل الواجهة المناسبة لصلاحيتك تلقائيًا.</p>
          <label className="field"><span>البريد الإلكتروني</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field"><span>كلمة المرور</span><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {(error || authError) ? <div className="form-error">{error || authError}</div> : null}
          <button className="btn btn-primary btn-wide" type="submit" disabled={submitting}>{submitting ? 'جاري الدخول...' : 'دخول للنظام'}</button>
        </form>
      </section>
    </main>
  )
}
