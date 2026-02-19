import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

function sumFormat(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value || 0));
}

export default function StudentHomePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest({ path: '/api/student/profil' });
        if (!mounted) return;
        setProfile(data.profile || null);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const debt = profile?.moliya;
  const hasDebt = debt?.holat === 'QARZDOR' && Number(debt?.qarzOylarSoni || 0) > 0;
  const debtTitle = hasDebt ? "Qarzdorlik ogohlantirishi" : "To'lov holati";
  const debtText = hasDebt
    ? debt?.message || `${debt?.qarzOylarFormatted?.join(', ') || ''} oylar uchun qarzdorligingiz mavjud.`
    : "Sizda qarzdorlik yo'q. Barcha oylar to'langan.";

  return (
    <Card title="Student panel" subtitle="Bu bo'limda student o'z jadvali va davomat ma'lumotlarini ko'radi.">
      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}
      {!loading && !error && (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            hasDebt
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <p className="font-semibold">{debtTitle}</p>
          <p>{debtText}</p>
          {hasDebt && (
            <p className="mt-1 text-xs">
              Qarz oylar soni: <b>{debt?.qarzOylarSoni}</b> | Jami qarz: <b>{sumFormat(debt?.jamiQarzSumma)} so'm</b>
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="indigo" onClick={() => navigate('/student/jadval')}>
          Mening jadvalim
        </Button>
        <Button variant="secondary" onClick={() => navigate('/student/davomat')}>
          Mening davomatim
        </Button>
        <Button variant="secondary" onClick={() => navigate('/student/baholar')}>
          Mening baholarim
        </Button>
      </div>
    </Card>
  );
}
