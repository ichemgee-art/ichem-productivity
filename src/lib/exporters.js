import writeExcelFile from 'write-excel-file/browser'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const safeName = (value) => String(value || 'export').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)

export async function exportExcel({ filename, sheets }) {
  const workbookSheets = (sheets || []).map(({ name, rows = [] }) => {
    const keys = Object.keys(rows[0] || {})
    if (!keys.length) {
      return {
        sheet: safeName(name).slice(0, 31) || 'Sheet1',
        data: [['لا توجد بيانات']],
        columns: [{ width: 20 }],
        rightToLeft: true,
        stickyRowsCount: 1,
      }
    }

    const data = [
      keys.map((key) => ({ value: key, fontWeight: 'bold' })),
      ...rows.map((row) => keys.map((key) => {
        const value = row[key]
        return value == null ? '' : value
      })),
    ]

    return {
      sheet: safeName(name).slice(0, 31) || 'Sheet1',
      data,
      columns: keys.map((key) => ({ width: Math.min(38, Math.max(12, key.length + 4)) })),
      rightToLeft: true,
      stickyRowsCount: 1,
    }
  })

  const output = workbookSheets.length
    ? workbookSheets
    : [{ sheet: 'Sheet1', data: [['لا توجد بيانات']], columns: [{ width: 20 }], rightToLeft: true }]

  await writeExcelFile(output, { fontFamily: 'Arial', fontSize: 10 }).toFile(`${safeName(filename)}.xlsx`)
}


const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const displayValue = (value) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('en-US')
      : value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
  return String(value)
}

export async function exportTablePdf({ filename, sheets }) {
  const printableSheets = (sheets || []).filter((sheet) => Array.isArray(sheet?.rows))
  if (!printableSheets.length) throw new Error('لا توجد بيانات جدول جاهزة للتصدير')

  // Open synchronously from the user click so the browser does not treat it as a blocked popup.
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم جرّب مرة أخرى.')
  }

  const maxColumns = printableSheets.reduce((max, sheet) => {
    const count = Object.keys(sheet.rows?.[0] || {}).length
    return Math.max(max, count)
  }, 0)

  const pageSize = maxColumns >= 11 ? 'A3 landscape' : 'A4 landscape'
  const fontSize = maxColumns >= 13 ? 7.2 : maxColumns >= 10 ? 8 : 9
  const generatedAt = new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sections = printableSheets.map((sheet, sheetIndex) => {
    const rows = sheet.rows || []
    const keys = Object.keys(rows[0] || {})
    const table = keys.length
      ? `
        <table>
          <thead>
            <tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>${keys.map((key) => `<td>${escapeHtml(displayValue(row[key]))}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<div class="empty">لا توجد بيانات</div>'

    return `
      <section class="sheet ${sheetIndex > 0 ? 'new-page' : ''}">
        <div class="sheet-head">
          <div>
            <span class="kicker">ENGINEERING OPERATIONS REPORT</span>
            <h2>${escapeHtml(sheet.name || 'تقرير')}</h2>
          </div>
          <div class="sheet-meta">
            <strong>${rows.length.toLocaleString('ar-EG')} سجل</strong>
            <span>تاريخ التصدير: ${escapeHtml(generatedAt)}</span>
          </div>
        </div>
        ${table}
      </section>
    `
  }).join('')

  const title = safeName(filename)
  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: ${pageSize};
      margin: 8mm;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      color: #253A55;
      font-family: Tahoma, Arial, "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body { direction: rtl; }

    .report-cover {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 12px;
      margin-bottom: 8px;
      border: 1px solid #D8DEE6;
      border-right: 5px solid #F3B820;
      background: #FFFFFF;
    }

    .report-cover h1 {
      margin: 0;
      color: #253A55;
      font-size: 17px;
      line-height: 1.5;
    }

    .report-cover p {
      margin: 3px 0 0;
      color: #66758A;
      font-size: 8px;
    }

    .brand-mark {
      flex: 0 0 auto;
      padding: 7px 10px;
      border-radius: 6px;
      background: #253A55;
      color: #FFFFFF;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: .4px;
    }

    .sheet { width: 100%; }
    .new-page { break-before: page; page-break-before: always; }

    .sheet-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
      margin: 0 0 7px;
      padding: 0 1px 6px;
      border-bottom: 2px solid #253A55;
    }

    .kicker {
      display: block;
      margin-bottom: 2px;
      color: #B07E00;
      font-size: 6.5px;
      font-weight: 700;
      letter-spacing: .7px;
    }

    .sheet-head h2 {
      margin: 0;
      font-size: 13px;
      color: #253A55;
    }

    .sheet-meta {
      display: grid;
      gap: 2px;
      text-align: left;
      color: #66758A;
      font-size: 6.7px;
      direction: rtl;
    }

    .sheet-meta strong {
      color: #253A55;
      font-size: 7.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      direction: rtl;
      font-size: ${fontSize}px;
    }

    thead { display: table-header-group; }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th {
      padding: 5px 4px;
      background: #253A55 !important;
      color: #FFFFFF !important;
      border: 1px solid #253A55;
      font-weight: 700;
      line-height: 1.35;
      text-align: center;
      vertical-align: middle;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    td {
      padding: 4px 4px;
      border: 1px solid #D8DEE6;
      color: #253A55;
      background: #FFFFFF;
      line-height: 1.45;
      text-align: center;
      vertical-align: middle;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    tbody tr:nth-child(even) td {
      background: #F7F8FA !important;
    }

    .empty {
      padding: 30px;
      border: 1px dashed #B8C1CD;
      text-align: center;
      color: #66758A;
      font-size: 11px;
    }

    .print-note {
      margin-top: 7px;
      color: #7B8797;
      font-size: 6.5px;
      text-align: center;
    }

    @media screen {
      body {
        max-width: 1500px;
        margin: 0 auto;
        padding: 18px;
        background: #EEF1F4;
      }
      .print-root {
        padding: 14px;
        background: #FFFFFF;
        box-shadow: 0 8px 30px rgba(37,58,85,.14);
      }
    }

    @media print {
      body { background: #FFFFFF; }
      .print-root { padding: 0; }
      .report-cover { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="print-root">
    <header class="report-cover">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p>تقرير مُهيأ للطباعة بجودة عالية — كل الصفوف والأعمدة مدرجة داخل المستند.</p>
      </div>
      <div class="brand-mark">STC · PRODUCTIVITY SYSTEM</div>
    </header>
    ${sections}
    <div class="print-note">استخدم Save as PDF من نافذة الطباعة للحفاظ على أعلى جودة للنص والجداول.</div>
  </main>

  <script>
    (() => {
      const runPrint = async () => {
        try {
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
        } catch (_) {}
        window.focus();
        window.print();
      };

      window.addEventListener('load', () => setTimeout(runPrint, 120));
      window.addEventListener('afterprint', () => setTimeout(() => window.close(), 200));
    })();
  <\/script>
</body>
</html>`)
  printWindow.document.close()
}


export async function exportElementPdf(element, filename) {
  if (!element) throw new Error('لا يوجد محتوى جاهز للتصدير')
  const canvas = await html2canvas(element, {
    scale: 1.7,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
    windowHeight: Math.max(element.scrollHeight, element.clientHeight),
    onclone: (clonedDocument) => {
      clonedDocument.querySelectorAll('.data-table-wrap, .compact-table, .productivity-scroll, .person-operation-notes__list').forEach((node) => {
        node.style.maxHeight = 'none'
        node.style.height = 'auto'
        node.style.overflow = 'visible'
      })
      clonedDocument.querySelectorAll('.data-table th').forEach((node) => {
        node.style.position = 'static'
      })
    },
  })

  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 7
  const usableWidth = pageWidth - margin * 2
  const imageHeight = (canvas.height * usableWidth) / canvas.width
  const image = canvas.toDataURL('image/png', 0.96)

  if (imageHeight <= pageHeight - margin * 2) {
    pdf.addImage(image, 'PNG', margin, margin, usableWidth, imageHeight)
  } else {
    const pagePixelHeight = Math.floor((canvas.width * (pageHeight - margin * 2)) / usableWidth)
    let offsetY = 0
    let page = 0

    while (offsetY < canvas.height) {
      const sliceHeight = Math.min(pagePixelHeight, canvas.height - offsetY)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceHeight
      slice.getContext('2d').drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
      const sliceImage = slice.toDataURL('image/png', 0.96)
      const sliceMmHeight = (sliceHeight * usableWidth) / canvas.width
      if (page > 0) pdf.addPage()
      pdf.addImage(sliceImage, 'PNG', margin, margin, usableWidth, sliceMmHeight)
      offsetY += sliceHeight
      page += 1
    }
  }

  pdf.save(`${safeName(filename)}.pdf`)
}
