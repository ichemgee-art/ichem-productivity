import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { appService } from '../services/appService'
import SubmissionForm from '../components/SubmissionForm'

export default function NewSubmissionPage() {
  const queryClient = useQueryClient()
  const [success, setSuccess] = useState('')
  const refsQuery = useQuery({ queryKey: ['references'], queryFn: appService.references })

  const mutation = useMutation({
    mutationFn: appService.createSubmission,
    onSuccess: async () => {
      setSuccess('تم حفظ العملية بنجاح وربطها بالدورة تلقائيًا.')
      await queryClient.invalidateQueries({ queryKey: ['cycle-data'] })
      await queryClient.invalidateQueries({ queryKey: ['available-cycles'] })
      await queryClient.invalidateQueries({ queryKey: ['references'] })
      window.setTimeout(() => setSuccess(''), 3500)
    },
  })

  const save = async ({ form, team }) => mutation.mutateAsync({
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

  if (refsQuery.isLoading) return <div className="page-loader">جاري تجهيز شاشة الإدخال...</div>
  if (refsQuery.isError) return <div className="page-error">{refsQuery.error.message}</div>

  return (
    <div className="page-stack">
      <section className="entry-callout"><div><strong>إدخال سريع وآمن</strong><p>تقدر تختار أكثر من مهندس وفني ومساعد وعامل. السعر والإجمالي والأنصبة النهائية يتم تثبيتها في Supabase وقت الحفظ.</p></div></section>
      {success ? <div className="success-banner"><CheckCircle2 size={18} />{success}</div> : null}
      <SubmissionForm references={refsQuery.data} onSubmit={save} submitting={mutation.isPending} />
    </div>
  )
}
