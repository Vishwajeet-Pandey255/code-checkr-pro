import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  // 🔥 FORCE ADMIN FOR YOUR EMAIL (IMPORTANT)
  if (user.email === "pandeyvishwajeet61@gmail.com") {
    return <Navigate to="/dashboard" replace />;
  }

  // Normal role-based routing
  if (user.role === "admin") return <Navigate to="/dashboard" replace />;
  if (user.role === "faculty") return <Navigate to="/my-scripts" replace />;
  if (user.role === "student") return <Navigate to="/results" replace />;

  return <Navigate to="/dashboard" replace />;
}