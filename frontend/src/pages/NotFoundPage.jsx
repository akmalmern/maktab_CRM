import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="p-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{t('Sahifa topilmadi')}</h1>
      <div className="mt-4">
        <Button onClick={() => navigate('/')}>
          {t('Dashboardga qaytish')}
        </Button>
      </div>
    </Card>
  );
}
