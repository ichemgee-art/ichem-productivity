import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, CalendarCheck2, CircleDollarSign, FileSpreadsheet, Printer, Ruler, TrendingUp, Users } from 'lucide-react'
import { useCycle } from '../context/CycleContext'
import { appService } from '../services/appService'
import { exportExcel } from '../lib/exporters'
import { date, money, monthName, number, roleLabels } from '../lib/format'

const summarizeRows = (rows) => {
  const meters = rows.reduce((sum, row) => sum + Number(row.meters || 0), 0)
  const value = rows.reduce((sum, row) => sum + Number(row.total || 0), 0)
  return { operations: rows.length, meters, value, avgPrice: meters > 0 ? value / meters : 0 }
}

const summarizeAttendance = (rows) => {
  const relevant = rows.filter((row) => row.status !== 'upcoming' && !row.is_friday)
  const present = relevant.filter((row) => row.status === 'present').length
  const absent = relevant.filter((row) => row.status === 'absent').length
  const total = present + absent
  return { present, absent, rate: total ? (present / total) * 100 : 0 }
}

const groupBy = (rows, key) => {
  const map = new Map()
  rows.forEach((row) => {
    const name = row[key] || 'بدون'
    const current = map.get(name) || { name, operations: 0, meters: 0, value: 0 }
    current.operations += 1
    current.meters += Number(row.meters || 0)
    current.value += Number(row.total || 0)
    map.set(name, current)
  })
  return [...map.values()].sort((a, b) => b.meters - a.meters)
}

const aggregatePeople = (rows) => {
  const map = new Map()
  rows.forEach((row) => {
    const key = row.person_id
    const current = map.get(key) || {
      name: row.person_name,
      role: row.role,
      meters: 0,
      earnings: 0,
      operations: new Set(),
    }
    current.meters += Number(row.meters || 0)
    current.earnings += Number(row.share_amount || 0)
    current.operations.add(row.submission_id)
    map.set(key, current)
  })
  return [...map.values()]
    .map((row) => ({ ...row, operationsCount: row.operations.size }))
    .sort((a, b) => b.earnings - a.earnings)
}

const changePct = (current, previous) => {
  const c = Number(current || 0)
  const p = Number(previous || 0)
  if (!p) return c ? null : 0
  return ((c - p) / Math.abs(p)) * 100
}

function ComparisonRow({ label, current, previous, format = number }) {
  const delta = changePct(current, previous)
  return (
    <tr>
      <td>{label}</td>
      <td>{format(current)}</td>
      <td>{format(previous)}</td>
      <td className={delta == null ? '' : delta >= 0 ? 'report-positive' : 'report-negative'}>
        {delta == null ? 'جديد' : `${delta >= 0 ? '+' : ''}${number(delta, 1)}%`}
      </td>
    </tr>
  )
}

export default function ExecutiveReportPage() {
  const { monthKey, selectedCycle } = useCycle()
  const [exporting, setExporting] = useState(false)

  const query = useQuery({
    queryKey: ['cycle-data', 'executive-report', monthKey],
    enabled: Boolean(monthKey && selectedCycle),
    queryFn: async () => {
      const dashboard = await appService.dashboard(monthKey)
      const previousKey = dashboard.previous_month_key
      const previousBounds = await appService.cycleBounds(previousKey)

      const [currentRows, previousRows, currentAttendance, previousAttendance, currentOps, previousOps] = await Promise.all([
        appService.productivityRows(selectedCycle.cycle_start, selectedCycle.cycle_end),
        appService.productivityRows(previousBounds.cycle_start, previousBounds.cycle_end),
        appService.attendance(monthKey),
        appService.attendance(previousKey),
        appService.cyclePersonOperations(selectedCycle.cycle_start, selectedCycle.cycle_end),
        appService.cyclePersonOperations(previousBounds.cycle_start, previousBounds.cycle_end),
      ])

      return { dashboard, previousKey, previousBounds, currentRows, previousRows, currentAttendance, previousAttendance, currentOps, previousOps }
    },
  })

  const report = useMemo(() => {
    if (!query.data) return null
    const current = summarizeRows(query.data.currentRows)
    const previous = summarizeRows(query.data.previousRows)
    const attendance = summarizeAttendance(query.data.currentAttendance)
    const previousAttendance = summarizeAttendance(query.data.previousAttendance)
    const labor = query.data.currentOps.reduce((sum, row) => sum + Number(row.share_amount || 0), 0)
    const previousLabor = query.data.previousOps.reduce((sum, row) => sum + Number(row.share_amount || 0), 0)

    return {
      current,
      previous,
      attendance,
      previousAttendance,
      labor,
      previousLabor,
      projects: groupBy(query.data.currentRows, 'project'),
      sections: groupBy(query.data.currentRows, 'section'),
      people: aggregatePeople(query.data.currentOps),
      previousKey: query.data.previousKey,
      currentRows: query.data.currentRows,
    }
  }, [query.data])

  if (query.isLoading) return <div className="page-loader">جاري إعداد التقرير التنفيذي...</div>
  if (query.isError) return <div className="page-error">{query.error.message}</div>
  if (!report) return null

  const sheets = [
    {
      name: 'الملخص التنفيذي',
      rows: [{
        'الدورة': monthName(monthKey),
        'عدد العمليات': report.current.operations,
        'إجمالي الأمتار': report.current.meters,
        'قيمة الإنتاجية': report.current.value,
        'متوسط سعر المتر': report.current.avgPrice,
        'مستحقات فريق التنفيذ': report.labor,
        'نسبة الحضور %': report.attendance.rate,
      }],
    },
    {
      name: 'المشاريع',
      rows: report.projects.map((row) => ({
        'المشروع': row.name,
        'العمليات': row.operations,
        'الأمتار': row.meters,
        'قيمة الإنتاجية': row.value,
      })),
    },
    {
      name: 'القطاعات',
      rows: report.sections.map((row) => ({
        'القطاع': row.name,
        'العمليات': row.operations,
        'الأمتار': row.meters,
        'قيمة الإنتاجية': row.value,
      })),
    },
    {
      name: 'أداء الأفراد',
      rows: report.people.map((row) => ({
        'الاسم': row.name,
        'الدور': roleLabels[row.role] || row.role,
        'العمليات': row.operationsCount,
        'الأمتار': row.meters,
        'المستحقات': row.earnings,
      })),
    },
    {
      name: 'العمليات كاملة',
      rows: report.currentRows.map((row, index) => ({
        '#': index + 1,
        'التاريخ': date(row.work_date),
        'المشروع': row.project || '—',
        'القطاع': row.section || '—',
        'المهندسين': row.engineers || '—',
        'الفنيين': row.technicians || '—',
        'المساعدين': row.assistants || '—',
        'العمال': row.workers || '—',
        'الأمتار': Number(row.meters || 0),
        'سعر المتر': Number(row.price_per_meter || 0),
        'الإجمالي': Number(row.total || 0),
        'المراجعة': row.review_status === 'reviewed' ? 'تمت المراجعة' : 'لم تتم',
      })),
    },
  ]

  const excel = async () => {
    setExporting(true)
    try {
      await exportExcel({ filename: `executive-report-${monthKey}`, sheets })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-stack executive-report-page">
      <section className="report-actions no-print">
        <div><strong>التقرير التنفيذي الشهري</strong><span>جاهز للطباعة أو الحفظ PDF بجودة عالية</span></div>
        <div>
          <button className="btn btn-secondary" type="button" onClick={excel} disabled={exporting}><FileSpreadsheet size={16} /> Excel</button>
          <button className="btn btn-primary" type="button" onClick={() => window.print()}><Printer size={16} /> PDF / طباعة</button>
        </div>
      </section>

      <article className="executive-report-document">
        <header className="executive-report-cover">
          <div>
            <span>STC · ENGINEERING OPERATIONS REPORT</span>
            <h1>التقرير التنفيذي — {monthName(monthKey)}</h1>
            <p>ملخص الإدارة للدورة من {selectedCycle.cycle_start} إلى {selectedCycle.cycle_end}</p>
          </div>
          <div className="report-cover-mark"><BarChart3 size={30} /></div>
        </header>

        <section className="report-kpi-grid">
          <div><BarChart3 /><span>العمليات</span><strong>{number(report.current.operations)}</strong></div>
          <div><Ruler /><span>الأمتار</span><strong>{number(report.current.meters)} م</strong></div>
          <div><TrendingUp /><span>قيمة الإنتاجية</span><strong>{money(report.current.value)}</strong></div>
          <div><CircleDollarSign /><span>مستحقات الفريق</span><strong>{money(report.labor)}</strong></div>
          <div><CalendarCheck2 /><span>الحضور</span><strong>{number(report.attendance.rate, 1)}%</strong></div>
          <div><Users /><span>أفراد نشطون بالتنفيذ</span><strong>{number(report.people.length)}</strong></div>
        </section>

        <section className="report-section">
          <header><div><span>PERFORMANCE COMPARISON</span><h2>مقارنة بالدورة السابقة</h2></div><small>{monthName(report.previousKey)}</small></header>
          <div className="data-table-wrap">
            <table className="data-table report-table">
              <thead><tr><th>المؤشر</th><th>الحالية</th><th>السابقة</th><th>التغير</th></tr></thead>
              <tbody>
                <ComparisonRow label="عدد العمليات" current={report.current.operations} previous={report.previous.operations} />
                <ComparisonRow label="إجمالي الأمتار" current={report.current.meters} previous={report.previous.meters} />
                <ComparisonRow label="قيمة الإنتاجية" current={report.current.value} previous={report.previous.value} format={money} />
                <ComparisonRow label="مستحقات فريق التنفيذ" current={report.labor} previous={report.previousLabor} format={money} />
                <ComparisonRow label="نسبة الحضور" current={report.attendance.rate} previous={report.previousAttendance.rate} format={(v) => `${number(v, 1)}%`} />
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-two-column">
          <section className="report-section">
            <header><div><span>PROJECTS</span><h2>أعلى المشاريع تنفيذًا</h2></div></header>
            <div className="report-ranking-list">
              {report.projects.slice(0, 8).map((row, index) => (
                <div key={row.name}>
                  <b>{index + 1}</b>
                  <span><strong>{row.name}</strong><small>{number(row.operations)} عملية</small></span>
                  <em>{number(row.meters)} م</em>
                </div>
              ))}
            </div>
          </section>

          <section className="report-section">
            <header><div><span>SECTIONS</span><h2>أعلى القطاعات</h2></div></header>
            <div className="report-ranking-list">
              {report.sections.slice(0, 8).map((row, index) => (
                <div key={row.name}>
                  <b>{index + 1}</b>
                  <span><strong>{row.name}</strong><small>{number(row.operations)} عملية</small></span>
                  <em>{number(row.meters)} م</em>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="report-section">
          <header><div><span>TEAM PERFORMANCE</span><h2>أعلى المستحقات حسب الأفراد</h2></div></header>
          <div className="data-table-wrap">
            <table className="data-table report-table">
              <thead><tr><th>#</th><th>الاسم</th><th>الدور</th><th>العمليات</th><th>الأمتار</th><th>المستحقات</th></tr></thead>
              <tbody>
                {report.people.slice(0, 12).map((row, index) => (
                  <tr key={`${row.name}-${row.role}`}>
                    <td>{index + 1}</td><td>{row.name}</td><td>{roleLabels[row.role] || row.role}</td>
                    <td>{number(row.operationsCount)}</td><td>{number(row.meters)}</td><td>{money(row.earnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-section report-full-operations">
          <header>
            <div><span>FULL OPERATIONS TABLE</span><h2>جميع عمليات الدورة</h2></div>
            <small>{number(report.currentRows.length)} عملية</small>
          </header>
          <div className="data-table-wrap">
            <table className="data-table report-table report-operations-table">
              <thead>
                <tr>
                  <th>#</th><th>التاريخ</th><th>المشروع</th><th>القطاع</th><th>المهندسين</th><th>الفنيين</th>
                  <th>المساعدين</th><th>العمال</th><th>الأمتار</th><th>سعر المتر</th><th>الإجمالي</th><th>المراجعة</th>
                </tr>
              </thead>
              <tbody>
                {report.currentRows.map((row, index) => (
                  <tr key={row.id || `${row.work_date}-${row.project}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{date(row.work_date)}</td>
                    <td>{row.project || '—'}</td>
                    <td>{row.section || '—'}</td>
                    <td>{row.engineers || '—'}</td>
                    <td>{row.technicians || '—'}</td>
                    <td>{row.assistants || '—'}</td>
                    <td>{row.workers || '—'}</td>
                    <td>{number(row.meters)}</td>
                    <td>{money(row.price_per_meter)}</td>
                    <td>{money(row.total)}</td>
                    <td>{row.review_status === 'reviewed' ? 'تمت المراجعة' : 'لم تتم'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="executive-report-footer">
          <span>Generated from STC Productivity System</span>
          <strong>{monthName(monthKey)}</strong>
        </footer>
      </article>
    </div>
  )
}
