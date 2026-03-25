import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StateView } from '../../components/ui';
import { useGetTeacherProfileQuery } from '../../services/api/teacherApi';

function percentFormat(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function taskToneClass(value) {
  return value > 0
    ? 'bg-amber-100 text-amber-800 ring-amber-200'
    : 'bg-emerald-100 text-emerald-800 ring-emerald-200';
}

export default function TeacherHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profileQuery = useGetTeacherProfileQuery();
  const profile = profileQuery.data?.profile || null;
  const loading = profileQuery.isLoading || profileQuery.isFetching;
  const error = profileQuery.error?.message || '';

  const dashboard = profile?.dashboard || {};
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';
  const panelCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';
  const itemRowClass =
    'flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2';
  const itemButtonClass = `${itemRowClass} w-full text-left transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:ring-1 hover:ring-indigo-100`;

  function openRecentAttendance(item) {
    if (!item?.darsId || !item?.sana) return;
    const nextSearch = new URLSearchParams({
      sana: item.sana,
      darsId: item.darsId,
    });
    navigate(`/teacher/davomat?${nextSearch.toString()}`);
  }

  function openRecentGrade(item) {
    if (!item?.sana) return;
    const nextSearch = new URLSearchParams({
      sana: item.sana,
      ...(item.turi ? { bahoTuri: item.turi } : {}),
      ...(item.classroomId ? { classroomId: item.classroomId } : {}),
    });
    navigate(`/teacher/baholar?${nextSearch.toString()}`);
  }

  function openLessonJournal(item) {
    if (!item?.darsId || !item?.sana) return;
    const nextSearch = new URLSearchParams({
      sana: item.sana,
      darsId: item.darsId,
    });
    navigate(`/teacher/davomat?${nextSearch.toString()}`);
  }

  function openNextLesson(item) {
    if (!item) return;
    if (item.sana === dashboard?.sana) {
      openLessonJournal(item);
      return;
    }
    navigate('/teacher/jadval');
  }

  return (
    <Card title={t('Teacher panel')} subtitle={t("Bu bo'limda o'qituvchi uchun qisqa statistikalar ko'rsatiladi.")}>
      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && (
        <>
          <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Bugungi darslar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {dashboard.bugungiDarslarSoni || 0}
              </p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Haftalik darslar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {dashboard.haftalikDarslarSoni || 0}
              </p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Biriktirilgan sinflar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {dashboard.biriktirilganSinflarSoni || 0}
              </p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Davomat (7 kun)')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {percentFormat(dashboard?.davomat7Kun?.foiz || 0)}
              </p>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t('Keyingi dars')}</p>
              {dashboard?.keyingiDars ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {dashboard.keyingiDars.sinf} / {dashboard.keyingiDars.fan}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {dashboard.keyingiDars.sana} | {dashboard.keyingiDars.vaqt}
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                        {dashboard.keyingiDars.holat === 'ONGOING'
                          ? t('Hozir davom etmoqda')
                          : t('Keyingi navbat')}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <p className="text-xs text-slate-500">{t("O'quvchilar")}</p>
                        <p className="font-semibold text-slate-900">{dashboard.keyingiDars.studentlarSoni}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <p className="text-xs text-slate-500">{t('Davomat belgilangan')}</p>
                        <p className="font-semibold text-slate-900">{dashboard.keyingiDars.belgilanganDavomatSoni || 0}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <p className="text-xs text-slate-500">{t('Kutilayotgan')}</p>
                        <p className="font-semibold text-slate-900">{dashboard.keyingiDars.pendingDavomatSoni || 0}</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="indigo" onClick={() => openNextLesson(dashboard.keyingiDars)}>
                    {dashboard.keyingiDars.sana === dashboard?.sana
                      ? t('Davomatni ochish')
                      : t("Jadvalni ko'rish")}
                  </Button>
                </div>
              ) : (
                <StateView type="empty" description={t("Yaqin dars topilmadi")} />
              )}
            </div>

            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t('Bugungi vazifalar')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">{t('Jami darslar')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {dashboard?.bugungiVazifalar?.jamiDarslar || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">{t('Boshlangan darslar')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {dashboard?.bugungiVazifalar?.boshlanganDarslar || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">{t('Davomat kutilmoqda')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {dashboard?.bugungiVazifalar?.davomatKutilayotganlar || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs text-slate-500">{t('Bugungi baholar')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {dashboard?.bugungiVazifalar?.bugungiBaholarSoni || 0}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${taskToneClass(
                    Number(dashboard?.bugungiVazifalar?.davomatKutilayotganlar || 0),
                  )}`}
                >
                  {t('Davomat yakunlangan')}: {dashboard?.bugungiVazifalar?.davomatYakunlanganlar || 0}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {t('Keyinroq keladigan darslar')}: {dashboard?.bugungiVazifalar?.kelayotganDarslar || 0}
                </span>
              </div>
              <div className="mt-3">
                {dashboard?.bugungiVazifalar?.primaryLesson ? (
                  <Button variant="secondary" onClick={() => openLessonJournal(dashboard.bugungiVazifalar.primaryLesson)}>
                    {dashboard.bugungiVazifalar.davomatKutilayotganlar > 0
                      ? t("Kutilayotgan davomatni ochish")
                      : t("Keyingi bugungi darsni ochish")}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => navigate('/teacher/jadval')}>
                    {t("Jadvalni ko'rish")}
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t('Oxirgi davomat sessiyalari')}</p>
              {dashboard?.oxirgiSessiyalar?.length ? (
                <div className="space-y-2 text-sm">
                  {dashboard.oxirgiSessiyalar.map((item) => (
                    <button key={item.id} type="button" className={itemButtonClass} onClick={() => openRecentAttendance(item)}>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {item.sinf} / {item.fan}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.sana} | {item.vaqt || '-'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {item.studentlarSoni} {t('ta')}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600">
                          {t('Ochish', { defaultValue: 'Ochish' })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('Davomat tarixi topilmadi')}</p>
              )}
            </div>

            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t('Oxirgi baholar')}</p>
              {dashboard?.oxirgiBaholar?.length ? (
                <div className="space-y-2 text-sm">
                  {dashboard.oxirgiBaholar.map((item) => (
                    <button key={item.id} type="button" className={itemButtonClass} onClick={() => openRecentGrade(item)}>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {item.student} ({item.fan})
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.sana} | {t(item.turi, { defaultValue: item.turi })} | {item.sinf}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {item.ball}/{item.maxBall}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600">
                          {t("Ko'rish", { defaultValue: "Ko'rish" })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('Baho tarixi topilmadi')}</p>
              )}
            </div>
          </section>

          <div className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-700 ring-1 ring-slate-200/50">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <p>
                <span className="text-slate-500">{t('Fan')}:</span> <b>{profile?.subject?.name || '-'}</b>
              </p>
              <p>
                <span className="text-slate-500">{t('Telefon')}:</span> <b>{profile?.phone || '-'}</b>
              </p>
            </div>
            <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
              {t('Oxirgi yangilanish')}: {dashboard?.sana || '-'}
            </p>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="indigo" onClick={() => navigate('/teacher/jadval')}>
          {t('Mening dars jadvalim')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/teacher/davomat')}>
          {t('Davomat jurnali')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/teacher/baholar')}>
          {t('Baholar')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/teacher/oyliklar')}>
          {t('Oyliklar')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/teacher/sozlamalar')}>
          {t('Sozlamalar')}
        </Button>
      </div>
    </Card>
  );
}
