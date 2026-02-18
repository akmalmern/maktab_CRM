import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';

export default function StudentHomePage() {
  const navigate = useNavigate();

  return (
    <Card title="Student panel" subtitle="Bu bo'limda student o'z jadvali va davomat ma'lumotlarini ko'radi.">
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
