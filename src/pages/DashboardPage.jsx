import { useQuery } from '@tanstack/react-query'
import { BarChart3, BriefcaseBusiness, Gauge, Ruler, TrendingUp, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCycle } from '../context/CycleContext'
import { appService } from '../services/appService'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import { money, number } from '../lib/format'

function RankList({ title, rows, people = false }) {
  return (
    <section className="panel">
      <header className="panel-header"><div><h3>{title}</h3><p>أعلى النتائج داخل الدورة المختارة</p></div></header>
      <div className="rank-list">
        {(rows || []).slice(0, 7).map((row, index) => (
          <div className="rank-row" key={`${row.person_id || row.name}-${index}`}>
            <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="rank-name"><strong>{row.person_name || row.name}</strong><small>{number(row.tasks)} مهمة</small></div>
            <strong className="rank-value">{people ? money(row.earnings) : `${number(row.meters)} م`}</strong>
          </div>
        ))}
        {!(rows || []).length ? <EmptyState title="لا توجد بيانات" /> : null}
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const { monthKey } = useCycle()
  const query = useQuery({
    queryKey: ['cycle-data', 'dashboard', monthKey],
    queryFn: () => appService.dashboard(monthKey),
    enabled: Boolean(monthKey),
  })

  if (query.isLoading) return <div className="page-loader">جاري تحميل لوحة الإنتاجية...</div>
  if (query.isError) return <div className="page-error">{query.error.message}</div>

  const data = query.data || {}
  const summary = data.summary || {}
  const chartData = (data.projects || []).slice(0, 8).map((item) => ({ name: item.name, meters: Number(item.meters || 0), revenue: Number(item.revenue || 0) }))

  return (
    <div className="page-stack">
      <section className="hero-strip">
        <div><span className="eyebrow">CYCLE PERFORMANCE</span><h2>نظرة تنفيذية على الدورة</h2><p>الأرقام هنا تتغير بالكامل مع الدورة المختارة من أعلى الصفحة.</p></div>
        <div className="hero-strip__mark"><Gauge size={34} /></div>
      </section>

      <section className="stats-grid">
        <StatCard icon={BriefcaseBusiness} label="إجمالي العمليات" value={number(summary.tasks)} helper="عدد سجلات التشغيل" tone="blue" />
        <StatCard icon={Ruler} label="إجمالي الأمتار" value={number(summary.meters)} helper="إجمالي التنفيذ" tone="cyan" />
        <StatCard icon={TrendingUp} label="قيمة الإنتاجية" value={money(summary.revenue)} helper="حسب الأسعار التاريخية" tone="green" />
        <StatCard icon={BarChart3} label="متوسط سعر المتر" value={money(summary.avg_price)} helper="متوسط الدورة" tone="amber" />
      </section>

      <section className="dashboard-grid-main">
        <section className="panel chart-panel">
          <header className="panel-header"><div><h3>المشاريع الأعلى تنفيذًا</h3><p>أعلى المشاريع حسب الأمتار داخل الدورة</p></div></header>
          <div className="chart-wrap">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 4, left: 0, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" angle={-18} textAnchor="end" height={65} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => number(v)} />
                  <Bar dataKey="meters" radius={[7, 7, 0, 0]} fill="var(--blue-600)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>
        </section>
        <RankList title="أعلى المشاريع" rows={data.projects} />
      </section>

      <section className="dashboard-grid-three">
        <RankList title="الفنيين" rows={data.technicians} people />
        <RankList title="المساعدين" rows={data.assistants} people />
        <RankList title="العمال" rows={data.workers} people />
      </section>

      <section className="dashboard-grid-main reverse">
        <RankList title="القطاعات" rows={data.sections} />
        <section className="panel insight-panel">
          <header className="panel-header"><div><h3>قراءة تشغيلية</h3><p>تنبيهات سريعة تساعد الإدارة في مراجعة الدورة.</p></div><Users size={18} /></header>
          <div className="insight-grid">
            <div><span>مشاريع بدون إيراد</span><strong>{number((data.zero_revenue_projects || []).length)}</strong></div>
            <div><span>قطاعات منخفضة الاستخدام</span><strong>{number((data.neglected_sections || []).length)}</strong></div>
            <div><span>عدد المشاريع</span><strong>{number((data.projects || []).length)}</strong></div>
            <div><span>عدد القطاعات المستخدمة</span><strong>{number((data.sections || []).length)}</strong></div>
          </div>
        </section>
      </section>
    </div>
  )
}
