import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const StudentManagementPage = lazy(() => import('./features/students/StudentManagementPage'));
const StudentDetailPage = lazy(() => import('./features/students/StudentDetailPage'));
const StudentCreatePage = lazy(() => import('./features/students/StudentCreatePage'));
const StudentEditPage = lazy(() => import('./features/students/StudentEditPage'));
const TeacherManagementPage = lazy(() => import('./features/teachers/TeacherManagementPage'));
const TeacherDetailPage = lazy(() => import('./features/teachers/TeacherDetailPage'));
const TeacherCreatePage = lazy(() => import('./features/teachers/TeacherCreatePage'));
const TeacherEditPage = lazy(() => import('./features/teachers/TeacherEditPage'));
const ClassManagementPage = lazy(() => import('./features/classes/ClassManagementPage'));
const ClassDetailPage = lazy(() => import('./features/classes/ClassDetailPage'));
const SubjectManagementPage = lazy(() => import('./features/subjects/SubjectManagementPage'));
const SchedulePage = lazy(() => import('./features/schedules/SchedulePage'));
const GradeManagementPage = lazy(() => import('./features/grades/GradeManagementPage'));
const AttendancePage = lazy(() => import('./features/attendance/AttendancePage'));
const NotificationPage = lazy(() => import('./features/notifications/NotificationPage'));
const PaymentPage = lazy(() => import('./features/payments/PaymentPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const AuditLogPage = lazy(() => import('./features/audit/AuditLogPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const AiAdvisorPage = lazy(() => import('./features/ai-advisor/AiAdvisorPage'));
const NotFoundPage = lazy(() => import('./features/NotFoundPage'));
const ParentManagementPage = lazy(() => import('./features/parents/ParentManagementPage'));

const PageLoader = () => <div className="min-h-screen grid place-items-center text-sm text-[#6E6E73]">Đang tải trang...</div>;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; roles: string[] }> = ({ children, roles }) => {
  const user = useAuthStore((state) => state.user);
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-2xl font-semibold text-[#1D1D1F] mb-2">403 - Không có quyền truy cập</h1>
        <p className="text-[#6E6E73] mb-6">Bạn không có quyền truy cập trang này.</p>
        <a href="/dashboard" className="text-[#0071E3] font-semibold hover:underline">Về Dashboard</a>
      </div>
    );
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'students',
        element: <RoleRoute roles={['admin', 'teacher']}><StudentManagementPage /></RoleRoute>,
      },
      {
        path: 'students/create',
        element: <RoleRoute roles={['admin']}><StudentCreatePage /></RoleRoute>,
      },
      {
        path: 'students/:id',
        element: <StudentDetailPage />,
      },
      {
        path: 'students/:id/edit',
        element: <RoleRoute roles={['admin']}><StudentEditPage /></RoleRoute>,
      },
      {
        path: 'teachers',
        element: <RoleRoute roles={['admin']}><TeacherManagementPage /></RoleRoute>,
      },
      {
        path: 'teachers/create',
        element: <RoleRoute roles={['admin']}><TeacherCreatePage /></RoleRoute>,
      },
      {
        path: 'teachers/:id',
        element: <RoleRoute roles={['admin']}><TeacherDetailPage /></RoleRoute>,
      },
      {
        path: 'teachers/:id/edit',
        element: <RoleRoute roles={['admin']}><TeacherEditPage /></RoleRoute>,
      },
      {
        path: 'classes',
        element: <RoleRoute roles={['admin', 'teacher']}><ClassManagementPage /></RoleRoute>,
      },
      {
        path: 'classes/:id',
        element: <RoleRoute roles={['admin', 'teacher']}><ClassDetailPage /></RoleRoute>,
      },
      {
        path: 'subjects',
        element: <RoleRoute roles={['admin', 'teacher']}><SubjectManagementPage /></RoleRoute>,
      },
      {
        path: 'schedules',
        element: <SchedulePage />,
      },
      {
        path: 'grades',
        element: <GradeManagementPage />,
      },
      {
        path: 'attendance',
        element: <RoleRoute roles={['admin', 'teacher']}><AttendancePage /></RoleRoute>,
      },
      {
        path: 'notifications',
        element: <NotificationPage />,
      },
      {
        path: 'payments',
        element: <RoleRoute roles={['admin', 'student', 'parent']}><PaymentPage /></RoleRoute>,
      },
      {
        path: 'reports',
        element: <RoleRoute roles={['admin']}><ReportsPage /></RoleRoute>,
      },
      {
        path: 'audit',
        element: <RoleRoute roles={['admin']}><AuditLogPage /></RoleRoute>,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'parents',
        element: <RoleRoute roles={['admin']}><ParentManagementPage /></RoleRoute>,
      },
      {
        path: 'si-advisor',
        element: <AiAdvisorPage />,
      },
      {
        path: 'ai-advisor',
        element: <Navigate to="/si-advisor" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

const AppRouter: React.FC = () => {
  return <Suspense fallback={<PageLoader />}><RouterProvider router={router} /></Suspense>;
};

export default AppRouter;
