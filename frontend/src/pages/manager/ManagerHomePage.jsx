import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';

export default function ManagerHomePage() {
  const navigate = useNavigate();

  return (
    <Card
      title="Menejer paneli"
      subtitle="Bu bo'limda faqat qarzdor o'quvchilar bilan ishlaysiz va ota-ona bilan aloqa izohlarini kiritasiz."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="indigo" onClick={() => navigate('/manager/qarzdorlar')}>
          Qarzdorlar ro'yxati
        </Button>
      </div>
    </Card>
  );
}
