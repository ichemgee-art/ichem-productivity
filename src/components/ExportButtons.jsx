import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { exportElementPdf, exportExcel } from '../lib/exporters'
import { useFeedback } from '../context/FeedbackContext'

export default function ExportButtons({ filename, excelSheets, pdfTarget, compact = false }) {
  const [busy, setBusy] = useState('')
  const feedback = useFeedback()

  const excel = async () => {
    setBusy('excel')
    try {
      await exportExcel({ filename, sheets: excelSheets })
    } catch (error) {
      feedback.error('تعذر تصدير Excel', error.message || 'حدث خطأ أثناء إنشاء الملف')
    } finally {
      setBusy('')
    }
  }

  const pdf = async () => {
    setBusy('pdf')
    try {
      const element = typeof pdfTarget === 'function' ? pdfTarget() : pdfTarget?.current || pdfTarget
      await exportElementPdf(element, filename)
    } catch (error) {
      feedback.error('تعذر تصدير PDF', error.message || 'حدث خطأ أثناء إنشاء الملف')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className={`export-actions ${compact ? 'compact' : ''}`} data-html2canvas-ignore="true">
      <span className="export-label"><Download size={14} /> تصدير النتائج</span>
      <button className="btn btn-export excel" type="button" onClick={excel} disabled={Boolean(busy)}><FileSpreadsheet size={15} />{busy === 'excel' ? '...' : 'Excel'}</button>
      <button className="btn btn-export pdf" type="button" onClick={pdf} disabled={Boolean(busy)}><FileText size={15} />{busy === 'pdf' ? '...' : 'PDF'}</button>
    </div>
  )
}
