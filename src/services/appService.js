import { supabase } from '../lib/supabase'

const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

export const appService = {
  async profile(userId) {
    return unwrap(await supabase.from('profiles').select('display_name,app_role').eq('user_id', userId).single())
  },

  async availableCycles() {
    return unwrap(await supabase.from('v_available_cycles').select('*').order('cycle_start', { ascending: false })) || []
  },

  async activeCycleMonthKey() {
    return unwrap(await supabase.rpc('active_cycle_month_key'))
  },

  async cycleBounds(monthKey) {
    const data = unwrap(await supabase.rpc('cycle_bounds', { p_month_key: monthKey }))
    return Array.isArray(data) ? data[0] : data
  },

  async setActiveCycle(monthKey) {
    return unwrap(await supabase.rpc('set_active_cycle', { p_month_key: monthKey }))
  },

  async dashboard(monthKey) {
    return unwrap(await supabase.rpc('dashboard_data', { p_month_key: monthKey }))
  },

  async references() {
    const [people, sections, projects] = await Promise.all([
      supabase.from('people').select('id,name,role,active').order('role').order('name'),
      supabase.from('sections').select('id,name,price_per_meter,active').order('name'),
      supabase.from('projects').select('id,name,active,created_at').order('name'),
    ])
    return {
      people: unwrap(people) || [],
      sections: unwrap(sections) || [],
      projects: unwrap(projects) || [],
    }
  },

  async productivityRows(start, end) {
    return unwrap(
      await supabase
        .from('v_master_data')
        .select('*')
        .gte('work_date', start)
        .lte('work_date', end)
        .order('work_date', { ascending: false })
        .order('submitted_at', { ascending: false })
        .limit(5000),
    ) || []
  },

  async submissionTeam(submissionId) {
    return unwrap(
      await supabase
        .from('submission_people')
        .select('person_id,role')
        .eq('submission_id', submissionId),
    ) || []
  },

  async createSubmission(payload) {
    return unwrap(await supabase.rpc('create_productivity_submission', payload))
  },

  async updateSubmission(payload) {
    return unwrap(await supabase.rpc('update_productivity_submission', payload))
  },

  async setReview(id, reviewed) {
    return unwrap(await supabase.rpc('set_review_status', { p_submission_id: id, p_reviewed: reviewed }))
  },

  async deleteSubmission(id) {
    return unwrap(await supabase.rpc('delete_productivity_submission', { p_submission_id: id }))
  },

  async personStats(monthKey, role) {
    return unwrap(await supabase.rpc('person_cycle_stats', { p_month_key: monthKey, p_role: role })) || []
  },

  async people(role) {
    return unwrap(
      await supabase
        .from('people')
        .select('id,name,role,active')
        .eq('role', role)
        .order('active', { ascending: false })
        .order('name'),
    ) || []
  },

  async savePerson({ id = null, name, role, active = true }) {
    return unwrap(await supabase.rpc('admin_save_person', {
      p_id: id,
      p_name: name,
      p_role: role,
      p_active: active,
    }))
  },

  async deletePerson(id) {
    return unwrap(await supabase.rpc('admin_delete_person', { p_id: id }))
  },

  async personOperations(personId, start, end) {
    return unwrap(
      await supabase
        .from('v_person_operations')
        .select('*')
        .eq('person_id', personId)
        .gte('work_date', start)
        .lte('work_date', end)
        .order('work_date', { ascending: false }),
    ) || []
  },

  async attendance(monthKey) {
    return unwrap(await supabase.rpc('attendance_for_cycle', { p_month_key: monthKey })) || []
  },

  async saveAbsence(personId, attendanceDate, type) {
    return unwrap(await supabase.rpc('upsert_absence_type', {
      p_person_id: personId,
      p_date: attendanceDate,
      p_type: type || null,
    }))
  },

  async saveAttendanceNote(personId, attendanceDate, note) {
    return unwrap(await supabase.rpc('upsert_attendance_note', {
      p_person_id: personId,
      p_date: attendanceDate,
      p_note: note,
    }))
  },

  async projects() {
    const [all, usage] = await Promise.all([
      supabase.from('projects').select('id,name,active').order('name'),
      supabase.from('v_project_autocomplete').select('*'),
    ])
    const projects = unwrap(all) || []
    const usageRows = unwrap(usage) || []
    const usageMap = new Map(usageRows.map((row) => [row.id, row]))
    return projects.map((project) => ({
      ...project,
      use_count: usageMap.get(project.id)?.use_count || 0,
      last_used: usageMap.get(project.id)?.last_used || null,
    }))
  },

  async saveProject({ id = null, name, active = true }) {
    return unwrap(await supabase.rpc('admin_save_project', {
      p_id: id,
      p_name: name,
      p_active: active,
    }))
  },

  async sections() {
    return unwrap(await supabase.from('sections').select('id,name,price_per_meter,active').order('name')) || []
  },

  async saveSection({ id = null, name, price, active = true }) {
    return unwrap(await supabase.rpc('admin_save_section', {
      p_id: id,
      p_name: name,
      p_price: Number(price || 0),
      p_active: active,
    }))
  },

  async deleteSection(id) {
    return unwrap(await supabase.rpc('admin_delete_section', { p_id: id }))
  },
}
