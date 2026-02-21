import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Modal, Select } from '../../../components/ui';

const HAFTA_KUNLARI = ['DUSHANBA', 'SESHANBA', 'CHORSHANBA', 'PAYSHANBA', 'JUMA', 'SHANBA'];
const JADVAL_MENU = [
  { key: 'HAFTALIK', labelKey: 'Haftalik jadval' },
  { key: 'DARS_QOSHISH', labelKey: "Dars qo'shish" },
  { key: 'VAQT_QOSHISH', labelKey: "Vaqt oralig'i qo'shish" },
  { key: 'VAQT_LIST', labelKey: "Vaqtlar ro'yxati" },
  { key: 'FAN_RANG', labelKey: 'Fan ranglari' },
];
const HAFTA_KUNI_LABEL = {
  DUSHANBA: 'Dushanba',
  SESHANBA: 'Seshanba',
  CHORSHANBA: 'Chorshanba',
  PAYSHANBA: 'Payshanba',
  JUMA: 'Juma',
  SHANBA: 'Shanba',
};

function fanRangi(fanNomi) {
  const palitra = [
    'bg-sky-50 border-sky-200 text-sky-800',
    'bg-emerald-50 border-emerald-200 text-emerald-800',
    'bg-amber-50 border-amber-200 text-amber-800',
    'bg-rose-50 border-rose-200 text-rose-800',
    'bg-violet-50 border-violet-200 text-violet-800',
    'bg-cyan-50 border-cyan-200 text-cyan-800',
  ];
  if (!fanNomi) return palitra[0];
  const sum = [...fanNomi].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palitra[sum % palitra.length];
}

export default function DarsJadvaliManager({
  actionLoading,
  classrooms,
  subjects,
  teachers,
  vaqtOraliqlari,
  darslar,
  darslarLoading,
  onCreateVaqtOraliq,
  onDeleteVaqtOraliq,
  onCreateDars,
  onDeleteDars,
  onMoveDars,
}) {
  const { t } = useTranslation();
  const [vaqtForm, setVaqtForm] = useState({
    nomi: '',
    boshlanishVaqti: '08:30',
    tugashVaqti: '09:15',
    tartib: 1,
  });
  const [darsForm, setDarsForm] = useState({
    sinfId: classrooms[0]?.id || '',
    oqituvchiId: teachers[0]?.id || '',
    fanId: subjects[0]?.id || '',
    haftaKuni: HAFTA_KUNLARI[0],
    vaqtOraliqId: vaqtOraliqlari[0]?.id || '',
    oquvYili: '2025-2026',
  });
  const [gridSinfId, setGridSinfId] = useState('');
  const [gridOquvYili, setGridOquvYili] = useState('2025-2026');
  const [dragDarsId, setDragDarsId] = useState(null);
  const [tezQoshish, setTezQoshish] = useState(null);
  const [tezQoshishJoylashuv, setTezQoshishJoylashuv] = useState(null);
  const [tezQoshishOqituvchiId, setTezQoshishOqituvchiId] = useState('');
  const [tezQoshishFanId, setTezQoshishFanId] = useState('');
  const [jadvalXatolik, setJadvalXatolik] = useState(null);
  const [jadvalMenu, setJadvalMenu] = useState('HAFTALIK');
  const tezQoshishRef = useRef(null);

  const tanlanganSinfId = darsForm.sinfId || classrooms[0]?.id || '';
  const tanlanganFanId = darsForm.fanId || subjects[0]?.id || '';
  const tanlanganVaqtOraliqId = darsForm.vaqtOraliqId || vaqtOraliqlari[0]?.id || '';
  const tanlanganGridSinfId = gridSinfId || classrooms[0]?.id || '';

  const fanBoyichaOqituvchilar = useMemo(
    () => teachers.filter((teacher) => teacher.subject?.id === tanlanganFanId),
    [teachers, tanlanganFanId],
  );

  const tanlanganOqituvchiId = fanBoyichaOqituvchilar.some((teacher) => teacher.id === darsForm.oqituvchiId)
    ? darsForm.oqituvchiId
    : fanBoyichaOqituvchilar[0]?.id || '';

  const tezTanlanganFanId = tezQoshishFanId || tanlanganFanId || subjects[0]?.id || '';
  const tezFanBoyichaOqituvchilar = useMemo(
    () => teachers.filter((teacher) => teacher.subject?.id === tezTanlanganFanId),
    [teachers, tezTanlanganFanId],
  );

  const tanlanganTezOqituvchiId = tezFanBoyichaOqituvchilar.some(
    (teacher) => teacher.id === tezQoshishOqituvchiId,
  )
    ? tezQoshishOqituvchiId
    : tezFanBoyichaOqituvchilar[0]?.id || '';

  const saralanganVaqtlar = [...vaqtOraliqlari].sort((a, b) => a.tartib - b.tartib);
  const gridDarslar = darslar.filter(
    (dars) => dars.sinfId === tanlanganGridSinfId && dars.oquvYili === gridOquvYili,
  );
  const gridMap = new Map();
  for (const dars of gridDarslar) {
    gridMap.set(`${dars.haftaKuni}__${dars.vaqtOraliqId}`, dars);
  }

  function openTezQoshish(event, haftaKuni, vaqtOraliqId) {
    const rect = event.currentTarget.getBoundingClientRect();
    const panelWidth = 420;
    const panelHeight = 230;
    const spaceRight = window.innerWidth - rect.right;
    const left = spaceRight > panelWidth + 12
      ? rect.right + 8
      : Math.max(12, rect.left - panelWidth - 8);
    const top = Math.min(
      Math.max(12, rect.top),
      Math.max(12, window.innerHeight - panelHeight - 12),
    );

    setTezQoshish({ haftaKuni, vaqtOraliqId });
    setTezQoshishJoylashuv({ top, left });
    setTezQoshishFanId(tanlanganFanId || subjects[0]?.id || '');
    setTezQoshishOqituvchiId('');
  }

  async function handleVaqtSubmit(event) {
    event.preventDefault();
    const ok = await onCreateVaqtOraliq({ ...vaqtForm, tartib: Number(vaqtForm.tartib) });
    if (ok) setVaqtForm((prev) => ({ ...prev, nomi: '', tartib: prev.tartib + 1 }));
  }

  async function handleDarsSubmit(event) {
    event.preventDefault();
    const result = await onCreateDars({
      ...darsForm,
      sinfId: tanlanganSinfId,
      oqituvchiId: tanlanganOqituvchiId,
      fanId: tanlanganFanId,
      vaqtOraliqId: tanlanganVaqtOraliqId,
    });

    if (result?.isConflict) {
      setJadvalXatolik({
        title: t("Dars vaqti to'qnashuvi", { defaultValue: "Dars vaqti to'qnashuvi" }),
        message:
          result.message ||
          t(
            "Tanlangan vaqt oralig'ida sinf yoki o'qituvchi allaqachon band. Boshqa vaqt yoki boshqa o'qituvchini tanlang.",
            {
              defaultValue:
                "Tanlangan vaqt oralig'ida sinf yoki o'qituvchi allaqachon band. Boshqa vaqt yoki boshqa o'qituvchini tanlang.",
            },
          ),
      });
    }
  }

  async function handleTezQoshishSubmit(event) {
    event.preventDefault();
    if (!tezQoshish) return;

    const result = await onCreateDars({
      sinfId: tanlanganGridSinfId,
      oqituvchiId: tanlanganTezOqituvchiId,
      fanId: tezTanlanganFanId,
      haftaKuni: tezQoshish.haftaKuni,
      vaqtOraliqId: tezQoshish.vaqtOraliqId,
      oquvYili: gridOquvYili,
    });

    if (result?.ok) {
      setTezQoshish(null);
      setTezQoshishJoylashuv(null);
      setTezQoshishOqituvchiId('');
      setTezQoshishFanId('');
    } else if (result?.isConflict) {
      setJadvalXatolik({
        title: t("Dars vaqti to'qnashuvi", { defaultValue: "Dars vaqti to'qnashuvi" }),
        message:
          result.message ||
          t("Bu katakka dars qo'shib bo'lmadi, chunki vaqt oralig'i band.", {
            defaultValue: "Bu katakka dars qo'shib bo'lmadi, chunki vaqt oralig'i band.",
          }),
      });
    }
  }

  async function handleDropDars(targetHaftaKuni, targetVaqtOraliqId) {
    if (!dragDarsId) return;
    const result = await onMoveDars(dragDarsId, {
      haftaKuni: targetHaftaKuni,
      vaqtOraliqId: targetVaqtOraliqId,
      sinfId: tanlanganGridSinfId,
      oquvYili: gridOquvYili,
    });
    if (result?.ok) {
      setDragDarsId(null);
    } else if (result?.isConflict) {
      setJadvalXatolik({
        title: t("Ko'chirishda to'qnashuv", { defaultValue: "Ko'chirishda to'qnashuv" }),
        message:
          result.message ||
          t("Darsni bu slotga ko'chirib bo'lmaydi: shu vaqtda boshqa dars mavjud.", {
            defaultValue: "Darsni bu slotga ko'chirib bo'lmaydi: shu vaqtda boshqa dars mavjud.",
          }),
      });
    }
  }

  useEffect(() => {
    if (!tezQoshish) return;
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setTezQoshish(null);
        setTezQoshishJoylashuv(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tezQoshish]);

  function handleExportPdf() {
    const sinfNomi = classrooms.find((classroom) => classroom.id === tanlanganGridSinfId)?.name || '';
    const pdfTitle = t('{{classroom}} sinf dars jadvali', {
      classroom: sinfNomi,
      defaultValue: `${sinfNomi} sinf dars jadvali`,
    });
    const pdfAcademicYear = `${gridOquvYili} ${t("O'quv yili", { defaultValue: "O'quv yili" })}`;
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;

    const rows = saralanganVaqtlar
      .map((vaqt) => {
        const cols = HAFTA_KUNLARI.map((kun) => {
          const dars = gridMap.get(`${kun}__${vaqt.id}`);
          const body = dars
            ? `${dars.fan?.name || ''}<br/><small>${dars.oqituvchi?.firstName || ''} ${dars.oqituvchi?.lastName || ''}</small>`
            : `<span style='color:#9ca3af'>${t("Bo'sh", { defaultValue: "Bo'sh" })}</span>`;
          return `<td style="border:1px solid #e2e8f0;padding:8px;vertical-align:top;">${body}</td>`;
        }).join('');
        return `<tr><td style="border:1px solid #e2e8f0;padding:8px;"><b>${vaqt.nomi}</b><br/><small>${vaqt.boshlanishVaqti}-${vaqt.tugashVaqti}</small></td>${cols}</tr>`;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${t('Dars Jadvali', { defaultValue: 'Dars Jadvali' })}</title>
          <style>
            body{font-family:Arial,sans-serif;padding:18px;color:#0f172a}
            h2{margin:0 0 4px}
            table{width:100%;border-collapse:collapse;font-size:12px}
            th{background:#0f172a;color:white;border:1px solid #e2e8f0;padding:8px;text-align:left}
          </style>
        </head>
        <body>
          <h2>${pdfTitle}</h2>
          <p>${pdfAcademicYear}</p>
          <table>
            <thead>
              <tr>
                <th>${t('Vaqt', { defaultValue: 'Vaqt' })}</th>
                ${HAFTA_KUNLARI.map((kun) => `<th>${t(HAFTA_KUNI_LABEL[kun], { defaultValue: HAFTA_KUNI_LABEL[kun] })}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <Card title={t("Dars jadvali boshqaruvi", { defaultValue: "Dars jadvali boshqaruvi" })}>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <div className="flex flex-wrap gap-2">
          {JADVAL_MENU.map((item) => (
            <Button
              key={item.key}
              type="button"
              size="sm"
              variant={jadvalMenu === item.key ? 'indigo' : 'secondary'}
              onClick={() => setJadvalMenu(item.key)}
            >
              {t(item.labelKey, { defaultValue: item.labelKey })}
            </Button>
          ))}
        </div>
      </div>

      {jadvalMenu === 'FAN_RANG' && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            {t('Fan ranglari (legend)', { defaultValue: 'Fan ranglari (legend)' })}
          </p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <span
                key={subject.id}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${fanRangi(subject.name)}`}
              >
                {subject.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {jadvalMenu === 'VAQT_QOSHISH' && (
        <form onSubmit={handleVaqtSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-700">
            {t("Vaqt oralig'i qo'shish", { defaultValue: "Vaqt oralig'i qo'shish" })}
          </p>
          <label className="block text-xs font-medium text-slate-600">
            {t("Vaqt oralig'i nomi", { defaultValue: "Vaqt oralig'i nomi" })}
          </label>
          <Input
            type="text"
            placeholder={t('Nomi (1-para)', { defaultValue: 'Nomi (1-para)' })}
            value={vaqtForm.nomi}
            onChange={(event) => setVaqtForm((prev) => ({ ...prev, nomi: event.target.value }))}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t('Boshlanish vaqti', { defaultValue: 'Boshlanish vaqti' })}
              </label>
              <Input
                type="time"
                value={vaqtForm.boshlanishVaqti}
                onChange={(event) => setVaqtForm((prev) => ({ ...prev, boshlanishVaqti: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t('Tugash vaqti', { defaultValue: 'Tugash vaqti' })}
              </label>
              <Input
                type="time"
                value={vaqtForm.tugashVaqti}
                onChange={(event) => setVaqtForm((prev) => ({ ...prev, tugashVaqti: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t('Tartib raqami', { defaultValue: 'Tartib raqami' })}
              </label>
              <Input
                type="number"
                min={1}
                value={vaqtForm.tartib}
                onChange={(event) => setVaqtForm((prev) => ({ ...prev, tartib: event.target.value }))}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={actionLoading} variant="success">
            {t("Vaqt oralig'ini saqlash", { defaultValue: "Vaqt oralig'ini saqlash" })}
          </Button>
        </form>
      )}

      {jadvalMenu === 'DARS_QOSHISH' && (
        <form onSubmit={handleDarsSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-700">
            {t("Dars jadvaliga dars qo'shish", { defaultValue: "Dars jadvaliga dars qo'shish" })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t('Sinf', { defaultValue: 'Sinf' })}
              </label>
              <Select
                value={tanlanganSinfId}
                onChange={(event) => setDarsForm((prev) => ({ ...prev, sinfId: event.target.value }))}
                required
              >
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} ({classroom.academicYear})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t("O'qituvchi", { defaultValue: "O'qituvchi" })}
              </label>
              <Select
                value={tanlanganOqituvchiId}
                onChange={(event) => setDarsForm((prev) => ({ ...prev, oqituvchiId: event.target.value }))}
                required
              >
                {fanBoyichaOqituvchilar.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t('Fan', { defaultValue: 'Fan' })}
              </label>
              <Select
                value={tanlanganFanId}
                onChange={(event) => setDarsForm((prev) => ({ ...prev, fanId: event.target.value }))}
                required
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t('Hafta kuni', { defaultValue: 'Hafta kuni' })}
              </label>
              <Select
                value={darsForm.haftaKuni}
                onChange={(event) => setDarsForm((prev) => ({ ...prev, haftaKuni: event.target.value }))}
                required
              >
                {HAFTA_KUNLARI.map((kun) => (
                  <option key={kun} value={kun}>
                    {t(HAFTA_KUNI_LABEL[kun], { defaultValue: HAFTA_KUNI_LABEL[kun] })}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t("Vaqt oralig'i", { defaultValue: "Vaqt oralig'i" })}
              </label>
              <Select
                value={tanlanganVaqtOraliqId}
                onChange={(event) => setDarsForm((prev) => ({ ...prev, vaqtOraliqId: event.target.value }))}
                required
              >
                {vaqtOraliqlari.map((vaqt) => (
                  <option key={vaqt.id} value={vaqt.id}>
                    {vaqt.nomi} ({vaqt.boshlanishVaqti}-{vaqt.tugashVaqti})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {t("O'quv yili", { defaultValue: "O'quv yili" })}
              </label>
              <Input
                type="text"
                value={darsForm.oquvYili}
                onChange={(event) => setDarsForm((prev) => ({ ...prev, oquvYili: event.target.value }))}
                placeholder={t('Masalan: 2025-2026', { defaultValue: 'Masalan: 2025-2026' })}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={
              actionLoading ||
              !classrooms.length ||
              !fanBoyichaOqituvchilar.length ||
              !subjects.length ||
              !vaqtOraliqlari.length
            }
            variant="indigo"
          >
            {t("Darsni jadvalga qo'shish", { defaultValue: "Darsni jadvalga qo'shish" })}
          </Button>
          {!fanBoyichaOqituvchilar.length && (
            <p className="text-xs text-rose-600">
              {t("Bu fan uchun o'qituvchi topilmadi. Avval shu fan o'qituvchisini yarating.", {
                defaultValue: "Bu fan uchun o'qituvchi topilmadi. Avval shu fan o'qituvchisini yarating.",
              })}
            </p>
          )}
        </form>
      )}

      {jadvalMenu === 'VAQT_LIST' && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            {t("Vaqt oraliqlari ro'yxati", { defaultValue: "Vaqt oraliqlari ro'yxati" })}
          </p>
          <div className="max-h-52 overflow-auto">
            <table className="min-w-full text-sm">
              <tbody>
                {vaqtOraliqlari.map((vaqt) => (
                  <tr key={vaqt.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{vaqt.tartib}. {vaqt.nomi}</td>
                    <td className="px-2 py-2">{vaqt.boshlanishVaqti}-{vaqt.tugashVaqti}</td>
                    <td className="px-2 py-2 text-right">
                      <Button size="sm" variant="danger" onClick={() => onDeleteVaqtOraliq(vaqt.id)}>
                        {t("O'chirish", { defaultValue: "O'chirish" })}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {jadvalMenu === 'HAFTALIK' && (
        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {t("Haftalik jadval ko'rinishi", { defaultValue: "Haftalik jadval ko'rinishi" })}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  {t('Sinfni tanlang', { defaultValue: 'Sinfni tanlang' })}
                </label>
                <Select value={tanlanganGridSinfId} onChange={(event) => setGridSinfId(event.target.value)}>
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  {t("O'quv yili filtri", { defaultValue: "O'quv yili filtri" })}
                </label>
                <Input
                  type="text"
                  value={gridOquvYili}
                  onChange={(event) => setGridOquvYili(event.target.value)}
                  placeholder={t('Masalan: 2025-2026', { defaultValue: 'Masalan: 2025-2026' })}
                />
              </div>
              <Button onClick={handleExportPdf} size="sm">
                {t('PDF export', { defaultValue: 'PDF export' })}
              </Button>
            </div>
          </div>

          {darslarLoading ? (
            <p className="text-sm text-slate-500">{t('Yuklanmoqda...', { defaultValue: 'Yuklanmoqda...' })}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 lg:overflow-x-visible">
              <table className="w-full table-fixed text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">{t('Vaqt', { defaultValue: 'Vaqt' })}</th>
                    {HAFTA_KUNLARI.map((kun) => (
                      <th key={kun} className="px-2 py-2 text-left">
                        {t(HAFTA_KUNI_LABEL[kun], { defaultValue: HAFTA_KUNI_LABEL[kun] })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saralanganVaqtlar.map((vaqt) => (
                    <tr key={vaqt.id} className="border-b border-slate-100 align-top">
                      <td className="w-28 px-2 py-2 text-slate-700">
                        <p className="font-semibold">{vaqt.nomi}</p>
                        <p className="text-[11px] text-slate-500">
                          {vaqt.boshlanishVaqti} - {vaqt.tugashVaqti}
                        </p>
                      </td>
                      {HAFTA_KUNLARI.map((kun) => {
                        const dars = gridMap.get(`${kun}__${vaqt.id}`);
                        return (
                          <td
                            key={`${kun}-${vaqt.id}`}
                            className="group px-2 py-2"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleDropDars(kun, vaqt.id)}
                            onClick={(event) => {
                              if (!dars) openTezQoshish(event, kun, vaqt.id);
                            }}
                          >
                            {dars ? (
                              <div
                                draggable
                                onDragStart={() => setDragDarsId(dars.id)}
                                className={`cursor-move rounded-md border p-2 ${fanRangi(dars.fan?.name)}`}
                                title={t("Boshqa katakka sudrab ko'chiring", {
                                  defaultValue: "Boshqa katakka sudrab ko'chiring",
                                })}
                              >
                                <p className="truncate font-semibold">{dars.fan?.name}</p>
                                <p className="truncate text-[11px]">
                                  {dars.oqituvchi?.firstName} {dars.oqituvchi?.lastName}
                                </p>
                                <div className="mt-2 hidden group-hover:block">
                                  <Button onClick={() => onDeleteDars(dars.id)} size="sm" variant="danger">
                                    {t("O'chirish", { defaultValue: "O'chirish" })}
                                  </Button>
                                </div>
                                <p className="mt-1 hidden text-[10px] text-slate-600 group-hover:block">
                                  {t("Quick: sudrab boshqa slotga ko'chiring", {
                                    defaultValue: "Quick: sudrab boshqa slotga ko'chiring",
                                  })}
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-400">
                                <p>{t("Bo'sh slot", { defaultValue: "Bo'sh slot" })}</p>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="mt-1 hidden group-hover:inline-flex"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTezQoshish(event, kun, vaqt.id);
                                  }}
                                >
                                  {t("+ Tez qo'shish", { defaultValue: "+ Tez qo'shish" })}
                                </Button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tezQoshish && tezQoshishJoylashuv && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/10"
            onClick={() => {
              setTezQoshish(null);
              setTezQoshishJoylashuv(null);
            }}
          />
          <div
            ref={tezQoshishRef}
            className="fixed z-50 w-[420px] max-w-[calc(100vw-24px)] rounded-lg border border-indigo-200 bg-white p-3 shadow-xl"
            style={{ top: tezQoshishJoylashuv.top, left: tezQoshishJoylashuv.left }}
          >
            <p className="text-sm font-semibold text-indigo-900">
              {t("Tez qo'shish:", { defaultValue: "Tez qo'shish:" })}{' '}
              {t(HAFTA_KUNI_LABEL[tezQoshish.haftaKuni], {
                defaultValue: HAFTA_KUNI_LABEL[tezQoshish.haftaKuni],
              })}{' '}
              /{' '}
              {vaqtOraliqlari.find((vaqt) => vaqt.id === tezQoshish.vaqtOraliqId)?.boshlanishVaqti}
            </p>
            <form onSubmit={handleTezQoshishSubmit} className="mt-2 grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  {t('Fan', { defaultValue: 'Fan' })}
                </label>
                <Select value={tezTanlanganFanId} onChange={(event) => setTezQoshishFanId(event.target.value)}>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  {t("O'qituvchi", { defaultValue: "O'qituvchi" })}
                </label>
                <Select
                  value={tanlanganTezOqituvchiId}
                  onChange={(event) => setTezQoshishOqituvchiId(event.target.value)}
                >
                  {tezFanBoyichaOqituvchilar.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              {!tezFanBoyichaOqituvchilar.length && (
                <p className="text-xs text-rose-600">
                  {t("Tanlangan fan uchun o'qituvchi topilmadi.", {
                    defaultValue: "Tanlangan fan uchun o'qituvchi topilmadi.",
                  })}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="submit" variant="indigo" disabled={!tezFanBoyichaOqituvchilar.length}>
                  {t('Saqlash', { defaultValue: 'Saqlash' })}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTezQoshish(null);
                    setTezQoshishJoylashuv(null);
                  }}
                  variant="secondary"
                >
                  {t('Bekor', { defaultValue: 'Bekor' })}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      <Modal
        open={Boolean(jadvalXatolik)}
        onClose={() => setJadvalXatolik(null)}
        maxWidth="max-w-md"
        title={jadvalXatolik?.title || t('Jadval xatosi', { defaultValue: 'Jadval xatosi' })}
        subtitle={jadvalXatolik?.message || ''}
      >
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setJadvalXatolik(null)}>
            {t('Tushunarli', { defaultValue: 'Tushunarli' })}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
