import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const safeName = (value) => String(value || 'export').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)

export function exportExcel({ filename, sheets }) {
  const workbook = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows || [])
    worksheet['!cols'] = Object.keys((rows || [])[0] || {}).map((key) => ({
      wch: Math.min(38, Math.max(12, key.length + 4)),
    }))
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName(name).slice(0, 31) || 'Sheet1')
  })
  XLSX.writeFile(workbook, `${safeName(filename)}.xlsx`)
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
