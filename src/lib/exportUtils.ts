import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

/**
 * Universal Excel Export Function
 * Works on Web, iFrame, Eitaa MiniApp, and Android WebViews
 */
export function exportToExcel(data: Record<string, any>[], filename: string = 'export_report.xlsx') {
  if (!data || data.length === 0) {
    alert('اطلاعاتی برای خروجی اکسل وجود ندارد.');
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش');

    // Make column widths auto-fit content
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length * 2, 18)
    }));
    worksheet['!cols'] = colWidths;

    // Check if running in Android Bridge with custom download handler
    if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.downloadFile === 'function') {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      (window as any).AndroidBridge.downloadFile(wbout, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return;
    }

    // Standard XLSX file write
    XLSX.writeFile(workbook, filename);
  } catch (err) {
    console.warn('XLSX.writeFile fallback to UTF-8 CSV:', err);
    exportToCsv(data, filename.replace('.xlsx', '.csv'));
  }
}

/**
 * Fallback UTF-8 BOM CSV Export (Persian Character Friendly)
 */
export function exportToCsv(data: Record<string, any>[], filename: string = 'report.csv') {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      const val = obj[header] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Universal Print & PDF Trigger Function
 */
export function triggerPrint() {
  window.focus();
  setTimeout(() => {
    window.print();
  }, 150);
}

/**
 * Universal Image Export (Capture DOM Element as PNG)
 */
export async function exportElementAsImage(elementId: string, filename: string = 'report_image.png') {
  const elem = document.getElementById(elementId);
  if (!elem) {
    alert('عنصر مورد نظر جهت دریافت تصویر یافت نشد.');
    return;
  }

  try {
    const canvas = await html2canvas(elem, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error generating image:', err);
    alert('خطا در تولید تصویر گزارش. لطفاً از دکمه چا‌پ / PDF استفاده نمایید.');
  }
}
