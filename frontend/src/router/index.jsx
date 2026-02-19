import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';
import AdminClassroomsPage from '../pages/admin/classrooms/AdminClassroomsPage';
import AdminAttendancePage from '../pages/admin/attendance/AdminAttendancePage';
import AdminDashboardPage from '../pages/admin/dashboard/AdminDashboardPage';
import AdminFinancePage from '../pages/admin/finance/AdminFinancePage';
import AdminSchedulePage from '../pages/admin/schedule/AdminSchedulePage';
import AdminStudentsPage from '../pages/admin/students/AdminStudentsPage';
import AdminSubjectsPage from '../pages/admin/subjects/AdminSubjectsPage';
import AdminTeachersPage from '../pages/admin/teachers/AdminTeachersPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import PersonDetailPage from '../pages/admin/person/PersonDetailPage';
import RoleHomePage from '../pages/RoleHomePage';
import StudentHomePage from '../pages/student/StudentHomePage';
import StudentAttendancePage from '../pages/student/StudentAttendancePage';
import StudentGradesPage from '../pages/student/StudentGradesPage';
import StudentSchedulePage from '../pages/student/StudentSchedulePage';
import TeacherAttendancePage from '../pages/teacher/TeacherAttendancePage';
import TeacherGradesPage from '../pages/teacher/TeacherGradesPage';
import TeacherHomePage from '../pages/teacher/TeacherHomePage';
import TeacherSchedulePage from '../pages/teacher/TeacherSchedulePage';
import ManagerHomePage from '../pages/manager/ManagerHomePage';
import ManagerDebtorsPage from '../pages/manager/ManagerDebtorsPage';

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
              { path: '/admin/davomat', element: <AdminAttendancePage /> },
              { path: '/admin/moliya', element: <AdminFinancePage /> },
              { path: '/admin/teachers/:teacherId', element: <PersonDetailPage /> },
              { path: '/admin/students/:studentId', element: <PersonDetailPage /> },
            ],
          },

          {
            element: <RoleRoute roles={['TEACHER']} />,
            children: [
              { path: '/teacher', element: <TeacherHomePage /> },
              { path: '/teacher/jadval', element: <TeacherSchedulePage /> },
              { path: '/teacher/davomat', element: <TeacherAttendancePage /> },
              { path: '/teacher/baholar', element: <TeacherGradesPage /> },
            ],
          },

          {
            element: <RoleRoute roles={['STUDENT']} />,
            children: [
              { path: '/student', element: <StudentHomePage /> },
              { path: '/student/jadval', element: <StudentSchedulePage /> },
              { path: '/student/davomat', element: <StudentAttendancePage /> },
              { path: '/student/baholar', element: <StudentGradesPage /> },
            ],
          },

          {
            element: <RoleRoute roles={['MANAGER']} />,
            children: [
              { path: '/manager', element: <ManagerHomePage /> },
              { path: '/manager/qarzdorlar', element: <ManagerDebtorsPage /> },
            ],
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
