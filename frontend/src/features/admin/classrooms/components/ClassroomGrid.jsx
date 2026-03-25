import { Badge, Button } from '../../../../components/ui';

export default function ClassroomGrid({ t, classrooms, onOpenClassroom }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {classrooms.map((classroom) => (
        <div
          key={classroom.id}
          className="group rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/60 transition hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">
                {classroom.name}
              </p>
              <p className="text-sm text-slate-500">{classroom.academicYear}</p>
            </div>
            <Badge variant="info">
              {t("{{count}} ta o'quvchi", { count: classroom.studentCount || 0 })}
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">{t('Boshqaruv')}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenClassroom(classroom.id)}
            >
              {t("Ko'rish")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
