import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useFeedback } from '../context/FeedbackContext'
import { appService } from '../services/appService'
import SubmissionForm from '../components/SubmissionForm'

export default function NewSubmissionPage() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()
  const [lastSaved, setLastSaved] = useState(null)
  const refsQuery = useQuery({ queryKey: ['references'], queryFn: appService.references })

  const mutation = useMutation({
    mutationFn: appService.createSubmission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cycle-data'] })
      await queryClient.invalidateQueries({ queryKey: ['available-cycles'] })
      await queryClient.invalidateQueries({ queryKey: ['references'] })
    },
  })

  const save = async ({ form, team, submitMode }) => {
    const result = await mutation.mutateAsync({
      p_work_date: form.work_date,
      p_project_name: form.project.trim(),
      p_section_name: form.section,
      p_meters: Number(form.meters || 0),
      p_engineer_ids: team.engineer,
      p_technician_ids: team.technician,
      p_assistant_ids: team.assistant,
      p_worker_ids: team.worker,
      p_source: 'react_dashboard',
    })

    const saved = {
      project: form.project.trim(),
      work_date: form.work_date,
      section: form.section,
      meters: Number(form.meters || 0),
      total: Number(result?.total || 0),
      submitMode,
    }

    setLastSaved(saved)
    feedback.success(
      'تم حفظ العملية بنجاح',
      `${saved.project} · ${saved.section} · ${saved.meters} متر`,
    )
    return result
  }

  if (refsQuery.isLoading) return <div className="page-loader">جاري تجهيز شاشة الإدخال...</div>
  if (refsQuery.isError) return <div className="page-error">{refsQuery.error.message}</div>

  return (
    <div className="page-stack">
      <section className="entry-callout"><div><strong>إدخال سريع وآمن</strong><p>تقدر تختار أكثر من مهندس وفني ومساعد وعامل. السعر والإجمالي والأنصبة النهائية يتم تثبيتها في Supabase وقت الحفظ.</p></div></section>
      {lastSaved ? (
        <section className="saved-receipt">
          <span className="saved-receipt__icon"><CheckCircle2 size={24} /></span>
          <div className="saved-receipt__copy">
            <strong>تم حفظ آخر عملية بنجاح</strong>
            <p>{lastSaved.project} · {lastSaved.section} · {lastSaved.meters} متر · إجمالي {lastSaved.total.toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م</p>
          </div>
          <button className="saved-receipt__close" type="button" onClick={() => setLastSaved(null)}>×</button>
        </section>
      ) : null}
      <SubmissionForm references={refsQuery.data} onSubmit={save} submitting={mutation.isPending} />
    </div>
  )
}
