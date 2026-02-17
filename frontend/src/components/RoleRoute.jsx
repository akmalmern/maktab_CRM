import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

export default function RoleRoute({ roles = [] }) {
  const { role } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!roles.includes(role)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
