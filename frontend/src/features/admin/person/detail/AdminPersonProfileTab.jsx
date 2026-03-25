import { Button, Card, DataTable, Input } from '../../../../components/ui';
import { formatDate } from './adminPersonDetailModel';

export default function AdminPersonProfileTab({
  t,
  i18nLanguage,
  type,
  person,
  avatarUrl,
  actionLoading,
  onAvatarFileChange,
  onUploadAvatar,
  onDeleteAvatar,
  onResetPassword,
  isArchived,
  enrollmentHistory,
  teachingClassrooms,
}) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <h4 className="mb-2 text-sm font-semibold text-slate-800">
          {t('Avatar', { defaultValue: 'Avatar' })}
        </h4>
        <div className="mb-3 h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t('Avatar', { defaultValue: 'Avatar' })}
              className="h-full w-full object-contain bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              {t('Avatar yo`q', { defaultValue: 'Avatar yo`q' })}
            </div>
          )}
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => onAvatarFileChange(event.target.files?.[0] || null)}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        <div className="mt-3 flex gap-2">
          <Button onClick={onUploadAvatar} disabled={actionLoading} size="sm" variant="indigo">
            {t('Avatar yuklash', { defaultValue: 'Avatar yuklash' })}
          </Button>
          <Button onClick={onDeleteAvatar} disabled={actionLoading} size="sm" variant="danger">
            {t('Avatar o`chirish', { defaultValue: 'Avatar o`chirish' })}
          </Button>
        </div>
      </Card>

      <Card
        className="lg:col-span-2"
        title={t("Profil ma'lumotlari", { defaultValue: "Profil ma'lumotlari" })}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <p>
            <span className="font-semibold">{t('Username', { defaultValue: 'Username' })}:</span>{' '}
            {person.user?.username || '-'}
          </p>
          <div className="md:col-span-1">
            <Button size="sm" variant="indigo" onClick={onResetPassword} disabled={actionLoading}>
              {t('Parolni yangilash', { defaultValue: 'Parolni yangilash' })}
            </Button>
          </div>
          <p>
            <span className="font-semibold">{t('Holati', { defaultValue: 'Holati' })}:</span>{' '}
            <span className={isArchived ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
              {isArchived
                ? t('Arxivlangan', { defaultValue: 'Arxivlangan' })
                : t('Aktiv', { defaultValue: 'Aktiv' })}
            </span>
          </p>
          <p>
            <span className="font-semibold">{t('Telefon', { defaultValue: 'Telefon' })}:</span>{' '}
            {person.user?.phone || '-'}
          </p>
          <p>
            <span className="font-semibold">{t('Yashash manzili', { defaultValue: 'Yashash manzili' })}:</span>{' '}
            {person.yashashManzili || '-'}
          </p>
          <p>
            <span className="font-semibold">{t('Tug`ilgan sana', { defaultValue: 'Tug`ilgan sana' })}:</span>{' '}
            {formatDate(person.birthDate, i18nLanguage)}
          </p>
          {type === 'teacher' ? (
            <p>
              <span className="font-semibold">{t('Fan', { defaultValue: 'Fan' })}:</span>{' '}
              {person.subject?.name || '-'}
            </p>
          ) : null}
          {type === 'student' ? (
            <>
              <p>
                <span className="font-semibold">{t('Sinf', { defaultValue: 'Sinf' })}:</span>{' '}
                {person.enrollments?.[0]?.classroom
                  ? `${person.enrollments[0].classroom.name} (${person.enrollments[0].classroom.academicYear})`
                  : '-'}
              </p>
              <p>
                <span className="font-semibold">{t('Ota-ona telefoni', { defaultValue: 'Ota-ona telefoni' })}:</span>{' '}
                {person.parentPhone || '-'}
              </p>
            </>
          ) : null}
        </div>
      </Card>

      {type === 'student' ? (
        <Card
          className="lg:col-span-3"
          title={t('Sinf tarixi', { defaultValue: 'Sinf tarixi' })}
          subtitle={t("Studentning barcha enrollment yozuvlari", {
            defaultValue: "Studentning barcha enrollment yozuvlari",
          })}
        >
          <DataTable
            rows={enrollmentHistory}
            emptyText={t("Sinf tarixi topilmadi", { defaultValue: "Sinf tarixi topilmadi" })}
            columns={[
              {
                key: 'classroom',
                header: t('Sinf', { defaultValue: 'Sinf' }),
                render: (row) =>
                  row.classroom ? `${row.classroom.name} (${row.classroom.academicYear})` : '-',
              },
              {
                key: 'status',
                header: t('Holat', { defaultValue: 'Holat' }),
                render: (row) =>
                  row.isActive
                    ? t('Aktiv', { defaultValue: 'Aktiv' })
                    : t('Yopilgan', { defaultValue: 'Yopilgan' }),
              },
              {
                key: 'startDate',
                header: t('Boshlangan', { defaultValue: 'Boshlangan' }),
                render: (row) => formatDate(row.startDate, i18nLanguage),
              },
              {
                key: 'endDate',
                header: t('Tugagan', { defaultValue: 'Tugagan' }),
                render: (row) => formatDate(row.endDate, i18nLanguage),
              },
            ]}
          />
        </Card>
      ) : null}

      {type === 'teacher' ? (
        <Card
          className="lg:col-span-3"
          title={t("Biriktirilgan sinflar", { defaultValue: "Biriktirilgan sinflar" })}
          subtitle={t("Teacher dars bergan sinflar ro'yxati", {
            defaultValue: "Teacher dars bergan sinflar ro'yxati",
          })}
        >
          <DataTable
            rows={teachingClassrooms}
            emptyText={t("Sinf ma'lumotlari topilmadi", {
              defaultValue: "Sinf ma'lumotlari topilmadi",
            })}
            columns={[
              {
                key: 'name',
                header: t('Sinf', { defaultValue: 'Sinf' }),
                render: (row) => row.name || '-',
              },
              {
                key: 'academicYear',
                header: t("O'quv yili", { defaultValue: "O'quv yili" }),
                render: (row) => row.academicYear || '-',
              },
            ]}
          />
        </Card>
      ) : null}
    </section>
  );
}
