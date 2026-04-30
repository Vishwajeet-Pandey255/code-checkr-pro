import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role === "faculty") return <Navigate to="/my-scripts" />;
  if (user.role === "student") return <Navigate to="/results" />;
  return <Navigate to="/dashboard" />;
}
