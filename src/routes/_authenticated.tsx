import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: () => (
    <AuthProvider>
      <Guarded />
    </AuthProvider>
  ),
});

function Guarded() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", replace: true });
  }, [loading, user, nav]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Carregando…</div>;
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
      <CommandPalette />
    </div>
  );
}
