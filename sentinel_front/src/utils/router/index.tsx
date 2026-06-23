import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppContent } from "../../App";
import PageSkeleton from "../../ui/components/PageSkeleton";

// ===== LAZY-LOADED PAGES =====
// Each page is loaded only when the user navigates to its route
const HomePage = lazy(() => import("../../ui/pages/HomePage"));
const AuthPage = lazy(() => import("../../ui/pages/AuthPage"));
const Dashboard = lazy(() => import("../../ui/pages/Dashboard"));
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

/** Wraps a lazy component in Suspense with a skeleton fallback */
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppContent />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <LazyPage><HomePage /></LazyPage> },
      { path: "auth", element: <LazyPage><AuthPage /></LazyPage> },

      // ====== PRIVATE PAGES ======
      { path: "dashboard", element: <LazyPage><Dashboard /></LazyPage> },
      { path: "scans", element: <LazyPage><ScansPage /></LazyPage> },
      { path: "scans/:scanId", element: <LazyPage><ScanDetailPage /></LazyPage> },
      { path: "projects", element: <LazyPage><ProjectPanel /></LazyPage> },
      { path: "workspaces", element: <LazyPage><WorkspacesPage /></LazyPage> },
      { path: "workspaces/:id", element: <LazyPage><WorkspaceDetailsPage /></LazyPage> },
      { path: "projects/:projectId", element: <LazyPage><ProjectDetailPage /></LazyPage> },
      { path: "findings", element: <LazyPage><FindingsPage /></LazyPage> },
      { path: "billing", element: <LazyPage><BillingPage /></LazyPage> },
      { path: "billing/mock-checkout", element: <LazyPage><MockCheckoutPage /></LazyPage> },
      { path: "settings", element: <LazyPage><SettingsPage /></LazyPage> },

      // Catch-all 404
      { path: "*", element: <LazyPage><NotFoundPage /></LazyPage> },
    ],
  },
]);
