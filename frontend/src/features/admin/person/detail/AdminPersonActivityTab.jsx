import { Card, DataTable } from '../../../../components/ui';
import { formatScheduleSlotLabel } from '../../../../lib/scheduleSlotLabel';
import {
  formatDate,
  formatDateTime,
} from './adminPersonDetailModel';

export default function AdminPersonActivityTab({
  t,
  i18nLanguage,
  type,
  person,
  metrics,
  recentGrades,
  recentAttendance,
  recentPayments,
  gradeStats,
  attendanceStats,
}) {
  return (
    <Card title={t('Faoliyat', { defaultValue: 'Faoliyat' })}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('Profil yaratilgan sana', { defaultValue: 'Profil yaratilgan sana' })}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatDate(person.createdAt || person.user?.createdAt, i18nLanguage)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('Jami hujjatlar', { defaultValue: 'Jami hujjatlar' })}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {person.documents?.length || 0} {t('ta', { defaultValue: 'ta' })}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('Jami baholar', { defaultValue: 'Jami baholar' })}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.totalGrades || 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('Jami davomat', { defaultValue: 'Jami davomat' })}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.totalAttendance || 0}</p>
        </div>
        {type === 'teacher' ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('Jadval yozuvlari', { defaultValue: 'Jadval yozuvlari' })}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.totalScheduleRows || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('Sinf soni', { defaultValue: 'Sinf soni' })}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.totalClassrooms || 0}</p>
            </div>
          </>
        ) : null}
        {type === 'student' ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("To'lovlar soni", { defaultValue: "To'lovlar soni" })}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.totalPayments || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('Qarz (oy/summa)', { defaultValue: 'Qarz (oy/summa)' })}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {metrics.debtMonths || 0} / {Number(metrics.debtAmount || 0).toLocaleString('uz-UZ')}
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t('Baho statistikasi', { defaultValue: 'Baho statistikasi' })}>
          <DataTable
            rows={gradeStats}
            emptyText={t("Baho statistikasi yo'q", { defaultValue: "Baho statistikasi yo'q" })}
            columns={[
              { key: 'turi', header: t('Turi', { defaultValue: 'Turi' }), render: (row) => row.turi || '-' },
              {
                key: 'count',
                header: t('Soni', { defaultValue: 'Soni' }),
                render: (row) => row?._count?._all || 0,
              },
              {
                key: 'avgPercent',
                header: t("O'rtacha %", { defaultValue: "O'rtacha %" }),
                render: (row) => {
                  const sumBall = Number(row?._sum?.ball || 0);
                  const sumMaxBall = Number(row?._sum?.maxBall || 0);
                  if (!sumMaxBall) return '0%';
                  return `${((sumBall / sumMaxBall) * 100).toFixed(1)}%`;
                },
              },
            ]}
          />
        </Card>

        <Card title={t('Davomat statistikasi', { defaultValue: 'Davomat statistikasi' })}>
          <DataTable
            rows={attendanceStats}
            emptyText={t("Davomat statistikasi yo'q", { defaultValue: "Davomat statistikasi yo'q" })}
            columns={[
              { key: 'holat', header: t('Holat', { defaultValue: 'Holat' }), render: (row) => row.holat || '-' },
              {
                key: 'count',
                header: t('Soni', { defaultValue: 'Soni' }),
                render: (row) => row?._count?._all || 0,
              },
            ]}
          />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card title={t("Oxirgi baholar", { defaultValue: "Oxirgi baholar" })}>
          <DataTable
            rows={recentGrades}
            emptyText={t("Baholar topilmadi", { defaultValue: "Baholar topilmadi" })}
            columns={[
              {
                key: 'sana',
                header: t('Sana', { defaultValue: 'Sana' }),
                render: (row) => formatDate(row.sana, i18nLanguage),
              },
              { key: 'turi', header: t('Turi', { defaultValue: 'Turi' }), render: (row) => row.turi || '-' },
              {
                key: 'fan',
                header: t('Fan', { defaultValue: 'Fan' }),
                render: (row) => row.darsJadvali?.fan?.name || '-',
              },
              {
                key: 'sinf',
                header: t('Sinf', { defaultValue: 'Sinf' }),
                render: (row) =>
                  row.darsJadvali?.sinf
                    ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
                    : '-',
              },
              {
                key: 'person',
                header:
                  type === 'teacher'
                    ? t("O'quvchi", { defaultValue: "O'quvchi" })
                    : t("O'qituvchi", { defaultValue: "O'qituvchi" }),
                render: (row) => {
                  const subjectPerson = type === 'teacher' ? row.student : row.teacher;
                  return subjectPerson
                    ? `${subjectPerson.firstName || ''} ${subjectPerson.lastName || ''}`.trim()
                    : '-';
                },
              },
              {
                key: 'ball',
                header: t('Ball', { defaultValue: 'Ball' }),
                render: (row) => `${row.ball ?? '-'}${row.maxBall ? `/${row.maxBall}` : ''}`,
              },
            ]}
          />
        </Card>

        <Card title={t("Oxirgi davomat yozuvlari", { defaultValue: "Oxirgi davomat yozuvlari" })}>
          <DataTable
            rows={recentAttendance}
            emptyText={t("Davomat yozuvlari topilmadi", { defaultValue: "Davomat yozuvlari topilmadi" })}
            columns={[
              {
                key: 'sana',
                header: t('Sana', { defaultValue: 'Sana' }),
                render: (row) => formatDate(row.sana, i18nLanguage),
              },
              { key: 'holat', header: t('Holat', { defaultValue: 'Holat' }), render: (row) => row.holat || '-' },
              {
                key: 'fan',
                header: t('Fan', { defaultValue: 'Fan' }),
                render: (row) => row.darsJadvali?.fan?.name || '-',
              },
              {
                key: 'sinf',
                header: t('Sinf', { defaultValue: 'Sinf' }),
                render: (row) =>
                  row.darsJadvali?.sinf
                    ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
                    : '-',
              },
              {
                key: 'vaqt',
                header: t('Vaqt', { defaultValue: 'Vaqt' }),
                render: (row) =>
                  row.darsJadvali?.vaqtOraliq
                    ? `${formatScheduleSlotLabel(row.darsJadvali.vaqtOraliq.nomi, i18nLanguage)} (${row.darsJadvali.vaqtOraliq.boshlanishVaqti})`
                    : '-',
              },
              {
                key: 'teacher',
                header: t("O'qituvchi", { defaultValue: "O'qituvchi" }),
                render: (row) => {
                  const teacher = row.darsJadvali?.oqituvchi;
                  return teacher ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() : '-';
                },
              },
            ]}
          />
        </Card>

        {type === 'student' ? (
          <Card title={t("Oxirgi to'lovlar", { defaultValue: "Oxirgi to'lovlar" })}>
            <DataTable
              rows={recentPayments}
              emptyText={t("To'lovlar topilmadi", { defaultValue: "To'lovlar topilmadi" })}
              columns={[
                {
                  key: 'tolovSana',
                  header: t('Sana', { defaultValue: 'Sana' }),
                  render: (row) => formatDateTime(row.tolovSana || row.createdAt, i18nLanguage),
                },
                { key: 'turi', header: t('Turi', { defaultValue: 'Turi' }), render: (row) => row.turi || '-' },
                { key: 'holat', header: t('Holat', { defaultValue: 'Holat' }), render: (row) => row.holat || '-' },
                {
                  key: 'summa',
                  header: t('Summa', { defaultValue: 'Summa' }),
                  render: (row) => Number(row.summa || 0).toLocaleString('uz-UZ'),
                },
                {
                  key: 'qoplamalar',
                  header: t('Qoplangan oylar', { defaultValue: 'Qoplangan oylar' }),
                  render: (row) =>
                    (row.qoplamalar || [])
                      .map((coverage) => `${coverage.yil}-${String(coverage.oy).padStart(2, '0')}`)
                      .join(', ') || '-',
                },
              ]}
            />
          </Card>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">
          {type === 'teacher'
            ? t("O'quvchilar ro'yxati", { defaultValue: "O'quvchilar ro'yxati" })
            : t("Sinfdoshlar ro'yxati", { defaultValue: "Sinfdoshlar ro'yxati" })}
        </p>
        <DataTable
          rows={person.studentsList || []}
          stickyFirstColumn
          emptyText={t("Studentlar ro'yxati topilmadi", {
            defaultValue: "Studentlar ro'yxati topilmadi",
          })}
          columns={[
            {
              key: 'fullName',
              header: t('F.I.SH', { defaultValue: 'F.I.SH' }),
              render: (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || '-',
            },
            {
              key: 'username',
              header: t('Username', { defaultValue: 'Username' }),
              render: (row) => row.user?.username || '-',
            },
            {
              key: 'phone',
              header: t('Telefon', { defaultValue: 'Telefon' }),
              render: (row) => row.user?.phone || '-',
            },
            {
              key: 'classroom',
              header: t('Sinf', { defaultValue: 'Sinf' }),
              render: (row) =>
                row.enrollments?.[0]?.classroom
                  ? `${row.enrollments[0].classroom.name} (${row.enrollments[0].classroom.academicYear})`
                  : '-',
            },
          ]}
        />
      </div>
    </Card>
  );
}
