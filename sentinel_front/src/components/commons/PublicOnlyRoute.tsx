import { Navigate } from "react-router-dom";

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

/**
 * Redirects to /dashboard if an accessToken is already present.
 * Prevents logged-in users from seeing the login/register page.
 */
export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const token = localStorage.getItem("accessToken");

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
