import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppContent } from "../../App";
import PageSkeleton from "../../ui/components/PageSkeleton";
import ErrorBoundary from "../../components/commons/ErrorBoundary";
import ProtectedRoute from "../../components/commons/ProtectedRoute";
import PublicOnlyRoute from "../../components/commons/PublicOnlyRoute";

// ===== LAZY-LOADED PAGES =====
// Each page is loaded only when the user navigates to its route
const HomePage = lazy(() => import("../../ui/pages/HomePage"));
const AuthPage = lazy(() => import("../../ui/pages/AuthPage"));
const Dashboard = lazy(() => import("../../ui/pages/dashboard/DashboardContainer"));
const ScansPage = lazy(() => import("../../ui/pages/ScanPanel"));
const WorkspacesPage = lazy(() => import("../../ui/pages/WorkspacesPage"));
const WorkspaceDetailsPage = lazy(() => import("../../ui/pages/WorkspaceDetailsPage"));
const ProjectDetailPage = lazy(() =>
  import("../../ui/pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage }))
);
const ProjectPanel = lazy(() => import("../../ui/pages/ProjectPanel"));
const FindingsPage = lazy(() => import("../../ui/pages/FindingPanel"));
const SettingsPage = lazy(() => import("../../ui/pages/SettingsPage"));
const BillingPage = lazy(() => import("../../ui/pages/BillingPage"));
const MockCheckoutPage = lazy(() => import("../../ui/pages/MockCheckoutPage"));
const ScanDetailPage = lazy(() => import("../../ui/pages/ScanDetailPage"));
const NotFoundPage = lazy(() => import("../../ui/pages/NotFoundPage"));

/** Wraps a lazy component in Suspense + ErrorBoundary with a skeleton fallback */
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppContent />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <LazyPage><HomePage /></LazyPage> },
      { path: "auth", element: <PublicOnlyRoute><LazyPage><AuthPage /></LazyPage></PublicOnlyRoute> },

      // ====== PRIVATE PAGES ======
      { path: "dashboard", element: <ProtectedRoute><LazyPage><Dashboard /></LazyPage></ProtectedRoute> },
      { path: "scans", element: <ProtectedRoute><LazyPage><ScansPage /></LazyPage></ProtectedRoute> },
      { path: "scans/:scanId", element: <ProtectedRoute><LazyPage><ScanDetailPage /></LazyPage></ProtectedRoute> },
      { path: "projects", element: <ProtectedRoute><LazyPage><ProjectPanel /></LazyPage></ProtectedRoute> },
      { path: "workspaces", element: <ProtectedRoute><LazyPage><WorkspacesPage /></LazyPage></ProtectedRoute> },
      { path: "workspaces/:id", element: <ProtectedRoute><LazyPage><WorkspaceDetailsPage /></LazyPage></ProtectedRoute> },
      { path: "projects/:projectId", element: <ProtectedRoute><LazyPage><ProjectDetailPage /></LazyPage></ProtectedRoute> },
      { path: "findings", element: <ProtectedRoute><LazyPage><FindingsPage /></LazyPage></ProtectedRoute> },
      { path: "billing", element: <ProtectedRoute><LazyPage><BillingPage /></LazyPage></ProtectedRoute> },
      { path: "billing/mock-checkout", element: <ProtectedRoute><LazyPage><MockCheckoutPage /></LazyPage></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute><LazyPage><SettingsPage /></LazyPage></ProtectedRoute> },

      // Catch-all 404
      { path: "*", element: <LazyPage><NotFoundPage /></LazyPage> },
    ],
  },
]);
