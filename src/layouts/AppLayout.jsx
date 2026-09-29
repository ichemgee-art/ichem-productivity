import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, ClipboardPlus, Database, FolderKanban, Gauge, LogOut, Menu,
  Settings2, ShieldCheck, UserRoundCog, Users, X, CalendarDays, Wrench, ArrowLeftRight, History,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCycle } from '../context/CycleContext'
import { date, monthName, roleLabels } from '../lib/format'
import { appService } from '../services/appService'
import { useQueryClient } from '@tanstack/react-query'
import PageErrorBoundary from '../components/PageErrorBoundary'

const pageTitles = {
  '/': ['لوحة الإنتاجية', 'ملخص الدورة والفرق والمشاريع.'],
  '/productivity': ['البيانات المحسوبة', 'كل عمليات الدورة مع البحث والمراجعة والإدارة.'],
  '/productivity/new': ['تسجيل إنتاجية', 'إضافة عملية جديدة وحساب الأنصبة تلقائيًا.'],
  '/attendance': ['الحضور والغياب', 'متابعة الحضور والغياب والملاحظات داخل الدورة.'],
  '/projects': ['المشاريع', 'قائمة المشاريع واستخدامها داخل التشغيل.'],
  '/sections': ['القطاعات والأسعار', 'القطاعات وأسعار المتر الحالية والتاريخ التشغيلي.'],
  '/comparison': ['مقارنة الشهور', 'مقارنة شاملة بين دورتين من حيث التشغيل والحضور والأداء.'],
  '/audit': ['سجل التعديلات', 'كل التغييرات ومن نفذها مع إمكانية الاسترجاع الآمن.'],
}

const peopleLabels = { engineer: 'المهندسين', technician: 'الفنيين', assistant: 'المساعدين', worker: 'العمال' }

export default function AppLayout() {
  const { profile, user, permissions, signOut } = useAuth()
  const { monthKey, selectedCycle, cycles, loading: cyclesLoading, error: cyclesError, selectCycle, refreshCycles } = useCycle()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingActive, setSettingActive] = useState(false)

  const meta = useMemo(() => {
    if (location.pathname.startsWith('/people/')) {
      const role = location.pathname.split('/').pop()
      return [peopleLabels[role] || 'الأفراد', 'الإنتاجية والحضور ومستحقات كل شخص في الدورة.']
    }
    return pageTitles[location.pathname] || ['iChem Productivity', 'Engineering Operations System']
  }, [location.pathname])

  const setAsActive = async () => {
    if (!permissions.canSetActiveCycle || !monthKey) return
    setSettingActive(true)
    try {
      await appService.setActiveCycle(monthKey)
      await refreshCycles()
      await queryClient.invalidateQueries()
    } finally {
      setSettingActive(false)
    }
  }

  const nav = [
    { to: '/', label: 'لوحة الإنتاجية', icon: Gauge, end: true },
    { to: '/productivity', label: 'البيانات المحسوبة', icon: Database },
    ...(permissions.canCreateSubmission ? [{ to: '/productivity/new', label: 'تسجيل إنتاجية', icon: ClipboardPlus, accent: true }] : []),
    { to: '/people/engineer', label: 'المهندسين', icon: UserRoundCog },
    { to: '/people/technician', label: 'الفنيين', icon: Wrench },
    { to: '/people/assistant', label: 'المساعدين', icon: Users },
    { to: '/people/worker', label: 'العمال', icon: Users },
    { to: '/attendance', label: 'الحضور والغياب', icon: CalendarDays },
    { to: '/comparison', label: 'مقارنة الشهور', icon: ArrowLeftRight },
    ...(permissions.canViewAudit ? [{ to: '/audit', label: 'سجل التعديلات', icon: History }] : []),
    { to: '/projects', label: 'المشاريع', icon: FolderKanban },
    { to: '/sections', label: 'القطاعات والأسعار', icon: Settings2 },
  ]

  const sidebar = (
    <>
      <div className="sidebar-brand">
        <span className="brand-tile">iC</span>
        <div><strong>iChem</strong><small>Productivity System</small></div>
      </div>
      <div className="sidebar-section-label">OPERATIONS</div>
      <nav className="sidebar-nav">
        {nav.map(({ to, label, icon: Icon, end, accent }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${accent ? 'accent' : ''}`}>
            <Icon size={18} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-role"><ShieldCheck size={17} /><div><strong>{roleLabels[profile?.app_role] || profile?.app_role}</strong><small>{profile?.app_role === 'admin' ? 'إدارة كاملة' : profile?.app_role === 'data_entry' ? 'تشغيل وإدخال' : 'قراءة فقط'}</small></div></div>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">{sidebar}</aside>
      {mobileOpen ? <div className="mobile-sidebar-backdrop" onClick={() => setMobileOpen(false)}><aside className="sidebar mobile-sidebar" onClick={(e) => e.stopPropagation()}><button className="mobile-close icon-btn" onClick={() => setMobileOpen(false)}><X size={18} /></button>{sidebar}</aside></div> : null}

      <div className="app-main">
        <header className="topbar">
          <button className="menu-btn icon-btn" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="topbar-title"><h1>{meta[0]}</h1><p>{meta[1]}</p></div>
          <div className="topbar-actions">
            <Link className="btn btn-ghost top-compare-btn" to="/comparison"><ArrowLeftRight size={16} /> مقارنة الشهور</Link>
            {permissions.canCreateSubmission ? <Link className="btn btn-primary top-entry-btn" to="/productivity/new"><ClipboardPlus size={16} /> إدخال إنتاجية</Link> : null}
            <div className="cycle-control">
              <BarChart3 size={17} />
              <div className="cycle-select-wrap">
                <small>الدورة المعروضة</small>
                <select disabled={cyclesLoading || !cycles.length} value={monthKey || ''} onChange={(e) => selectCycle(e.target.value)}>
                  {cycles.map((cycle) => <option key={cycle.month_key} value={cycle.month_key}>{monthName(cycle.month_key)} · {cycle.submission_count} عملية</option>)}
                </select>
              </div>
              {selectedCycle ? <span className="cycle-dates">{date(selectedCycle.cycle_start)} → {date(selectedCycle.cycle_end)}</span> : null}
              {selectedCycle?.is_active ? <span className="status-pill success">الحالية</span> : permissions.canSetActiveCycle ? <button className="btn btn-ghost btn-sm" disabled={settingActive} onClick={setAsActive}>{settingActive ? '...' : 'اعتماد'}</button> : null}
            </div>
            <div className="user-chip">
              <div className="user-avatar">{(profile?.display_name || user?.email || 'U').slice(0, 1).toUpperCase()}</div>
              <div><strong>{profile?.display_name || 'مستخدم'}</strong><small>{user?.email}</small></div>
            </div>
            <button className="icon-btn" onClick={signOut} title="تسجيل الخروج"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="page-content">
          {cyclesError ? <div className="page-error">{cyclesError.message || 'تعذر تحميل دورات النظام'}</div> : <PageErrorBoundary resetKey={location.pathname}><Outlet /></PageErrorBoundary>}
        </main>
      </div>
    </div>
  )
}
