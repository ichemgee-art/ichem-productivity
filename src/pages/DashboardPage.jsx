import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, BriefcaseBusiness, Gauge, Ruler, TrendingUp, Users } from 'lucide-react'
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
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
            <div className="rank-name"><strong>{row.person_name || row.name}</strong><small>{number(row.tasks)} عملية</small></div>
            <strong className="rank-value">{people ? money(row.earnings) : `${number(row.meters)} م`}</strong>
          </div>
        ))}
        {!(rows || []).length ? <EmptyState title="لا توجد بيانات" /> : null}
      </div>
    </section>
  )
}

const chartTooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(8,26,49,.12)',
  fontFamily: 'Cairo',
  fontSize: 12,
}

export default function DashboardPage() {
  const { monthKey, selectedCycle } = useCycle()

  const query = useQuery({
    queryKey: ['cycle-data', 'dashboard', monthKey],
    queryFn: () => appService.dashboard(monthKey),
    enabled: Boolean(monthKey),
  })

  const rowsQuery = useQuery({
    queryKey: ['cycle-data', 'dashboard-daily', monthKey],
    queryFn: () => appService.productivityRows(selectedCycle.cycle_start, selectedCycle.cycle_end),
    enabled: Boolean(selectedCycle),
  })

  const dailyData = useMemo(() => {
    const map = new Map()
    ;(rowsQuery.data || []).forEach((row) => {
      const key = row.work_date
      const current = map.get(key) || { date: key, meters: 0, revenue: 0, tasks: 0 }
      current.meters += Number(row.meters || 0)
      current.revenue += Number(row.total || 0)
      current.tasks += 1
      map.set(key, current)
    })
    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({ ...item, label: item.date?.slice(5) }))
  }, [rowsQuery.data])

  if (query.isLoading) return <div className="page-loader">جاري تحميل لوحة الإنتاجية...</div>
  if (query.isError) return <div className="page-error">{query.error.message}</div>

  const data = query.data || {}
  const summary = data.summary || {}
  const projectData = (data.projects || []).slice(0, 8).map((item) => ({
    name: item.name,
    meters: Number(item.meters || 0),
    revenue: Number(item.revenue || 0),
  }))
  const sectionData = (data.sections || []).slice(0, 8).map((item) => ({
    name: item.name,
    meters: Number(item.meters || 0),
    tasks: Number(item.tasks || 0),
  }))

  return (
    <div className="page-stack">
      <section className="hero-strip dashboard-hero">
        <div><span className="eyebrow">CYCLE PERFORMANCE</span><h2>نظرة تنفيذية على الدورة</h2><p>متابعة الحجم التنفيذي، الإيراد، حركة الأيام، وأداء المشاريع والقطاعات من مكان واحد.</p></div>
        <div className="hero-strip__mark"><Gauge size={34} /></div>
      </section>

      <section className="stats-grid">
        <StatCard icon={BriefcaseBusiness} label="إجمالي العمليات" value={number(summary.tasks)} helper="عدد سجلات التشغيل" tone="blue" />
        <StatCard icon={Ruler} label="إجمالي الأمتار" value={number(summary.meters)} helper="إجمالي التنفيذ" tone="cyan" />
        <StatCard icon={TrendingUp} label="قيمة الإنتاجية" value={money(summary.revenue)} helper="حسب الأسعار التاريخية" tone="green" />
        <StatCard icon={BarChart3} label="متوسط سعر المتر" value={money(summary.avg_price)} helper="متوسط الدورة" tone="amber" />
      </section>

      <section className="analytics-grid analytics-grid-main">
        <section className="panel chart-panel dashboard-chart-large">
          <header className="panel-header">
            <div><h3>اتجاه التنفيذ اليومي</h3><p>الأمتار والإيراد عبر أيام الدورة</p></div>
            <span className="chart-badge">Daily Trend</span>
          </header>
          <div className="chart-wrap chart-wrap-large">
            {dailyData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyData} margin={{ top: 20, right: 12, left: 6, bottom: 16 }}>
                  <defs>
                    <linearGradient id="metersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--blue-500)" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="var(--blue-500)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8edf4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => name === 'revenue' ? money(value) : number(value)} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area yAxisId="left" type="monotone" dataKey="meters" name="الأمتار" stroke="var(--blue-600)" fill="url(#metersFill)" strokeWidth={2.5} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" name="الإيراد" stroke="var(--green-600)" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyState title="لا توجد بيانات يومية" />}
          </div>
        </section>

        <section className="panel chart-panel">
          <header className="panel-header">
            <div><h3>المشاريع الأعلى تنفيذًا</h3><p>مقارنة الأمتار لأهم المشاريع</p></div>
            <span className="chart-badge">Top Projects</span>
          </header>
          <div className="chart-wrap">
            {projectData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData} margin={{ top: 14, right: 8, left: 4, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8edf4" />
                  <XAxis dataKey="name" angle={-18} textAnchor="end" height={70} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => number(v)} />
                  <Bar dataKey="meters" name="الأمتار" radius={[8, 8, 0, 0]} fill="var(--blue-600)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>
        </section>
      </section>

      <section className="analytics-grid">
        <section className="panel chart-panel">
          <header className="panel-header">
            <div><h3>توزيع القطاعات</h3><p>أكثر القطاعات استخدامًا حسب الأمتار</p></div>
            <span className="chart-badge">Sections</span>
          </header>
          <div className="chart-wrap">
            {sectionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionData} layout="vertical" margin={{ top: 10, right: 18, left: 30, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e8edf4" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => number(v)} />
                  <Bar dataKey="meters" name="الأمتار" radius={[0, 8, 8, 0]} fill="var(--cyan-500)" />
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
          <header className="panel-header"><div><h3>قراءة تشغيلية</h3><p>مؤشرات سريعة للمراجعة الإدارية.</p></div><Users size={18} /></header>
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
