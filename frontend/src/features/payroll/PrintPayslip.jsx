import { useMemo } from 'react';
import { Button } from '../../components/ui';

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('uz-UZ').format(Number.isFinite(n) ? n : 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function summarizeLines(lines = []) {
  const summary = {
    lessonCount: 0,
    lessonMinutes: 0,
    lessonAmount: 0,
    fixedSalaryAmount: 0,
    bonusAmount: 0,
    penaltyAmount: 0,
    manualAmount: 0,
    advanceDeductionAmount: 0,
  };
  for (const line of lines) {
    const amount = Number(line.amount || 0);
    if (line.type === 'LESSON') {
      summary.lessonCount += 1;
      summary.lessonMinutes += Number(line.minutes || 0);
      summary.lessonAmount += amount;
    } else if (line.type === 'FIXED_SALARY') {
      summary.fixedSalaryAmount += amount;
    } else if (line.type === 'BONUS') {
      summary.bonusAmount += amount;
    } else if (line.type === 'PENALTY') {
      summary.penaltyAmount += Math.abs(amount);
    } else if (line.type === 'MANUAL') {
      summary.manualAmount += amount;
    } else if (line.type === 'ADVANCE_DEDUCTION') {
      summary.advanceDeductionAmount += Math.abs(amount);
    }
  }
  return summary;
}

export default function PrintPayslip({ teacher, payslip, lines = [] }) {
  const lineSummary = useMemo(() => summarizeLines(lines), [lines]);

  function handlePrint() {
    if (!payslip) return;

    const teacherName = `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim() || '-';
    const teacherUsername = teacher?.user?.username ? `@${teacher.user.username}` : '-';
    const periodMonth = payslip?.payrollRun?.periodMonth || '-';
    const status = payslip?.payrollRun?.status || '-';

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Payslip ${escapeHtml(periodMonth)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px 0; font-size: 22px; }
            .muted { color: #475569; font-size: 12px; margin-bottom: 12px; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
            .cell { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; font-size: 12px; }
            .label { color: #64748b; font-size: 11px; }
            .value { margin-top: 4px; font-weight: 600; font-size: 14px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Oylik Varaqasi</h1>
          <div class="muted">${escapeHtml(teacherName)} (${escapeHtml(teacherUsername)}) | ${escapeHtml(periodMonth)} | ${escapeHtml(status)}</div>

          <div class="grid">
            <div class="cell"><div class="label">Darslar soni</div><div class="value">${escapeHtml(String(lineSummary.lessonCount))}</div></div>
            <div class="cell"><div class="label">Dars daqiqasi</div><div class="value">${escapeHtml(String(payslip.totalMinutes || lineSummary.lessonMinutes || 0))}</div></div>
            <div class="cell"><div class="label">Dars summasi</div><div class="value">${escapeHtml(formatMoney(lineSummary.lessonAmount))}</div></div>
            <div class="cell"><div class="label">Oklad</div><div class="value">${escapeHtml(formatMoney(payslip.fixedSalaryAmount || lineSummary.fixedSalaryAmount || 0))}</div></div>
            <div class="cell"><div class="label">Bonus</div><div class="value">${escapeHtml(formatMoney(payslip.bonusAmount || lineSummary.bonusAmount || 0))}</div></div>
            <div class="cell"><div class="label">Jarima</div><div class="value">${escapeHtml(formatMoney(payslip.penaltyAmount || lineSummary.penaltyAmount || 0))}</div></div>
            <div class="cell"><div class="label">Manual</div><div class="value">${escapeHtml(formatMoney(payslip.manualAmount || lineSummary.manualAmount || 0))}</div></div>
            <div class="cell"><div class="label">Avans ushlanma</div><div class="value">${escapeHtml(formatMoney(payslip.advanceDeductionAmount || lineSummary.advanceDeductionAmount || 0))}</div></div>
            <div class="cell"><div class="label">Qo'lga tegadi</div><div class="value">${escapeHtml(formatMoney(payslip.payableAmount || 0))}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Turi</th>
                <th>Vaqt</th>
                <th>Fan / Sinf</th>
                <th>Daqiqa</th>
                <th>Rate</th>
                <th>Summa</th>
                <th>Izoh</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((line) => `
                <tr>
                  <td>${escapeHtml(line.type || '-')}</td>
                  <td>${escapeHtml(formatDateTime(line.lessonStartAt || line.realLesson?.startAt))}</td>
                  <td>${escapeHtml(`${line.subject?.name || '-'} / ${line.classroom ? `${line.classroom.name} (${line.classroom.academicYear})` : '-'}`)}</td>
                  <td>${escapeHtml(String(line.minutes ?? '-'))}</td>
                  <td>${escapeHtml(line.ratePerHour ? formatMoney(line.ratePerHour) : '-')}</td>
                  <td>${escapeHtml(formatMoney(line.amount))}</td>
                  <td>${escapeHtml(line.description || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=760');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <Button variant="secondary" onClick={handlePrint} disabled={!payslip}>
      Print Payslip
    </Button>
  );
}
