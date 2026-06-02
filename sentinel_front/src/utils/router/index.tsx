import { createBrowserRouter } from "react-router-dom";
import { AppContent } from "../../App";

import HomePage from "../../ui/pages/HomePage";
import AuthPage from "../../ui/pages/AuthPage";
import Dashboard from "../../ui/pages/Dashboard";
import ScansPage from "../../ui/pages/ScanPanel";
import WorkspacesPage from "../../ui/pages/WorkspacesPage";
import WorkspaceDetailsPage from "../../ui/pages/WorkspaceDetailsPage";
import { ProjectDetailPage } from "../../ui/pages/ProjectDetailPage";
import ProjectPanel from "../../ui/pages/ProjectPanel";
import FindingsPage from "../../ui/pages/FindingPanel";
import SettingsPage from "../../ui/pages/SettingsPage";
import BillingPage from "../../ui/pages/BillingPage";
import MockCheckoutPage from "../../ui/pages/MockCheckoutPage";
import ScanDetailPage from "../../ui/pages/ScanDetailPage";
import NotFoundPage from "../../ui/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppContent />, // Layout principal (Sidebar + Header + Outlet)
    errorElement: <NotFoundPage />, // Error boundary
    children: [
      { index: true, element: <HomePage /> },
      { path: "auth", element: <AuthPage /> },

      // ====== PRIVATE PAGES ======
      { path: "dashboard", element: <Dashboard /> },
      { path: "scans", element: <ScansPage /> },
      { path: "scans/:scanId", element: <ScanDetailPage /> },
      { path: "projects", element: <ProjectPanel /> },
      { path: "workspaces", element: <WorkspacesPage /> },
      { path: "workspaces/:id", element: <WorkspaceDetailsPage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      { path: "findings", element: <FindingsPage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "billing/mock-checkout", element: <MockCheckoutPage /> },
      { path: "settings", element: <SettingsPage /> },

      // Catch-all 404
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
