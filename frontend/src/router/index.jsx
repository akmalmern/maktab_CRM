import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';
import AdminClassroomsPage from '../pages/AdminClassroomsPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminSchedulePage from '../pages/AdminSchedulePage';
import AdminStudentsPage from '../pages/AdminStudentsPage';
import AdminSubjectsPage from '../pages/AdminSubjectsPage';
import AdminTeachersPage from '../pages/AdminTeachersPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import PersonDetailPage from '../pages/PersonDetailPage';
import RoleHomePage from '../pages/RoleHomePage';
import StudentHomePage from '../pages/StudentHomePage';
import TeacherHomePage from '../pages/TeacherHomePage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <RoleHomePage /> },

          {
            element: <RoleRoute roles={['ADMIN']} />,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/teachers', element: <AdminTeachersPage /> },
              { path: '/admin/fanlar', element: <AdminSubjectsPage /> },
              { path: '/admin/students', element: <AdminStudentsPage /> },
              { path: '/admin/sinflar', element: <AdminClassroomsPage /> },
              { path: '/admin/dars-jadval', element: <AdminSchedulePage /> },
              { path: '/admin/teachers/:teacherId', element: <PersonDetailPage /> },
              { path: '/admin/students/:studentId', element: <PersonDetailPage /> },
            ],
          },

          {
            element: <RoleRoute roles={['TEACHER']} />,
            children: [
              { path: '/teacher', element: <TeacherHomePage /> },
              { path: '/teacher/jadval', element: <TeacherHomePage /> },
            ],
          },

          {
            element: <RoleRoute roles={['STUDENT']} />,
            children: [
              { path: '/student', element: <StudentHomePage /> },
              { path: '/student/jadval', element: <StudentHomePage /> },
            ],
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
