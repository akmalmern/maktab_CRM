import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';

export default function StudentHomePage() {
  const navigate = useNavigate();

  return (
    <Card title="Student panel" subtitle="Bu bo'limda student o'z jadvali va profili ma'lumotlarini ko'radi.">
      <Button variant="indigo" onClick={() => navigate('/student/jadval')}>
        Mening jadvalim
      </Button>
    </Card>
  );
}
