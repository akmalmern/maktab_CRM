import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

export default function RoleHomePage() {
  const role = useAppSelector((state) => state.auth.role);

  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'TEACHER') return <Navigate to="/teacher" replace />;
  if (role === 'STUDENT') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
}
