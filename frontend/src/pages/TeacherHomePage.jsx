import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';

export default function TeacherHomePage() {
  const navigate = useNavigate();

  return (
    <Card title="Teacher panel" subtitle="Bu bo'limda o'qituvchi o'z dars jadvali va studentlar ro'yxatini ko'radi.">
      <Button variant="indigo" onClick={() => navigate('/teacher/jadval')}>
        Mening dars jadvalim
      </Button>
    </Card>
  );
}
