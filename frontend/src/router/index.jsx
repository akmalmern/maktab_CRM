import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { StateView } from '../components/ui';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';
const AdminClassroomsPage = lazy(() => import('../pages/admin/classrooms/AdminClassroomsPage'));
const AdminAttendancePage = lazy(() => import('../pages/admin/attendance/AdminAttendancePage'));
const AdminArchivePage = lazy(() => import('../pages/admin/archive/AdminArchivePage'));
const AdminDashboardPage = lazy(() => import('../pages/admin/dashboard/AdminDashboardPage'));
const AdminFinancePage = lazy(() => import('../pages/admin/finance/AdminFinancePage'));
const AdminPayrollPage = lazy(() => import('../pages/admin/payroll/AdminPayrollPage'));
const AdminSchedulePage = lazy(() => import('../pages/admin/schedule/AdminSchedulePage'));
const AdminStudentsPage = lazy(() => import('../pages/admin/students/AdminStudentsPage'));
const AdminSubjectsPage = lazy(() => import('../pages/admin/subjects/AdminSubjectsPage'));
const AdminTeachersPage = lazy(() => import('../pages/admin/teachers/AdminTeachersPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/settings/AdminSettingsPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const PersonDetailPage = lazy(() => import('../pages/admin/person/PersonDetailPage'));
const RoleHomePage = lazy(() => import('../pages/RoleHomePage'));
const StudentHomePage = lazy(() => import('../pages/student/StudentHomePage'));
const StudentAttendancePage = lazy(() => import('../pages/student/StudentAttendancePage'));
const StudentGradesPage = lazy(() => import('../pages/student/StudentGradesPage'));
const StudentSchedulePage = lazy(() => import('../pages/student/StudentSchedulePage'));
const StudentSettingsPage = lazy(() => import('../pages/student/StudentSettingsPage'));
const TeacherAttendancePage = lazy(() => import('../pages/teacher/TeacherAttendancePage'));
const TeacherGradesPage = lazy(() => import('../pages/teacher/TeacherGradesPage'));
const TeacherHomePage = lazy(() => import('../pages/teacher/TeacherHomePage'));
const TeacherPayrollPage = lazy(() => import('../pages/teacher/TeacherPayrollPage'));
const TeacherSchedulePage = lazy(() => import('../pages/teacher/TeacherSchedulePage'));
const TeacherSettingsPage = lazy(() => import('../pages/teacher/TeacherSettingsPage'));
const ManagerHomePage = lazy(() => import('../pages/manager/ManagerHomePage'));
const ManagerDebtorsPage = lazy(() => import('../pages/manager/ManagerDebtorsPage'));
const ManagerPayrollPage = lazy(() => import('../pages/manager/ManagerPayrollPage'));
const ManagerSettingsPage = lazy(() => import('../pages/manager/ManagerSettingsPage'));

function withRouteFallback(element) {
  return (
    <Suspense
      fallback={(
        <div className="p-6">
          <StateView type="loading" />
        </div>
      )}
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withRouteFallback(<LoginPage />),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: withRouteFallback(<RoleHomePage />) },

          {
            element: <RoleRoute roles={['ADMIN']} />,
            children: [
              { path: '/admin', element: withRouteFallback(<AdminDashboardPage />) },
              { path: '/admin/teachers', element: withRouteFallback(<AdminTeachersPage />) },
              { path: '/admin/fanlar', element: withRouteFallback(<AdminSubjectsPage />) },
              { path: '/admin/students', element: withRouteFallback(<AdminStudentsPage />) },
              { path: '/admin/sinflar', element: withRouteFallback(<AdminClassroomsPage />) },
              { path: '/admin/dars-jadval', element: withRouteFallback(<AdminSchedulePage />) },
              { path: '/admin/davomat', element: withRouteFallback(<AdminAttendancePage />) },
              { path: '/admin/moliya', element: withRouteFallback(<AdminFinancePage />) },
              { path: '/admin/oylik', element: withRouteFallback(<AdminPayrollPage />) },
              { path: '/admin/arxiv', element: withRouteFallback(<AdminArchivePage />) },
              { path: '/admin/sozlamalar', element: withRouteFallback(<AdminSettingsPage />) },
              { path: '/admin/teachers/:teacherId', element: withRouteFallback(<PersonDetailPage />) },
              { path: '/admin/students/:studentId', element: withRouteFallback(<PersonDetailPage />) },
            ],
          },

          {
            element: <RoleRoute roles={['TEACHER']} />,
            children: [
              { path: '/teacher', element: withRouteFallback(<TeacherHomePage />) },
              { path: '/teacher/jadval', element: withRouteFallback(<TeacherSchedulePage />) },
              { path: '/teacher/davomat', element: withRouteFallback(<TeacherAttendancePage />) },
              { path: '/teacher/baholar', element: withRouteFallback(<TeacherGradesPage />) },
              { path: '/teacher/oyliklar', element: withRouteFallback(<TeacherPayrollPage />) },
              { path: '/teacher/sozlamalar', element: withRouteFallback(<TeacherSettingsPage />) },
            ],
          },

          {
            element: <RoleRoute roles={['STUDENT']} />,
            children: [
              { path: '/student', element: withRouteFallback(<StudentHomePage />) },
              { path: '/student/jadval', element: withRouteFallback(<StudentSchedulePage />) },
              { path: '/student/davomat', element: withRouteFallback(<StudentAttendancePage />) },
              { path: '/student/baholar', element: withRouteFallback(<StudentGradesPage />) },
              { path: '/student/sozlamalar', element: withRouteFallback(<StudentSettingsPage />) },
            ],
          },

          {
            element: <RoleRoute roles={['MANAGER']} />,
            children: [
              { path: '/manager', element: withRouteFallback(<ManagerHomePage />) },
              { path: '/manager/qarzdorlar', element: withRouteFallback(<ManagerDebtorsPage />) },
              { path: '/manager/oylik', element: withRouteFallback(<ManagerPayrollPage />) },
              { path: '/manager/sozlamalar', element: withRouteFallback(<ManagerSettingsPage />) },
            ],
          },

          { path: '*', element: withRouteFallback(<NotFoundPage />) },
        ],
      },
    ],
  },
]);
