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

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم جرّب مرة أخرى.')
  }

  const maxColumns = printableSheets.reduce((max, sheet) => {
    const count = Object.keys(sheet.rows?.[0] || {}).length
    return Math.max(max, count)
  }, 0)

  const pageSize = maxColumns >= 9 ? 'A3 landscape' : 'A4 landscape'
  const fontSize = maxColumns >= 14 ? 6.3 : maxColumns >= 11 ? 7 : maxColumns >= 8 ? 7.8 : 8.8
  const cellPadding = maxColumns >= 12 ? '3.3px 2.5px' : '4px 3px'
  const generatedAt = new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const totalRows = printableSheets.reduce((sum, sheet) => sum + (sheet.rows?.length || 0), 0)
  const reportTitle = printableSheets.length === 1
    ? (printableSheets[0].name || safeName(filename))
    : safeName(filename)

  const sections = printableSheets.map((sheet, sheetIndex) => {
    const rows = sheet.rows || []
    const keys = Object.keys(rows[0] || {})
    const table = keys.length
      ? `
        <div class="table-shell">
          <table>
            <thead>
              <tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map((row, rowIndex) => `
                <tr>
                  ${keys.map((key) => `<td>${escapeHtml(displayValue(row[key]))}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
      : '<div class="empty">لا توجد بيانات</div>'

    return `
      <section class="sheet ${sheetIndex > 0 ? 'new-page' : ''}">
        <header class="executive-header">
          <div class="executive-header__copy">
            <span class="eyebrow">STC · ENGINEERING OPERATIONS REPORT</span>
            <h1>${escapeHtml(sheet.name || reportTitle)}</h1>
            <p>تقرير تشغيلي كامل — جميع الصفوف والأعمدة مدرجة داخل المستند.</p>
          </div>
          <div class="executive-mark">
            <span class="mark-bars"><i></i><i></i><i></i></span>
          </div>
        </header>

        <section class="report-meta-grid">
          <article>
            <span>عدد السجلات</span>
            <strong>${rows.length.toLocaleString('en-US')}</strong>
          </article>
          <article>
            <span>عدد الأعمدة</span>
            <strong>${keys.length.toLocaleString('en-US')}</strong>
          </article>
          <article>
            <span>تاريخ التصدير</span>
            <strong class="meta-date">${escapeHtml(generatedAt)}</strong>
          </article>
        </section>

        <div class="section-title">
          <div>
            <span>FULL DATA TABLE</span>
            <h2>${escapeHtml(sheet.name || 'البيانات')}</h2>
          </div>
          <small>${rows.length.toLocaleString('ar-EG')} سجل</small>
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
      margin: 8mm 7mm 10mm;
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

    body {
      direction: rtl;
      font-variant-numeric: tabular-nums;
    }

    .print-root {
      width: 100%;
      background: #FFFFFF;
    }

    .sheet {
      width: 100%;
    }

    .new-page {
      break-before: page;
      page-break-before: always;
    }

    .executive-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 78px;
      margin-bottom: 8px;
      padding: 14px 18px;
      border-radius: 8px;
      background: #253A55 !important;
      color: #FFFFFF !important;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .executive-header__copy {
      display: grid;
      gap: 3px;
    }

    .executive-header .eyebrow {
      color: #F3B820 !important;
      font-size: 6.8px;
      font-weight: 800;
      letter-spacing: .8px;
    }

    .executive-header h1 {
      margin: 0;
      color: #FFFFFF !important;
      font-size: 17px;
      line-height: 1.45;
    }

    .executive-header p {
      margin: 0;
      color: rgba(255,255,255,.76) !important;
      font-size: 7px;
    }

    .executive-mark {
      width: 48px;
      height: 48px;
      flex: 0 0 48px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 12px;
      background: rgba(255,255,255,.07);
    }

    .mark-bars {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: end;
      justify-content: center;
      gap: 3px;
      padding-bottom: 3px;
      border-bottom: 2px solid #F3B820;
    }

    .mark-bars i {
      width: 4px;
      display: block;
      border-radius: 2px 2px 0 0;
      background: #F3B820;
    }
    .mark-bars i:nth-child(1){height:9px}
    .mark-bars i:nth-child(2){height:16px}
    .mark-bars i:nth-child(3){height:12px}

    .report-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      margin-bottom: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .report-meta-grid article {
      display: grid;
      gap: 2px;
      min-height: 44px;
      padding: 8px 10px;
      border: 1px solid #D8DEE6;
      border-radius: 7px;
      background: #FFFFFF;
    }

    .report-meta-grid span {
      color: #7B8797;
      font-size: 6.5px;
    }

    .report-meta-grid strong {
      color: #253A55;
      font-size: 12px;
    }

    .report-meta-grid .meta-date {
      font-size: 8px;
      line-height: 1.5;
    }

    .section-title {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 10px;
      margin: 0 0 5px;
      padding: 0 2px 5px;
      border-bottom: 2px solid #253A55;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .section-title > div {
      display: grid;
      gap: 1px;
    }

    .section-title span {
      color: #B07E00;
      font-size: 5.8px;
      font-weight: 800;
      letter-spacing: .6px;
    }

    .section-title h2 {
      margin: 0;
      color: #253A55;
      font-size: 11px;
    }

    .section-title small {
      color: #66758A;
      font-size: 6.5px;
    }

    .table-shell {
      width: 100%;
      overflow: visible;
      border: 1px solid #D8DEE6;
      border-radius: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      direction: rtl;
      font-size: ${fontSize}px;
    }

    thead {
      display: table-header-group;
    }

    tbody {
      display: table-row-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th {
      padding: ${cellPadding};
      border: 1px solid #253A55;
      background: #253A55 !important;
      color: #FFFFFF !important;
      font-weight: 800;
      line-height: 1.4;
      text-align: center;
      vertical-align: middle;
      word-break: normal;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    td {
      padding: ${cellPadding};
      border: 1px solid #D8DEE6;
      background: #FFFFFF !important;
      color: #253A55 !important;
      line-height: 1.45;
      text-align: center;
      vertical-align: middle;
      word-break: normal;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    tbody tr:nth-child(even) td {
      background: #F7F8FA !important;
    }

    .empty {
      padding: 28px;
      border: 1px dashed #B8C1CD;
      border-radius: 7px;
      text-align: center;
      color: #66758A;
      font-size: 10px;
    }

    .document-footer {
      margin-top: 6px;
      padding-top: 5px;
      border-top: 1px solid #D8DEE6;
      color: #7B8797;
      font-size: 5.8px;
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
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(37,58,85,.14);
      }
    }

    @media print {
      html, body, .print-root {
        width: 100% !important;
        max-width: none !important;
      }

      body {
        background: #FFFFFF !important;
      }

      .print-root {
        padding: 0 !important;
      }

      .executive-header,
      .report-meta-grid,
      .section-title {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      table {
        width: 100% !important;
      }

      thead {
        display: table-header-group !important;
      }

      tr, td, th {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .new-page {
        break-before: page !important;
        page-break-before: always !important;
      }
    }
  </style>
</head>
<body>
  <main class="print-root">
    ${sections}
    <footer class="document-footer">
      STC Productivity System · ${totalRows.toLocaleString('ar-EG')} سجل إجمالي · ${escapeHtml(generatedAt)}
    </footer>
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

      window.addEventListener('load', () => setTimeout(runPrint, 150));
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
